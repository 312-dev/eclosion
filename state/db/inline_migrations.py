"""
Inline Database Migrations

Version-based migration system for packaged desktop apps.
Runs on app startup when Alembic is not available (PyInstaller builds).

How to add a new migration:
1. Create Alembic migration for development: `alembic revision -m "description"`
2. Add equivalent inline migration to MIGRATIONS list below
3. Bump SCHEMA_VERSION

Migrations are idempotent - they only run if DB version < migration version.
"""

import logging
import sqlite3
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

# Current schema version - bump when adding migrations
SCHEMA_VERSION = 6


def column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    """Check if a column exists in a table."""
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns


def migrate_v3_frozen_target(conn: sqlite3.Connection) -> None:
    """
    Migration v3: Improved frozen target calculation with rollover tracking.

    Adds fields for tracking rollover amount and due date at freeze time.
    Clears existing frozen targets to force recalculation with new model.

    This is a Python function instead of raw SQL to handle the case where
    columns may already exist (SQLite doesn't support ADD COLUMN IF NOT EXISTS).
    """
    cursor = conn.cursor()

    # Add columns only if they don't exist
    if not column_exists(conn, "categories", "frozen_rollover_amount"):
        cursor.execute("ALTER TABLE categories ADD COLUMN frozen_rollover_amount FLOAT")

    if not column_exists(conn, "categories", "frozen_next_due_date"):
        cursor.execute("ALTER TABLE categories ADD COLUMN frozen_next_due_date VARCHAR(20)")

    # Clear all existing frozen targets to force recalculation
    # This fixes the rollup proportion bug and applies new balance model
    cursor.execute("""
        UPDATE categories SET
            frozen_monthly_target = NULL,
            target_month = NULL,
            balance_at_month_start = NULL,
            frozen_amount = NULL,
            frozen_frequency_months = NULL,
            frozen_rollover_amount = NULL,
            frozen_next_due_date = NULL
    """)

    conn.commit()


def migrate_v4_wishlist_subtract_spending(conn: sqlite3.Connection) -> None:
    """
    Migration v4: Add subtract_spending column to wishlist_items.

    This column controls how progress is calculated:
    - False (default): progress = rollover + budgeted (spending doesn't reduce progress)
    - True: progress = remaining (spending reduces progress)
    """
    if not column_exists(conn, "wishlist_items", "subtract_spending"):
        cursor = conn.cursor()
        cursor.execute(
            "ALTER TABLE wishlist_items ADD COLUMN subtract_spending BOOLEAN NOT NULL DEFAULT 0"
        )
        conn.commit()


def migrate_v5_wishlist_goal_type(conn: sqlite3.Connection) -> None:
    """
    Migration v5: Replace subtract_spending with goal_type enum.

    Goal types:
    - 'one_time': Save up to buy something, mark complete when done.
                  Progress = total ever budgeted (immune to spending).
    - 'savings_buffer': Ongoing fund that can be spent and refilled.
                        Progress = current remaining balance.

    Also adds:
    - completed_at: When a one-time purchase was marked as done
    - tracking_start_date: Custom start date for aggregate queries
    """
    cursor = conn.cursor()

    # Add goal_type column (default 'one_time')
    if not column_exists(conn, "wishlist_items", "goal_type"):
        cursor.execute(
            "ALTER TABLE wishlist_items ADD COLUMN goal_type VARCHAR(20) NOT NULL DEFAULT 'one_time'"
        )

    # Add completed_at column
    if not column_exists(conn, "wishlist_items", "completed_at"):
        cursor.execute("ALTER TABLE wishlist_items ADD COLUMN completed_at DATETIME")

    # Add tracking_start_date column
    if not column_exists(conn, "wishlist_items", "tracking_start_date"):
        cursor.execute("ALTER TABLE wishlist_items ADD COLUMN tracking_start_date DATE")

    # Migrate existing subtract_spending=true to goal_type='savings_buffer'
    if column_exists(conn, "wishlist_items", "subtract_spending"):
        cursor.execute(
            "UPDATE wishlist_items SET goal_type = 'savings_buffer' WHERE subtract_spending = 1"
        )

    conn.commit()

    # Note: We don't drop subtract_spending here because SQLite < 3.35 doesn't support DROP COLUMN.
    # The column will remain but be unused. The model simply won't map to it.


def migrate_v6_stash_sort_order(conn: sqlite3.Connection) -> None:
    """
    Migration v6: Add sort_order column for drag-to-reorder persistence.

    Adds sort_order to:
    - wishlist_items: For stash item reordering
    - monarch_goal_layout: For Monarch goal reordering
    """
    cursor = conn.cursor()

    # Add sort_order to wishlist_items
    if not column_exists(conn, "wishlist_items", "sort_order"):
        cursor.execute(
            "ALTER TABLE wishlist_items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"
        )

    # Add sort_order to monarch_goal_layout (if table exists)
    try:
        if not column_exists(conn, "monarch_goal_layout", "sort_order"):
            cursor.execute(
                "ALTER TABLE monarch_goal_layout ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"
            )
    except sqlite3.OperationalError:
        # Table may not exist if Monarch goals feature hasn't been used
        pass

    conn.commit()


