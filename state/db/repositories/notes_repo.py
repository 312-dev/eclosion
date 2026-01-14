"""
Notes repository with encryption support.

All note content is encrypted with the user's passphrase.
"""

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from core.encryption import CredentialEncryption, DecryptionError
from state.db.models import ArchivedNote, CheckboxState, GeneralNote, KnownCategory, Note


class NotesRepository:
    """
    Repository for managing encrypted notes.

    Note content is encrypted with the user's passphrase for privacy.
    Requires passphrase for all read/write operations on content.
    """

    def __init__(self, session: Session):
        self.session = session

    def _encrypt_content(self, content: str, passphrase: str) -> tuple[str, str]:
        """Encrypt content and return (encrypted_content, salt)."""
        enc = CredentialEncryption(passphrase=passphrase)
        return enc.encrypt(content), enc.get_salt_b64()

    def _decrypt_content(self, encrypted: str, salt: str, passphrase: str) -> str:
        """Decrypt content using stored salt."""
        from cryptography.fernet import InvalidToken

        try:
            salt_bytes = CredentialEncryption.salt_from_b64(salt)
            enc = CredentialEncryption(passphrase=passphrase, salt=salt_bytes)
            return enc.decrypt(encrypted)
        except InvalidToken:
            raise DecryptionError("Invalid passphrase or corrupted note content")

    # === Category/Group Notes ===

    def save_note(
        self,
        passphrase: str,
        category_type: str,
        category_id: str,
        category_name: str,
        month_key: str,
        content: str,
        group_id: str | None = None,
        group_name: str | None = None,
    ) -> dict:
        """
        Save or update a note for a category or group.

        Returns the note as a dict (with decrypted content).
        """
        now = datetime.utcnow()

        # Check for existing note
        existing = (
            self.session.query(Note)
            .filter(
                Note.category_id == category_id,
                Note.category_type == category_type,
                Note.month_key == month_key,
            )
            .first()
        )

        # Encrypt content
        encrypted, salt = self._encrypt_content(content, passphrase)

        if existing:
            existing.content_encrypted = encrypted
            existing.salt = salt
            existing.updated_at = now
            existing.category_name = category_name
            if group_id:
                existing.group_id = group_id
            if group_name:
                existing.group_name = group_name
            note = existing
        else:
            note = Note(
                id=str(uuid.uuid4()),
                category_type=category_type,
                category_id=category_id,
                category_name=category_name,
                group_id=group_id,
                group_name=group_name,
                month_key=month_key,
                content_encrypted=encrypted,
                salt=salt,
                created_at=now,
                updated_at=now,
            )
            self.session.add(note)

        # Update known categories
        self._update_known_category(category_id, category_name)

        return self._note_to_dict(note, content)

    def delete_note(self, note_id: str) -> bool:
        """Delete a note by ID."""
        result = self.session.query(Note).filter(Note.id == note_id).delete()
        return result > 0

    def get_note(self, note_id: str, passphrase: str) -> dict | None:
        """Get a note by ID with decrypted content."""
        note = self.session.query(Note).filter(Note.id == note_id).first()
        if not note:
            return None

        content = self._decrypt_content(note.content_encrypted, note.salt, passphrase)
        return self._note_to_dict(note, content)

    def get_notes_for_category(
        self, category_type: str, category_id: str, passphrase: str
    ) -> list[dict]:
        """Get all notes for a category/group, sorted by month."""
        notes = (
            self.session.query(Note)
            .filter(
                Note.category_type == category_type,
                Note.category_id == category_id,
            )
            .order_by(Note.month_key)
            .all()
        )

        result = []
        for note in notes:
            content = self._decrypt_content(note.content_encrypted, note.salt, passphrase)
            result.append(self._note_to_dict(note, content))
        return result

    def get_effective_note(
        self, category_type: str, category_id: str, target_month: str, passphrase: str
    ) -> dict | None:
        """
        Get the effective note for a category at a given month.

        Returns most recent note at or before target month.
        """
        notes = self.get_notes_for_category(category_type, category_id, passphrase)

        # Find most recent note at or before target month
        for note in reversed(notes):
            if note["month_key"] <= target_month:
                return {
                    "note": note,
                    "source_month": note["month_key"],
                    "is_inherited": note["month_key"] != target_month,
                }

        return None

    def get_all_notes_for_month(self, month_key: str, passphrase: str) -> dict:
        """
        Get all notes effective for a given month.

        Returns notes with inheritance resolved.
        """
        # Get all unique category refs
        all_notes = self.session.query(Note).all()
        category_refs = {(n.category_type, n.category_id) for n in all_notes}

        # Get effective note for each
        effective_notes = {}
        for cat_type, cat_id in category_refs:
            effective = self.get_effective_note(cat_type, cat_id, month_key, passphrase)
            if effective:
                key = f"{cat_type}:{cat_id}"
                effective_notes[key] = effective

        # Get effective general note (with inheritance)
        effective_general = self.get_effective_general_note(month_key, passphrase)

        return {
            "month_key": month_key,
            "effective_notes": effective_notes,
            "effective_general_note": effective_general,
        }

    def get_all_category_notes(self, passphrase: str) -> list[dict]:
        """Get all category notes sorted by category and month."""
        notes = self.session.query(Note).order_by(Note.category_id, Note.month_key.asc()).all()
        result = []
        for note in notes:
            content = self._decrypt_content(note.content_encrypted, note.salt, passphrase)
            result.append(self._note_to_dict(note, content))
        return result

    def get_all_notes(self, passphrase: str) -> dict:
        """
        Get all notes data for bulk loading.

        Returns all raw notes and general notes so the frontend can compute
        effective notes for any month instantly.
        """
        return {
            "notes": self.get_all_category_notes(passphrase),
            "general_notes": self.get_all_general_notes(passphrase),
        }

    def get_revision_history(
        self, category_type: str, category_id: str, passphrase: str
    ) -> list[dict]:
        """Get revision history for a category."""
        notes = self.get_notes_for_category(category_type, category_id, passphrase)

        return [
            {
                "month_key": note["month_key"],
                "content": note["content"],
                "content_preview": (
                    note["content"][:100] + "..." if len(note["content"]) > 100 else note["content"]
                ),
                "created_at": note["created_at"],
                "updated_at": note["updated_at"],
            }
            for note in notes
        ]

    # === General Notes ===

    def save_general_note(self, month_key: str, content: str, passphrase: str) -> dict:
        """Save or update a general note for a month."""
        now = datetime.utcnow()
        encrypted, salt = self._encrypt_content(content, passphrase)

        existing = (
            self.session.query(GeneralNote).filter(GeneralNote.month_key == month_key).first()
        )

        if existing:
            existing.content_encrypted = encrypted
            existing.salt = salt
            existing.updated_at = now
            note = existing
        else:
            note = GeneralNote(
                month_key=month_key,
                id=str(uuid.uuid4()),
                content_encrypted=encrypted,
                salt=salt,
                created_at=now,
                updated_at=now,
            )
            self.session.add(note)

        return self._general_note_to_dict(note, content)

    def get_general_note(self, month_key: str, passphrase: str) -> dict | None:
        """Get general note for a specific month (no inheritance)."""
        note = self.session.query(GeneralNote).filter(GeneralNote.month_key == month_key).first()
        if not note:
            return None

        content = self._decrypt_content(note.content_encrypted, note.salt, passphrase)
        return self._general_note_to_dict(note, content)

    def get_all_general_notes(self, passphrase: str) -> list[dict]:
        """Get all general notes sorted by month_key ascending."""
        notes = self.session.query(GeneralNote).order_by(GeneralNote.month_key.asc()).all()
        result = []
        for note in notes:
            content = self._decrypt_content(note.content_encrypted, note.salt, passphrase)
            result.append(self._general_note_to_dict(note, content))
        return result

    def get_effective_general_note(self, target_month: str, passphrase: str) -> dict | None:
        """
        Get the effective general note for a given month.

        Returns most recent general note at or before target month,
        with inheritance info (similar to category notes).
        """
        all_notes = self.get_all_general_notes(passphrase)

        # Find most recent note at or before target month
        for note in reversed(all_notes):
            if note["month_key"] <= target_month:
                return {
                    "note": note,
                    "source_month": note["month_key"],
                    "is_inherited": note["month_key"] != target_month,
                }

        return None

    def delete_general_note(self, month_key: str) -> bool:
        """Delete general note for a month."""
        result = self.session.query(GeneralNote).filter(GeneralNote.month_key == month_key).delete()
        return result > 0

    # === Archived Notes ===

    def get_archived_notes(self, passphrase: str) -> list[dict]:
        """Get all archived notes with decrypted content."""
        notes = self.session.query(ArchivedNote).all()
        result = []
        for note in notes:
            content = self._decrypt_content(note.content_encrypted, note.salt, passphrase)
            result.append(self._archived_note_to_dict(note, content))
        return result

    def delete_archived_note(self, note_id: str) -> bool:
        """Permanently delete an archived note."""
        result = self.session.query(ArchivedNote).filter(ArchivedNote.id == note_id).delete()
        return result > 0

    def archive_notes_for_category(self, category_id: str, passphrase: str) -> int:
        """
        Archive all notes for a deleted category.

        Returns number of notes archived.
        """
        now = datetime.utcnow()
        notes = self.session.query(Note).filter(Note.category_id == category_id).all()

        archived_count = 0
        for note in notes:
            # Create archived version (content stays encrypted with same salt)
            archived = ArchivedNote(
                id=note.id,
                category_type=note.category_type,
                category_id=note.category_id,
                category_name=note.category_name,
                group_id=note.group_id,
                group_name=note.group_name,
                month_key=note.month_key,
                content_encrypted=note.content_encrypted,
                salt=note.salt,
                created_at=note.created_at,
                updated_at=note.updated_at,
                archived_at=now,
                original_category_name=note.category_name,
                original_group_name=note.group_name,
            )
            self.session.add(archived)
            archived_count += 1

        # Delete original notes
        self.session.query(Note).filter(Note.category_id == category_id).delete()

        # Remove from known categories
        self.session.query(KnownCategory).filter(KnownCategory.category_id == category_id).delete()

        return archived_count

    # === Known Categories ===

    def _update_known_category(self, category_id: str, name: str) -> None:
        """Update or insert known category."""
        existing = (
            self.session.query(KnownCategory)
            .filter(KnownCategory.category_id == category_id)
            .first()
        )
        if existing:
            existing.name = name
        else:
            self.session.add(KnownCategory(category_id=category_id, name=name))

    def sync_categories(self, current_category_ids: set[str], passphrase: str) -> dict:
        """
        Sync known categories with current Monarch categories.

        Archives notes for deleted categories.
        """
        known = self.session.query(KnownCategory).all()
        known_ids = {k.category_id for k in known}

        deleted_ids = known_ids - current_category_ids
        archived_count = 0

        for category_id in deleted_ids:
            archived_count += self.archive_notes_for_category(category_id, passphrase)

        return {"archived_count": archived_count}

    # === Checkbox States ===

    def get_checkbox_states(self, note_id: str, viewing_month: str) -> list[bool]:
        """Get checkbox states for a category/group note."""
        import json

        state = (
            self.session.query(CheckboxState)
            .filter(
                CheckboxState.note_id == note_id,
                CheckboxState.viewing_month == viewing_month,
            )
            .first()
        )
        if not state:
            return []
        result: list[bool] = json.loads(state.states_json)
        return result

    def get_general_checkbox_states(self, source_month: str, viewing_month: str) -> list[bool]:
        """Get checkbox states for a general note."""
        import json

        state = (
            self.session.query(CheckboxState)
            .filter(
                CheckboxState.general_note_month_key == source_month,
                CheckboxState.viewing_month == viewing_month,
            )
            .first()
        )
        if not state:
            return []
        result: list[bool] = json.loads(state.states_json)
        return result

    def update_checkbox_state(
        self,
        viewing_month: str,
        checkbox_index: int,
        is_checked: bool,
        note_id: str | None = None,
        general_note_month_key: str | None = None,
    ) -> list[bool]:
        """
        Update a single checkbox state.

        Returns the updated states array.
        """
        import json

        now = datetime.utcnow()

        # Find existing state record
        if note_id:
            state = (
                self.session.query(CheckboxState)
                .filter(
                    CheckboxState.note_id == note_id,
                    CheckboxState.viewing_month == viewing_month,
                )
                .first()
            )
        else:
            state = (
                self.session.query(CheckboxState)
                .filter(
                    CheckboxState.general_note_month_key == general_note_month_key,
                    CheckboxState.viewing_month == viewing_month,
                )
                .first()
            )

        if state:
            states = json.loads(state.states_json)
        else:
            states = []

        # Expand array if needed
        while len(states) <= checkbox_index:
            states.append(False)

        # Update the specific checkbox
        states[checkbox_index] = is_checked

        if state:
            state.states_json = json.dumps(states)
            state.updated_at = now
        else:
            state = CheckboxState(
                note_id=note_id,
                general_note_month_key=general_note_month_key,
                viewing_month=viewing_month,
                states_json=json.dumps(states),
                created_at=now,
                updated_at=now,
            )
            self.session.add(state)

        typed_states: list[bool] = states
        return typed_states

    def get_all_checkbox_states_for_month(self, viewing_month: str) -> dict[str, list[bool]]:
        """
        Get all checkbox states for a viewing month.

        Returns a dict mapping note_id or "general:{source_month}" to states.
        Used for bulk export.
        """
        import json

        states = (
            self.session.query(CheckboxState)
            .filter(CheckboxState.viewing_month == viewing_month)
            .all()
        )

        result: dict[str, list[bool]] = {}
        for state in states:
            if state.note_id:
                result[state.note_id] = json.loads(state.states_json)
            elif state.general_note_month_key:
                key = f"general:{state.general_note_month_key}"
                result[key] = json.loads(state.states_json)

        return result

    def clear_checkbox_states_for_note(self, note_id: str) -> int:
        """
        Clear all checkbox states for a note (all viewing months).

        Returns number of records deleted.
        """
        return self.session.query(CheckboxState).filter(CheckboxState.note_id == note_id).delete()

    def clear_checkbox_states_for_general_note(self, source_month: str) -> int:
        """
        Clear all checkbox states for a general note (all viewing months).

        Returns number of records deleted.
        """
        return (
            self.session.query(CheckboxState)
            .filter(CheckboxState.general_note_month_key == source_month)
            .delete()
        )

    def clear_checkbox_states_for_viewing_months(
        self,
        viewing_months: list[str],
        note_id: str | None = None,
        general_note_month_key: str | None = None,
    ) -> int:
        """
        Clear checkbox states for specific viewing months.

        Used when breaking inheritance - clears states for affected months.
        Returns number of records deleted.
        """
        query = self.session.query(CheckboxState).filter(
            CheckboxState.viewing_month.in_(viewing_months)
        )

        if note_id:
            query = query.filter(CheckboxState.note_id == note_id)
        elif general_note_month_key:
            query = query.filter(CheckboxState.general_note_month_key == general_note_month_key)

        return query.delete(synchronize_session=False)

    def get_checkbox_states_by_viewing_months(
        self,
        viewing_months: list[str],
        note_id: str | None = None,
        general_note_month_key: str | None = None,
    ) -> dict[str, list[bool]]:
        """
        Get checkbox states for specific viewing months.

        Used to show user which months have checkbox data before clearing.
        Returns dict mapping viewing_month -> states.
        """
        import json

        query = self.session.query(CheckboxState).filter(
            CheckboxState.viewing_month.in_(viewing_months)
        )

        if note_id:
            query = query.filter(CheckboxState.note_id == note_id)
        elif general_note_month_key:
            query = query.filter(CheckboxState.general_note_month_key == general_note_month_key)

        states = query.all()
        return {state.viewing_month: json.loads(state.states_json) for state in states}

    # === Inheritance Impact ===

    def get_inheritance_impact(
        self,
        category_type: str,
        category_id: str,
        month_key: str,
        passphrase: str,
    ) -> dict:
        """
        Calculate the impact of creating a new note at month_key.

        Returns:
        - source_note: The note currently being inherited (if any)
        - affected_months: Months that will lose inheritance
        - months_with_checkbox_states: Which affected months have checkbox data
        - next_custom_note_month: When inheritance chain ends (if any)
        """
        # Get all notes for this category sorted by month
        notes = self.get_notes_for_category(category_type, category_id, passphrase)

        # Find the source note (most recent at or before month_key)
        source_note = None
        for note in reversed(notes):
            if note["month_key"] < month_key:
                source_note = note
                break

        if not source_note:
            # No inherited note, nothing to impact
            return {
                "source_note": None,
                "affected_months": [],
                "months_with_checkbox_states": {},
                "next_custom_note_month": None,
            }

        # Find the next custom note after month_key (end of inheritance chain)
        next_custom_month = None
        for note in notes:
            if note["month_key"] > month_key:
                next_custom_month = note["month_key"]
                break

        # Calculate affected months (month_key through next_custom_month - 1)
        # Or through "reasonable future" if no next custom note
        affected_months = self._get_months_in_range(
            month_key,
            next_custom_month,
            max_future_months=12,  # Look at most 12 months ahead
        )

        # Check which affected months have checkbox states
        months_with_states = self.get_checkbox_states_by_viewing_months(
            affected_months,
            note_id=source_note["id"],
        )

        # Count checked items per month
        months_with_checkbox_data = {}
        for viewing_month, states in months_with_states.items():
            checked_count = sum(1 for s in states if s)
            if checked_count > 0:
                months_with_checkbox_data[viewing_month] = checked_count

        return {
            "source_note": {
                "id": source_note["id"],
                "month_key": source_note["month_key"],
                "content_preview": (
                    source_note["content"][:100] + "..."
                    if len(source_note["content"]) > 100
                    else source_note["content"]
                ),
            },
            "affected_months": affected_months,
            "months_with_checkbox_states": months_with_checkbox_data,
            "next_custom_note_month": next_custom_month,
        }

    def get_general_inheritance_impact(
        self,
        month_key: str,
        passphrase: str,
    ) -> dict:
        """
        Calculate the impact of creating a new general note at month_key.

        Similar to get_inheritance_impact but for general notes.
        """
        # Get all general notes sorted by month
        notes = self.get_all_general_notes(passphrase)

        # Find the source note
        source_note = None
        for note in reversed(notes):
            if note["month_key"] < month_key:
                source_note = note
                break

        if not source_note:
            return {
                "source_note": None,
                "affected_months": [],
                "months_with_checkbox_states": {},
                "next_custom_note_month": None,
            }

        # Find next custom note
        next_custom_month = None
        for note in notes:
            if note["month_key"] > month_key:
                next_custom_month = note["month_key"]
                break

        # Calculate affected months
        affected_months = self._get_months_in_range(
            month_key,
            next_custom_month,
            max_future_months=12,
        )

        # Check which have checkbox states
        months_with_states = self.get_checkbox_states_by_viewing_months(
            affected_months,
            general_note_month_key=source_note["month_key"],
        )

        months_with_checkbox_data = {}
        for viewing_month, states in months_with_states.items():
            checked_count = sum(1 for s in states if s)
            if checked_count > 0:
                months_with_checkbox_data[viewing_month] = checked_count

        return {
            "source_note": {
                "id": source_note["id"],
                "month_key": source_note["month_key"],
                "content_preview": (
                    source_note["content"][:100] + "..."
                    if len(source_note["content"]) > 100
                    else source_note["content"]
                ),
            },
            "affected_months": affected_months,
            "months_with_checkbox_states": months_with_checkbox_data,
            "next_custom_note_month": next_custom_month,
        }

    def _get_months_in_range(
        self,
        start_month: str,
        end_month: str | None,
        max_future_months: int = 12,
    ) -> list[str]:
        """
        Generate list of months from start_month to end_month (exclusive).

        If end_month is None, generate up to max_future_months.
        """

        months = []
        start_parts = start_month.split("-")
        year = int(start_parts[0])
        month = int(start_parts[1])

        count = 0
        while count < max_future_months:
            month_key = f"{year:04d}-{month:02d}"

            # Stop if we've reached or passed end_month
            if end_month and month_key >= end_month:
                break

            months.append(month_key)
            count += 1

            # Move to next month
            month += 1
            if month > 12:
                month = 1
                year += 1

        return months

    # === Helpers ===

    def _note_to_dict(self, note: Note, content: str) -> dict:
        """Convert Note model to dict."""
        return {
            "id": note.id,
            "category_type": note.category_type,
            "category_id": note.category_id,
            "category_name": note.category_name,
            "group_id": note.group_id,
            "group_name": note.group_name,
            "month_key": note.month_key,
            "content": content,
            "created_at": note.created_at.isoformat() if note.created_at else None,
            "updated_at": note.updated_at.isoformat() if note.updated_at else None,
        }

    def _general_note_to_dict(self, note: GeneralNote, content: str) -> dict:
        """Convert GeneralNote to dict."""
        return {
            "id": note.id,
            "month_key": note.month_key,
            "content": content,
            "created_at": note.created_at.isoformat() if note.created_at else None,
            "updated_at": note.updated_at.isoformat() if note.updated_at else None,
        }

    def _archived_note_to_dict(self, note: ArchivedNote, content: str) -> dict:
        """Convert ArchivedNote to dict."""
        return {
            "id": note.id,
            "category_type": note.category_type,
            "category_id": note.category_id,
            "category_name": note.category_name,
            "group_id": note.group_id,
            "group_name": note.group_name,
            "month_key": note.month_key,
            "content": content,
            "created_at": note.created_at.isoformat() if note.created_at else None,
            "updated_at": note.updated_at.isoformat() if note.updated_at else None,
            "archived_at": note.archived_at.isoformat() if note.archived_at else None,
            "original_category_name": note.original_category_name,
            "original_group_name": note.original_group_name,
        }
