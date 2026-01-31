"""
Security Service

Manages security event logging and retrieval:
- SQLite database for persistent event storage
- IP geolocation with caching via ip-api.com
- Event filtering, pagination, and export
- 90-day automatic retention cleanup
"""

import csv
import io
import ipaddress
import json
import logging
import sqlite3
import threading
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Optional

from core import config

logger = logging.getLogger(__name__)

# Database schema
SECURITY_DB_SCHEMA = """
CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    success INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    ip_address TEXT,
    country TEXT,
    city TEXT,
    details TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_security_events_timestamp
    ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type
    ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_success
    ON security_events(success);

CREATE TABLE IF NOT EXISTS ip_geolocation_cache (
    ip_address TEXT PRIMARY KEY,
    country TEXT,
    city TEXT,
    cached_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS security_preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ip_lockouts (
    ip_address TEXT PRIMARY KEY,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    last_attempt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ip_lockouts_locked_until
    ON ip_lockouts(locked_until);
"""

# Lockout configuration
LOCKOUT_THRESHOLD = 10  # Failed attempts before lockout
LOCKOUT_DURATION_MINUTES = 15  # How long to lock out an IP


@dataclass
class SecurityEvent:
    """Represents a security event."""

    id: int
    event_type: str
    success: bool
    timestamp: str
    ip_address: str | None = None
    country: str | None = None
    city: str | None = None
    details: str | None = None
    user_agent: str | None = None


@dataclass
class SecurityEventSummary:
    """Summary statistics for security events."""

    total_events: int
    successful_logins: int
    failed_logins: int
    failed_unlock_attempts: int
    logouts: int
    session_timeouts: int
    unique_ips: int
    last_successful_login: str | None = None
    last_failed_login: str | None = None


