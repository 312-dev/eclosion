"""
Notes models with encryption.

Notes are encrypted with the user's passphrase for privacy.
"""

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text
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
    Stores checkbox state separately from note content.

    Allows checkbox states to persist or reset per month independently
    of the note content itself.

    Keying strategy:
    - For category notes: note_id + viewing_month (null for persist mode)
    - For general notes: general_note_month_key + viewing_month (null for persist mode)
    """

    __tablename__ = "checkbox_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # For category/group notes - foreign key to notes table
    note_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=True,
    )

    # For general notes - use month_key since they're per-month
    general_note_month_key: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Viewing month - NULL for persist mode, set for reset mode
    viewing_month: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Checkbox position in markdown (0-indexed)
    checkbox_index: Mapped[int] = mapped_column(Integer, nullable=False)

    # Checked state
    is_checked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Timestamp
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    __table_args__ = (
        Index("idx_checkbox_note", "note_id", "viewing_month", "checkbox_index"),
        Index("idx_checkbox_general", "general_note_month_key", "viewing_month", "checkbox_index"),
    )


class NotesSettings(Base):
    """
    Global settings for the Notes feature.

    Single-row table (enforced by constraint).
    """

    __tablename__ = "notes_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)

    # Checkbox persistence mode: 'persist' or 'reset'
    # 'persist': Checkbox state follows the note, shared across all viewing months
    # 'reset': Each viewing month gets fresh checkbox state
    checkbox_mode: Mapped[str] = mapped_column(String(20), default="persist", nullable=False)

    __table_args__ = (CheckConstraint("id = 1", name="single_row_notes_settings"),)