# Migration definitions
# Each migration runs only if current DB version < migration version
# "sql" can be a string (executed as script) or a callable (called with conn)
MIGRATIONS = [
    # Version 1: Initial schema
    # Handled by SQLAlchemy create_all() - no SQL needed
    # Tables: notes, general_notes, archived_notes, known_categories, etc.
    {
        "version": 1,
        "description": "Initial schema (handled by create_all)",
        "sql": None,  # No SQL - create_all handles this
    },
    # Version 2: Checkbox states with JSON storage
    # Replaces old per-row checkbox storage with JSON array
    {
        "version": 2,
        "description": "Checkbox states with JSON storage",
        "sql": """
            -- Drop old checkbox_states table if it exists
            DROP TABLE IF EXISTS checkbox_states;

            -- Create new checkbox_states with JSON storage
            CREATE TABLE checkbox_states (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                note_id VARCHAR(36) REFERENCES notes(id) ON DELETE CASCADE,
                general_note_month_key VARCHAR(10),
                viewing_month VARCHAR(10) NOT NULL,
                states_json TEXT NOT NULL DEFAULT '[]',
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            );

            -- Create indexes
            CREATE UNIQUE INDEX idx_checkbox_note_viewing
                ON checkbox_states (note_id, viewing_month);
            CREATE UNIQUE INDEX idx_checkbox_general_viewing
                ON checkbox_states (general_note_month_key, viewing_month);
        """,
    },
    # Version 3: Improved frozen target calculation
    # Adds fields for tracking rollover amount and due date at freeze time
    # Clears existing frozen targets to force recalculation with new model
    # Uses callable to handle idempotent column addition (SQLite limitation)
    {
        "version": 3,
        "description": "Improved frozen target calculation with rollover tracking",
        "sql": migrate_v3_frozen_target,  # Callable for idempotent migration
    },
    # Version 4: Add subtract_spending column to wishlist_items
    # Controls whether spending reduces progress (default: False)
    {
        "version": 4,
        "description": "Add subtract_spending to wishlist items",
        "sql": migrate_v4_wishlist_subtract_spending,
    },
    # Version 5: Replace subtract_spending with goal_type enum
    # Adds completion tracking and tracking start date
    {
        "version": 5,
        "description": "Wishlist goal types with completion tracking",
        "sql": migrate_v5_wishlist_goal_type,
    },
    # Version 6: Add sort_order for drag-to-reorder persistence
    # Adds sort_order to wishlist_items and monarch_goal_layout
    {
        "version": 6,
        "description": "Add sort_order for stash reordering",
        "sql": migrate_v6_stash_sort_order,
    },
]


def get_schema_version(conn: sqlite3.Connection) -> int:
    """Get current schema version from database."""
    cursor = conn.cursor()

    # Check if schema_version table exists
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='schema_version'
    """)

    if not cursor.fetchone():
        # Table doesn't exist - check if this is a fresh DB or legacy
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='notes'
        """)
        if cursor.fetchone():
            # Has tables but no version tracking - legacy DB at version 1
            return 1
        else:
            # Fresh database
            return 0

    # Get version from table
    cursor.execute("SELECT version FROM schema_version LIMIT 1")
    row = cursor.fetchone()
    return row[0] if row else 0


def set_schema_version(conn: sqlite3.Connection, version: int) -> None:
    """Set schema version in database."""
    cursor = conn.cursor()

    # Ensure table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schema_version (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            version INTEGER NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """)

    # Upsert version
    cursor.execute(
        """
        INSERT INTO schema_version (id, version, updated_at)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            version = excluded.version,
            updated_at = excluded.updated_at
    """,
        (version, datetime.utcnow().isoformat()),
    )

    conn.commit()


def run_migrations(db_path: Path) -> None:
    """
    Run pending migrations on the database.

    Called on app startup. Safe to call multiple times -
    only runs migrations newer than current DB version.
    """
    if not db_path.exists():
        logger.info("Database does not exist yet, skipping migrations")
        return

    conn = sqlite3.connect(db_path)
    try:
        current_version = get_schema_version(conn)
        logger.info(f"Current schema version: {current_version}, target: {SCHEMA_VERSION}")

        if current_version >= SCHEMA_VERSION:
            logger.info("Database is up to date")
            return

        # Run each migration in order
        for migration in MIGRATIONS:
            version: int = migration["version"]  # type: ignore[assignment]

            if current_version >= version:
                continue  # Already applied

            description: str = migration["description"]  # type: ignore[assignment]
            sql: str | None = migration["sql"]  # type: ignore[assignment]

            logger.info(f"Running migration v{version}: {description}")

            if sql:
                if callable(sql):
                    # Execute migration function
                    sql(conn)
                else:
                    # Execute migration SQL script
                    cursor = conn.cursor()
                    cursor.executescript(sql)
                    conn.commit()

            # Update version after each successful migration
            set_schema_version(conn, version)
            logger.info(f"Migration v{version} complete")

        logger.info(f"All migrations complete. Schema version: {SCHEMA_VERSION}")

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        conn.close()


def ensure_schema_current(db_path: Path) -> None:
    """
    Ensure database schema is current.

    This is the main entry point called from init_db().
    Creates schema_version table if needed and runs pending migrations.
    """
    run_migrations(db_path)