class SecurityService:
    """Manages security event logging and retrieval."""

    _instance: Optional["SecurityService"] = None
    _lock = threading.Lock()
    _initialized: bool = False

    def __new__(cls) -> "SecurityService":
        """Singleton pattern to ensure single database connection."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self._initialized = True
        self._db_path = config.SECURITY_DB_FILE
        self._conn: sqlite3.Connection | None = None
        self._init_database()
        self._cleanup_old_events()

    def _get_connection(self) -> sqlite3.Connection:
        """Get or create database connection."""
        if self._conn is None:
            self._conn = sqlite3.connect(str(self._db_path), check_same_thread=False)
            self._conn.row_factory = sqlite3.Row
        return self._conn

    def _init_database(self) -> None:
        """Initialize database schema."""
        try:
            conn = self._get_connection()
            conn.executescript(SECURITY_DB_SCHEMA)
            conn.commit()
            logger.info("Security database initialized at %s", self._db_path)
        except Exception as e:
            logger.error("Failed to initialize security database: %s", e)

    def _cleanup_old_events(self) -> None:
        """Delete events older than retention period."""
        try:
            cutoff = datetime.now(UTC) - timedelta(days=config.SECURITY_EVENT_RETENTION_DAYS)
            cutoff_str = cutoff.isoformat()
            conn = self._get_connection()
            cursor = conn.execute("DELETE FROM security_events WHERE timestamp < ?", (cutoff_str,))
            deleted = cursor.rowcount
            conn.commit()
            if deleted > 0:
                logger.info("Cleaned up %d old security events", deleted)
        except Exception as e:
            logger.error("Failed to cleanup old security events: %s", e)

    def log_event(
        self,
        event_type: str,
        success: bool,
        ip_address: str | None = None,
        details: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        """
        Log a security event to the database.

        Args:
            event_type: Type of event (LOGIN_ATTEMPT, LOGOUT, etc.)
            success: Whether the event was successful
            ip_address: Client IP address
            details: Additional details (sanitized, no sensitive data)
            user_agent: Client user agent string
        """
        try:
            timestamp = datetime.now(UTC).isoformat()
            country, city = self._get_geolocation(ip_address) if ip_address else (None, None)

            conn = self._get_connection()
            conn.execute(
                """
                INSERT INTO security_events
                (event_type, success, timestamp, ip_address, country, city, details, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_type,
                    1 if success else 0,
                    timestamp,
                    ip_address,
                    country,
                    city,
                    details[:500] if details else None,
                    user_agent[:256] if user_agent else None,
                ),
            )
            conn.commit()

            # Update last login timestamp if this is a successful login or remote unlock
            if event_type in ("LOGIN_ATTEMPT", "REMOTE_UNLOCK") and success:
                self._set_preference("last_login_timestamp", timestamp)

        except Exception as e:
            logger.error("Failed to log security event: %s", e)

    def get_events(
        self,
        limit: int = 50,
        offset: int = 0,
        event_types: list[str] | None = None,
        success: bool | None = None,
    ) -> tuple[list[SecurityEvent], int]:
        """
        Retrieve security events with optional filtering.

        Args:
            limit: Maximum number of events to return
            offset: Number of events to skip
            event_types: Filter by event types (list of event type strings)
            success: Filter by success/failure

        Returns:
            Tuple of (list of SecurityEvent objects, total count matching filters)
        """
        try:
            conn = self._get_connection()

            # Build WHERE clause for both queries
            where_clause = "WHERE 1=1"
            params: list = []

            if event_types:
                placeholders = ",".join("?" for _ in event_types)
                where_clause += f" AND event_type IN ({placeholders})"
                params.extend(event_types)
            if success is not None:
                where_clause += " AND success = ?"
                params.append(1 if success else 0)

            # Get total count with filters
            count_query = f"SELECT COUNT(*) FROM security_events {where_clause}"
            total = conn.execute(count_query, params).fetchone()[0]

            # Get paginated results
            query = f"SELECT * FROM security_events {where_clause} ORDER BY timestamp DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor = conn.execute(query, params)
            rows = cursor.fetchall()

            events = [
                SecurityEvent(
                    id=row["id"],
                    event_type=row["event_type"],
                    success=bool(row["success"]),
                    timestamp=row["timestamp"],
                    ip_address=row["ip_address"],
                    country=row["country"],
                    city=row["city"],
                    details=row["details"],
                    user_agent=row["user_agent"],
                )
                for row in rows
            ]
            return events, total
        except Exception as e:
            logger.error("Failed to get security events: %s", e)
            return [], 0

    def get_summary(self) -> SecurityEventSummary:
        """Get aggregate statistics for security events."""
        try:
            conn = self._get_connection()

            # Total events
            total = conn.execute("SELECT COUNT(*) FROM security_events").fetchone()[0]

            # Successful logins
            successful_logins = conn.execute(
                "SELECT COUNT(*) FROM security_events "
                "WHERE event_type = 'LOGIN_ATTEMPT' AND success = 1"
            ).fetchone()[0]

            # Failed logins
            failed_logins = conn.execute(
                "SELECT COUNT(*) FROM security_events "
                "WHERE event_type = 'LOGIN_ATTEMPT' AND success = 0"
            ).fetchone()[0]

            # Failed unlock attempts
            failed_unlocks = conn.execute(
                "SELECT COUNT(*) FROM security_events "
                "WHERE event_type IN ('UNLOCK_ATTEMPT', 'UNLOCK_AND_VALIDATE') "
                "AND success = 0"
            ).fetchone()[0]

            # Logouts
            logouts = conn.execute(
                "SELECT COUNT(*) FROM security_events WHERE event_type = 'LOGOUT'"
            ).fetchone()[0]

            # Session timeouts
            timeouts = conn.execute(
                "SELECT COUNT(*) FROM security_events WHERE event_type = 'SESSION_TIMEOUT'"
            ).fetchone()[0]

            # Unique IPs
            unique_ips = conn.execute(
                "SELECT COUNT(DISTINCT ip_address) FROM security_events "
                "WHERE ip_address IS NOT NULL"
            ).fetchone()[0]

            # Last successful login
            last_success = conn.execute(
                "SELECT timestamp FROM security_events "
                "WHERE event_type = 'LOGIN_ATTEMPT' AND success = 1 "
                "ORDER BY timestamp DESC LIMIT 1"
            ).fetchone()

            # Last failed login
            last_failed = conn.execute(
                "SELECT timestamp FROM security_events "
                "WHERE event_type = 'LOGIN_ATTEMPT' AND success = 0 "
                "ORDER BY timestamp DESC LIMIT 1"
            ).fetchone()

            return SecurityEventSummary(
                total_events=total,
                successful_logins=successful_logins,
                failed_logins=failed_logins,
                failed_unlock_attempts=failed_unlocks,
                logouts=logouts,
                session_timeouts=timeouts,
                unique_ips=unique_ips,
                last_successful_login=last_success[0] if last_success else None,
                last_failed_login=last_failed[0] if last_failed else None,
            )
        except Exception as e:
            logger.error("Failed to get security summary: %s", e)
            return SecurityEventSummary(
                total_events=0,
                successful_logins=0,
                failed_logins=0,
                failed_unlock_attempts=0,
                logouts=0,
                session_timeouts=0,
                unique_ips=0,
            )

    def get_failed_since_last_login(self) -> list[SecurityEvent]:
        """
        Get failed login/unlock attempts since the user's last successful login.

        Used to show security alerts after login.
        """
        try:
            last_login = self._get_preference("last_login_timestamp")
            dismissed_at = self._get_preference("alert_dismissed_at")

            conn = self._get_connection()
            query = """
                SELECT * FROM security_events
                WHERE event_type IN ('LOGIN_ATTEMPT', 'UNLOCK_ATTEMPT', 'UNLOCK_AND_VALIDATE', 'REMOTE_UNLOCK')
                AND success = 0
            """
            params: list = []

            # Use the later of last_login or dismissed_at as the cutoff
            cutoff = None
            if last_login and dismissed_at:
                cutoff = max(last_login, dismissed_at)
            elif dismissed_at:
                cutoff = dismissed_at
            elif last_login:
                cutoff = last_login

            if cutoff:
                query += " AND timestamp > ?"
                params.append(cutoff)

            query += " ORDER BY timestamp DESC LIMIT 10"

            cursor = conn.execute(query, params)
            rows = cursor.fetchall()

            return [
                SecurityEvent(
                    id=row["id"],
                    event_type=row["event_type"],
                    success=bool(row["success"]),
                    timestamp=row["timestamp"],
                    ip_address=row["ip_address"],
                    country=row["country"],
                    city=row["city"],
                    details=row["details"],
                    user_agent=row["user_agent"],
                )
                for row in rows
            ]
        except Exception as e:
            logger.error("Failed to get failed attempts since last login: %s", e)
            return []

    def dismiss_security_alert(self) -> None:
        """Mark security alerts as dismissed."""
        self._set_preference("alert_dismissed_at", datetime.now(UTC).isoformat())

    def clear_events(self) -> None:
        """Delete all security event logs."""
        try:
            conn = self._get_connection()
            conn.execute("DELETE FROM security_events")
            conn.commit()
            logger.info("Security events cleared")
        except Exception as e:
            logger.error("Failed to clear security events: %s", e)

    def _sanitize_csv_value(self, value: str | None) -> str:
        """
        Sanitize a value for CSV export to prevent XSS and CSV injection.

        - Escapes HTML entities to prevent XSS if CSV is viewed as HTML
        - Removes control characters that could cause issues
        - Prefixes with single quote if value starts with formula characters
        """
        import html

        if value is None:
            return ""
        # Convert to string and escape HTML entities
        safe_value = html.escape(str(value))
        # Remove control characters (CR, LF, Tab can cause issues in some CSV readers)
        safe_value = safe_value.replace("\r", " ").replace("\n", " ").replace("\t", " ")
        # Prevent CSV formula injection (values starting with =, +, -, @, |, %)
        if safe_value and safe_value[0] in "=+-@|%":
            safe_value = "'" + safe_value
        return safe_value

    def export_events_csv(self) -> str:
        """
        Export all security events as CSV.

        Returns:
            CSV string of all events with sanitized values
        """
        try:
            events, _ = self.get_events(limit=10000, offset=0)
            output = io.StringIO()
            writer = csv.writer(output)

            # Header row
            writer.writerow(
                [
                    "ID",
                    "Event Type",
                    "Success",
                    "Timestamp",
                    "IP Address",
                    "Country",
                    "City",
                    "Details",
                ]
            )

            # Data rows with sanitized values
            for event in events:
                writer.writerow(
                    [
                        event.id,
                        self._sanitize_csv_value(event.event_type),
                        "Yes" if event.success else "No",
                        self._sanitize_csv_value(event.timestamp),
                        self._sanitize_csv_value(event.ip_address),
                        self._sanitize_csv_value(event.country),
                        self._sanitize_csv_value(event.city),
                        self._sanitize_csv_value(event.details),
                    ]
                )

            return output.getvalue()
        except Exception as e:
            logger.error("Failed to export security events: %s", e)
            return ""

    def _get_geolocation(self, ip_address: str) -> tuple[str | None, str | None]:
        """
        Look up country/city for an IP address using ip-api.com.
        Results are cached to avoid repeated lookups.

        Args:
            ip_address: IP address to lookup

        Returns:
            Tuple of (country, city) or (None, None) on failure
        """
        # Validate IP address format to prevent SSRF
        if not ip_address:
            logger.debug("[Geolocation] No IP address provided")
            return None, None
        try:
            parsed_ip = ipaddress.ip_address(ip_address)
        except ValueError:
            logger.debug("[Geolocation] Invalid IP format: %s", ip_address)
            return None, None

        # Skip private/local/reserved IPs
        if parsed_ip.is_private or parsed_ip.is_loopback or parsed_ip.is_reserved:
            logger.debug(
                "[Geolocation] Skipping private/local/reserved IP: %s (private=%s, loopback=%s, reserved=%s)",
                ip_address,
                parsed_ip.is_private,
                parsed_ip.is_loopback,
                parsed_ip.is_reserved,
            )
            return None, None

        # Check cache first
        cached = self._get_cached_geolocation(ip_address)
        if cached:
            return cached

        # Fetch from ip-api.com (free tier: 45 requests/minute)
        try:
            # Use quote() to URL-encode the IP for SSRF prevention (CodeQL recognizes this)
            safe_ip = urllib.parse.quote(str(parsed_ip), safe="")
            url = f"http://ip-api.com/json/{safe_ip}?fields=status,country,city"
            req = urllib.request.Request(url, headers={"User-Agent": "Eclosion/1.0"})
            logger.debug("[Geolocation] Looking up IP: %s", ip_address)
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                logger.debug("[Geolocation] API response for %s: %s", ip_address, data)
                if data.get("status") == "success":
                    country = data.get("country")
                    city = data.get("city")
                    self._cache_geolocation(ip_address, country, city)
                    logger.debug("[Geolocation] Success: %s -> %s, %s", ip_address, city, country)
                    return country, city
                else:
                    logger.debug(
                        "[Geolocation] API returned non-success for %s: %s", ip_address, data
                    )
        except Exception as e:
            # Sanitize error message to prevent log injection using replace() chains
            sanitized_error = str(e).replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
            logger.warning("Geolocation lookup failed for %s: %s", parsed_ip, sanitized_error)

        return None, None

    def _get_cached_geolocation(self, ip_address: str) -> tuple[str | None, str | None] | None:
        """Get cached geolocation for an IP address."""
        try:
            conn = self._get_connection()
            cursor = conn.execute(
                "SELECT country, city, cached_at FROM ip_geolocation_cache WHERE ip_address = ?",
                (ip_address,),
            )
            row = cursor.fetchone()
            if row:
                # Check if cache is still valid (7 days)
                cached_at = datetime.fromisoformat(row["cached_at"])
                if datetime.now(UTC) - cached_at < timedelta(days=7):
                    return row["country"], row["city"]
        except Exception:
            pass
        return None

    def _cache_geolocation(self, ip_address: str, country: str | None, city: str | None) -> None:
        """Cache geolocation for an IP address."""
        try:
            conn = self._get_connection()
            conn.execute(
                """
                INSERT OR REPLACE INTO ip_geolocation_cache (ip_address, country, city, cached_at)
                VALUES (?, ?, ?, ?)
                """,
                (ip_address, country, city, datetime.now(UTC).isoformat()),
            )
            conn.commit()
        except Exception as e:
            logger.warning("Failed to cache geolocation: %s", e)

    def _get_preference(self, key: str) -> str | None:
        """Get a security preference value."""
        try:
            conn = self._get_connection()
            cursor = conn.execute("SELECT value FROM security_preferences WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row["value"] if row else None
        except Exception:
            return None

    def _set_preference(self, key: str, value: str) -> None:
        """Set a security preference value."""
        try:
            conn = self._get_connection()
            conn.execute(
                "INSERT OR REPLACE INTO security_preferences (key, value) VALUES (?, ?)",
                (key, value),
            )
            conn.commit()
        except Exception as e:
            logger.warning("Failed to set security preference: %s", e)

    # =========================================================================
    # IP Lockout Management (for remote access brute-force protection)
    # =========================================================================

    def is_ip_locked_out(self, ip_address: str | None) -> bool:
        """
        Check if an IP address is currently locked out.

        Returns True if the IP has exceeded the failure threshold and is still
        within the lockout period.
        """
        if not ip_address:
            return False

        try:
            conn = self._get_connection()
            cursor = conn.execute(
                "SELECT locked_until FROM ip_lockouts WHERE ip_address = ?",
                (ip_address,),
            )
            row = cursor.fetchone()
            if not row or not row["locked_until"]:
                return False

            locked_until = datetime.fromisoformat(row["locked_until"])
            if datetime.now(UTC) < locked_until:
                return True

            # Lockout expired, clear it
            self._clear_ip_lockout(ip_address)
            return False
        except Exception as e:
            logger.warning("Failed to check IP lockout: %s", e)
            return False

    def record_failed_remote_unlock(self, ip_address: str | None) -> bool:
        """
        Record a failed remote unlock attempt for an IP.

        Returns True if the IP is now locked out (threshold exceeded).
        """
        if not ip_address:
            return False

        try:
            conn = self._get_connection()
            now = datetime.now(UTC).isoformat()

            # Get current attempt count
            cursor = conn.execute(
                "SELECT failed_attempts FROM ip_lockouts WHERE ip_address = ?",
                (ip_address,),
            )
            row = cursor.fetchone()
            current_attempts = row["failed_attempts"] if row else 0
            new_attempts = current_attempts + 1

            # Check if we should lock out
            locked_until = None
            if new_attempts >= LOCKOUT_THRESHOLD:
                locked_until = (
                    datetime.now(UTC) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                ).isoformat()
                logger.warning(
                    "IP %s locked out until %s after %d failed attempts",
                    ip_address,
                    locked_until,
                    new_attempts,
                )

            # Upsert the lockout record
            conn.execute(
                """
                INSERT INTO ip_lockouts (ip_address, failed_attempts, locked_until, last_attempt)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(ip_address) DO UPDATE SET
                    failed_attempts = ?,
                    locked_until = ?,
                    last_attempt = ?
                """,
                (ip_address, new_attempts, locked_until, now, new_attempts, locked_until, now),
            )
            conn.commit()

            return new_attempts >= LOCKOUT_THRESHOLD
        except Exception as e:
            logger.warning("Failed to record failed unlock attempt: %s", e)
            return False

    def clear_ip_lockout(self, ip_address: str | None) -> None:
        """
        Clear lockout state for an IP address.

        Called on successful remote unlock to reset the failure counter.
        """
        if not ip_address:
            return
        self._clear_ip_lockout(ip_address)

    def _clear_ip_lockout(self, ip_address: str) -> None:
        """Internal method to clear lockout state."""
        try:
            conn = self._get_connection()
            conn.execute("DELETE FROM ip_lockouts WHERE ip_address = ?", (ip_address,))
            conn.commit()
        except Exception as e:
            logger.warning("Failed to clear IP lockout: %s", e)

    def get_lockout_remaining_seconds(self, ip_address: str | None) -> int:
        """
        Get the number of seconds remaining in a lockout.

        Returns 0 if not locked out.
        """
        if not ip_address:
            return 0

        try:
            conn = self._get_connection()
            cursor = conn.execute(
                "SELECT locked_until FROM ip_lockouts WHERE ip_address = ?",
                (ip_address,),
            )
            row = cursor.fetchone()
            if not row or not row["locked_until"]:
                return 0

            locked_until = datetime.fromisoformat(row["locked_until"])
            remaining = (locked_until - datetime.now(UTC)).total_seconds()
            return max(0, int(remaining))
        except Exception:
            return 0
