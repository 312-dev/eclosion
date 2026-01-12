"""
Checkbox state repository.

Manages checkbox states stored separately from note content.
"""

from datetime import datetime

from sqlalchemy.orm import Session

from state.db.models import CheckboxState, NotesSettings


class CheckboxRepository:
    """
    Repository for managing checkbox states.

    Checkbox states are stored separately from note content to allow:
    - State changes without modifying note content
    - Per-month checkbox state reset option
    """

    def __init__(self, session: Session):
        self.session = session

    # === Checkbox States ===

    def get_checkbox_states(
        self,
        note_id: str | None,
        general_note_month_key: str | None,
        viewing_month: str,
        mode: str,
    ) -> list[bool]:
        """
        Get checkbox states for a note.

        Args:
            note_id: For category/group notes
            general_note_month_key: For general notes
            viewing_month: Current viewing month (YYYY-MM)
            mode: 'persist' or 'reset'

        Returns:
            List of booleans indexed by checkbox position.
            Empty positions are filled with False.
        """
        # Build query based on mode
        if note_id:
            query = self.session.query(CheckboxState).filter(CheckboxState.note_id == note_id)
        else:
            query = self.session.query(CheckboxState).filter(
                CheckboxState.general_note_month_key == general_note_month_key
            )

        # In persist mode, look for states with NULL viewing_month
        # In reset mode, look for states with matching viewing_month
        if mode == "persist":
            query = query.filter(CheckboxState.viewing_month.is_(None))
        else:
            query = query.filter(CheckboxState.viewing_month == viewing_month)

        states = query.all()

        if not states:
            return []

        # Convert to list indexed by checkbox_index
        max_index = max(s.checkbox_index for s in states)
        result = [False] * (max_index + 1)
        for state in states:
            result[state.checkbox_index] = state.is_checked

        return result

    def set_checkbox_state(
        self,
        note_id: str | None,
        general_note_month_key: str | None,
        viewing_month: str,
        checkbox_index: int,
        is_checked: bool,
        mode: str,
    ) -> None:
        """
        Set a checkbox state.

        Args:
            note_id: For category/group notes
            general_note_month_key: For general notes
            viewing_month: Current viewing month (YYYY-MM)
            checkbox_index: Position of checkbox in markdown (0-indexed)
            is_checked: New checked state
            mode: 'persist' or 'reset'
        """
        now = datetime.utcnow()

        # Determine the month key to use for storage
        storage_month = None if mode == "persist" else viewing_month

        # Look for existing state
        if note_id:
            existing = (
                self.session.query(CheckboxState)
                .filter(
                    CheckboxState.note_id == note_id,
                    CheckboxState.viewing_month == storage_month
                    if storage_month
                    else CheckboxState.viewing_month.is_(None),
                    CheckboxState.checkbox_index == checkbox_index,
                )
                .first()
            )
        else:
            existing = (
                self.session.query(CheckboxState)
                .filter(
                    CheckboxState.general_note_month_key == general_note_month_key,
                    CheckboxState.viewing_month == storage_month
                    if storage_month
                    else CheckboxState.viewing_month.is_(None),
                    CheckboxState.checkbox_index == checkbox_index,
                )
                .first()
            )

        if existing:
            existing.is_checked = is_checked
            existing.updated_at = now
        else:
            state = CheckboxState(
                note_id=note_id,
                general_note_month_key=general_note_month_key,
                viewing_month=storage_month,
                checkbox_index=checkbox_index,
                is_checked=is_checked,
                updated_at=now,
            )
            self.session.add(state)

    def clear_checkbox_states_for_note(self, note_id: str) -> int:
        """
        Clear all checkbox states for a note.

        Called when a note is deleted (also handled by CASCADE).
        Returns count of deleted states.
        """
        result = self.session.query(CheckboxState).filter(CheckboxState.note_id == note_id).delete()
        return result

    def get_all_checkbox_states_for_month(
        self,
        month_key: str,
        mode: str,
    ) -> dict[str, list[bool]]:
        """
        Get all checkbox states for notes in a given month.

        Returns a dict keyed by note_id or "general:{month_key}".
        More efficient than fetching per-note.
        """
        # For category notes, get states based on mode
        if mode == "persist":
            note_states = (
                self.session.query(CheckboxState)
                .filter(
                    CheckboxState.note_id.isnot(None),
                    CheckboxState.viewing_month.is_(None),
                )
                .all()
            )
        else:
            note_states = (
                self.session.query(CheckboxState)
                .filter(
                    CheckboxState.note_id.isnot(None),
                    CheckboxState.viewing_month == month_key,
                )
                .all()
            )

        # For general notes
        if mode == "persist":
            general_states = (
                self.session.query(CheckboxState)
                .filter(
                    CheckboxState.general_note_month_key == month_key,
                    CheckboxState.viewing_month.is_(None),
                )
                .all()
            )
        else:
            general_states = (
                self.session.query(CheckboxState)
                .filter(
                    CheckboxState.general_note_month_key == month_key,
                    CheckboxState.viewing_month == month_key,
                )
                .all()
            )

        # Group by note_id
        result: dict[str, list[bool]] = {}

        # Process category note states
        note_groups: dict[str, list[CheckboxState]] = {}
        for state in note_states:
            note_id = state.note_id
            if note_id is None:
                continue
            if note_id not in note_groups:
                note_groups[note_id] = []
            note_groups[note_id].append(state)

        for note_id, states in note_groups.items():
            max_index = max(s.checkbox_index for s in states)
            state_list = [False] * (max_index + 1)
            for s in states:
                state_list[s.checkbox_index] = s.is_checked
            result[note_id] = state_list

        # Process general note states
        if general_states:
            max_index = max(s.checkbox_index for s in general_states)
            state_list = [False] * (max_index + 1)
            for s in general_states:
                state_list[s.checkbox_index] = s.is_checked
            result[f"general:{month_key}"] = state_list

        return result

    # === Notes Settings ===

    def get_settings(self) -> dict:
        """Get notes settings."""
        settings = self.session.query(NotesSettings).filter(NotesSettings.id == 1).first()

        if not settings:
            # Return defaults if no settings exist yet
            return {"checkbox_mode": "persist"}

        return {"checkbox_mode": settings.checkbox_mode}

    def update_settings(self, checkbox_mode: str | None = None) -> dict:
        """Update notes settings."""
        settings = self.session.query(NotesSettings).filter(NotesSettings.id == 1).first()

        if not settings:
            settings = NotesSettings(id=1, checkbox_mode=checkbox_mode or "persist")
            self.session.add(settings)
        else:
            if checkbox_mode is not None:
                settings.checkbox_mode = checkbox_mode

        return {"checkbox_mode": settings.checkbox_mode}
