"""
SQLite database module for Eclosion.

Provides SQLAlchemy-based persistence with Alembic migrations.
"""

from .database import DATABASE_PATH, backup_database, db_session, get_engine, init_db
from .models import Base
from .repositories import (
    CredentialsRepository,
    NotesRepository,
    SecurityRepository,
    TrackerRepository,
)

__all__ = [
    "DATABASE_PATH",
    "Base",
    "CredentialsRepository",
    "NotesRepository",
    "SecurityRepository",
    "TrackerRepository",
    "backup_database",
    "db_session",
    "get_engine",
    "init_db",
]
