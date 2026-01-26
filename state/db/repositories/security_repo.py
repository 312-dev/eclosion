"""
Security events repository.
"""

import json
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from core import config
from state.db.models import GeolocationCache, SecurityEvent, SecurityPreference


class SecurityRepository:
    """Repository for security events and preferences."""

    def __init__(self, session: Session):
        self.session = session

    # === Security Events ===

    def log_event(
        self,
        event_type: str,
        success: bool,
        ip_address: str | None = None,
        country: str | None = None,
        city: str | None = None,
        details: dict | None = None,
        user_agent: str | None = None,
    ) -> SecurityEvent:
        """Log a security event."""
        event = SecurityEvent(
            event_type=event_type,
            success=success,
            timestamp=datetime.now(UTC),
            ip_address=ip_address,
            country=country,
            city=city,
            details=json.dumps(details) if details else None,
            user_agent=user_agent,
        )
        self.session.add(event)
        return event

    def get_recent_events(
        self,
        limit: int = 100,
        event_type: str | None = None,
        success: bool | None = None,
    ) -> list[SecurityEvent]:
        """Get recent security events."""
        query = self.session.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc())

        if event_type:
            query = query.filter(SecurityEvent.event_type == event_type)
        if success is not None:
            query = query.filter(SecurityEvent.success == success)

        return query.limit(limit).all()

    def get_events_since(self, since: datetime) -> list[SecurityEvent]:
        """Get all events since a given time."""
        return (
            self.session.query(SecurityEvent)
            .filter(SecurityEvent.timestamp >= since)
            .order_by(SecurityEvent.timestamp.desc())
            .all()
        )

    def count_recent_failures(self, event_type: str, minutes: int = 60) -> int:
        """Count failed events of a type in the last N minutes."""
        cutoff = datetime.now(UTC) - timedelta(minutes=minutes)
        return (
            self.session.query(SecurityEvent)
            .filter(
                SecurityEvent.event_type == event_type,
                SecurityEvent.success.is_(False),
                SecurityEvent.timestamp >= cutoff,
            )
            .count()
        )

    def cleanup_old_events(self, days: int | None = None) -> int:
        """Delete events older than retention period."""
        retention_days = days or config.SECURITY_EVENT_RETENTION_DAYS
        cutoff = datetime.now(UTC) - timedelta(days=retention_days)

        result = self.session.query(SecurityEvent).filter(SecurityEvent.timestamp < cutoff).delete()
        return result

    # === Geolocation Cache ===

    def get_cached_geolocation(self, ip_address: str) -> tuple[str | None, str | None] | None:
        """Get cached geolocation for an IP."""
        cache = (
            self.session.query(GeolocationCache)
            .filter(GeolocationCache.ip_address == ip_address)
            .first()
        )
        if cache:
            return cache.country, cache.city
        return None

    def cache_geolocation(self, ip_address: str, country: str | None, city: str | None) -> None:
        """Cache geolocation lookup result."""
        existing = (
            self.session.query(GeolocationCache)
            .filter(GeolocationCache.ip_address == ip_address)
            .first()
        )
        if existing:
            existing.country = country
            existing.city = city
            existing.cached_at = datetime.now(UTC)
        else:
            self.session.add(
                GeolocationCache(
                    ip_address=ip_address,
                    country=country,
                    city=city,
                    cached_at=datetime.now(UTC),
                )
            )

    def cleanup_old_cache(self, hours: int = 24) -> int:
        """Delete cache entries older than N hours."""
        cutoff = datetime.now(UTC) - timedelta(hours=hours)
        result = (
            self.session.query(GeolocationCache)
            .filter(GeolocationCache.cached_at < cutoff)
            .delete()
        )
        return result

    # === Security Preferences ===

    def get_preference(self, key: str) -> str | None:
        """Get a security preference."""
        pref = self.session.query(SecurityPreference).filter(SecurityPreference.key == key).first()
        return pref.value if pref else None

    def set_preference(self, key: str, value: str | None) -> None:
        """Set a security preference."""
        existing = (
            self.session.query(SecurityPreference).filter(SecurityPreference.key == key).first()
        )
        if existing:
            existing.value = value
        else:
            self.session.add(SecurityPreference(key=key, value=value))

    def delete_preference(self, key: str) -> bool:
        """Delete a security preference."""
        result = (
            self.session.query(SecurityPreference).filter(SecurityPreference.key == key).delete()
        )
        return result > 0

    # === Event Conversion ===

    def event_to_dict(self, event: SecurityEvent) -> dict:
        """Convert event to dict for API response."""
        return {
            "id": event.id,
            "event_type": event.event_type,
            "success": event.success,
            "timestamp": event.timestamp.isoformat() if event.timestamp else None,
            "ip_address": event.ip_address,
            "country": event.country,
            "city": event.city,
            "details": json.loads(event.details) if event.details else None,
            "user_agent": event.user_agent,
        }
