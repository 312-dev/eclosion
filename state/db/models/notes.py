"""
Notes models with encryption.

Notes are encrypted with the user's passphrase for privacy.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Note(Base):
    """
    Category or group note.

    Content is encrypted with user's passphrase.
    Supports note inheritance (most recent note applies to future months).
    """

    __tablename__ = "notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    category_type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'group' or 'category'
    category_id: Mapped[str] = mapped_column(String(100), nullable=False)  # Monarch ID
    category_name: Mapped[str] = mapped_column(String(255), nullable=False)
    group_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    group_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    month_key: Mapped[str] = mapped_column(String(10), nullable=False)  # "2025-01"
    # Encrypted content - Fernet ciphertext of markdown
    content_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    # Salt for this note's encryption (allows re-keying individual notes if needed)
    salt: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    __table_args__ = (
        Index("idx_notes_category", "category_type", "category_id"),
        Index("idx_notes_month", "month_key"),
    )


class GeneralNote(Base):
    """
    General note for a month (not tied to a category).

    Content is encrypted with user's passphrase.
    """

    __tablename__ = "general_notes"

    month_key: Mapped[str] = mapped_column(String(10), primary_key=True)  # "2025-01"
    id: Mapped[str] = mapped_column(String(36), nullable=False)  # UUID
    # Encrypted content
    content_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    salt: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class ArchivedNote(Base):
    """
    Archived note from a deleted category.

    Preserves notes when categories are deleted from Monarch.
    Content remains encrypted.
    """

    __tablename__ = "archived_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    category_type: Mapped[str] = mapped_column(String(20), nullable=False)
    category_id: Mapped[str] = mapped_column(String(100), nullable=False)
    category_name: Mapped[str] = mapped_column(String(255), nullable=False)
    group_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    group_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    month_key: Mapped[str] = mapped_column(String(10), nullable=False)
    # Encrypted content
    content_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    salt: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    archived_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    original_category_name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_group_name: Mapped[str | None] = mapped_column(String(255), nullable=True)


class KnownCategory(Base):
    """
    Tracks known Monarch categories for deletion detection.

    When a category disappears from Monarch, we can detect it
    and archive related notes.
    """

    __tablename__ = "known_categories"

    category_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)


class CheckboxState(Base):
    """
    Stores checkbox states separately from note content.

    Each viewing month gets its own checkbox states (reset mode).
    States are stored as a JSON array of booleans indexed by checkbox position.

    Keying strategy:
    - For category/group notes: note_id + viewing_month
    - For general notes: general_note_month_key + viewing_month
    """

    __tablename__ = "checkbox_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # For category/group notes - foreign key to notes table
    note_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=True,
    )

    # For general notes - the source month of the general note
    general_note_month_key: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Viewing month context (each month has independent checkbox states)
    viewing_month: Mapped[str] = mapped_column(String(10), nullable=False)

    # JSON array of booleans: [true, false, true, ...]
    states_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    __table_args__ = (
        Index("idx_checkbox_note_viewing", "note_id", "viewing_month", unique=True),
        Index(
            "idx_checkbox_general_viewing", "general_note_month_key", "viewing_month", unique=True
        ),
    )
