# Notes blueprint
# /notes/* endpoints for monthly notes feature

import re

from flask import Blueprint, request, session

from core import api_handler, sanitize_id, sanitize_name
from core.exceptions import ValidationError

from . import get_services

notes_bp = Blueprint("notes", __name__, url_prefix="/notes")

# Constants for validation
MONTH_KEY_PATTERN = r"^\d{4}-\d{2}$"
ERR_INVALID_MONTH_KEY = "Invalid month_key format. Expected YYYY-MM."
ERR_INVALID_VIEWING_MONTH = "Invalid viewing_month. Expected YYYY-MM."
ERR_INVALID_CATEGORY_TYPE = "Invalid category_type. Must be 'group' or 'category'."
ERR_INVALID_NOTE_ID = "Invalid note_id."
ERR_INVALID_CATEGORY_ID = "Invalid category_id."


def _get_passphrase() -> str:
    """Get passphrase from session or header. Raises if not available.

    In desktop mode, cookies don't work reliably between file:// and http://localhost,
    so we also accept the notes key via X-Notes-Key header.
    """
    from core import config

    # First try the header (desktop mode workaround for cookie issues)
    if config.is_desktop_environment():
        header_key = request.headers.get("X-Notes-Key")
        if header_key:
            return header_key

    # Fall back to session (web mode)
    passphrase: str | None = session.get("session_passphrase")
    if not passphrase:
        raise ValidationError("Session expired. Please unlock again.")
    return passphrase


@notes_bp.route("/month/<month_key>", methods=["GET"])
@api_handler(handle_mfa=False)
def get_month_notes(month_key: str):
    """
    Get all notes for a specific month with inheritance resolved.

    Returns notes, general month note, and metadata.
    """
    # Validate month_key format (YYYY-MM)
    if not re.match(MONTH_KEY_PATTERN, month_key):
        raise ValidationError(ERR_INVALID_MONTH_KEY)

    services = get_services()
    passphrase = _get_passphrase()
    return services.notes_manager.get_all_notes_for_month(month_key, passphrase)


@notes_bp.route("/all", methods=["GET"])
@api_handler(handle_mfa=False)
def get_all_notes():
    """
    Get all notes data for bulk loading.

    Returns all raw notes and general notes so the frontend can compute
    effective notes for any month instantly without additional API calls.
    This enables immediate page navigation in the notes feature.
    """
    services = get_services()
    passphrase = _get_passphrase()
    return services.notes_manager.get_all_notes(passphrase)


@notes_bp.route("/categories", methods=["GET"])
@api_handler(handle_mfa=True, success_wrapper="groups")
async def get_notes_categories():
    """
    Get all Monarch categories organized by group for the Notes feature.

    Returns all category groups with their categories, not filtered by
    recurring expenses or any other criteria.
    """
    services = get_services()
    return await services.sync_service.get_all_categories_grouped()


@notes_bp.route("/category", methods=["POST"])
@api_handler(handle_mfa=False)
def save_category_note():
    """Save or update a note for a category or group."""
    data = request.get_json()

    category_type = data.get("category_type")
    category_id = sanitize_id(data.get("category_id"))
    category_name = sanitize_name(data.get("category_name"))
    month_key = data.get("month_key")
    content = data.get("content", "")
    group_id = sanitize_id(data.get("group_id")) if data.get("group_id") else None
    group_name = sanitize_name(data.get("group_name")) if data.get("group_name") else None

    # Validate required fields
    if not category_type or category_type not in ("group", "category"):
        raise ValidationError(ERR_INVALID_CATEGORY_TYPE)

    if not category_id or not category_name:
        raise ValidationError("Missing category_id or category_name.")

    if not month_key or not re.match(MONTH_KEY_PATTERN, month_key):
        raise ValidationError(ERR_INVALID_MONTH_KEY)

    services = get_services()
    passphrase = _get_passphrase()
    note = services.notes_manager.save_note(
        passphrase=passphrase,
        category_type=category_type,
        category_id=category_id,
        category_name=category_name,
        month_key=month_key,
        content=content,
        group_id=group_id,
        group_name=group_name,
    )

    return {
        "success": True,
        "note": note,
    }


@notes_bp.route("/category/<note_id>", methods=["DELETE"])
@api_handler(handle_mfa=False)
def delete_category_note(note_id: str):
    """Delete a category note by ID."""
    safe_note_id = sanitize_id(note_id)
    if not safe_note_id:
        raise ValidationError(ERR_INVALID_NOTE_ID)
    note_id = safe_note_id

    services = get_services()
    deleted = services.notes_manager.delete_note(note_id)
    return {"success": deleted}


@notes_bp.route("/general/<month_key>", methods=["GET"])
@api_handler(handle_mfa=False)
def get_general_note(month_key: str):
    """Get general note for a specific month."""
    if not re.match(MONTH_KEY_PATTERN, month_key):
        raise ValidationError(ERR_INVALID_MONTH_KEY)

    services = get_services()
    passphrase = _get_passphrase()
    note = services.notes_manager.get_general_note(month_key, passphrase)
    return {"note": note}


@notes_bp.route("/general", methods=["POST"])
@api_handler(handle_mfa=False)
def save_general_note():
    """Save or update a general note for a month."""
    data = request.get_json()

    month_key = data.get("month_key")
    content = data.get("content", "")

    if not month_key or not re.match(MONTH_KEY_PATTERN, month_key):
        raise ValidationError(ERR_INVALID_MONTH_KEY)

    services = get_services()
    passphrase = _get_passphrase()
    note = services.notes_manager.save_general_note(month_key, content, passphrase)
    return {
        "success": True,
        "note": note,
    }


@notes_bp.route("/general/<month_key>", methods=["DELETE"])
@api_handler(handle_mfa=False)
def delete_general_note(month_key: str):
    """Delete general note for a month."""
    if not re.match(MONTH_KEY_PATTERN, month_key):
        raise ValidationError(ERR_INVALID_MONTH_KEY)

    services = get_services()
    deleted = services.notes_manager.delete_general_note(month_key)
    return {"success": deleted}


@notes_bp.route("/archived", methods=["GET"])
@api_handler(handle_mfa=False)
def get_archived_notes():
    """Get all archived notes."""
    services = get_services()
    passphrase = _get_passphrase()
    archived = services.notes_manager.get_archived_notes(passphrase)
    return {"archived_notes": archived}


@notes_bp.route("/archived/<note_id>", methods=["DELETE"])
@api_handler(handle_mfa=False)
def delete_archived_note(note_id: str):
    """Permanently delete an archived note."""
    safe_note_id = sanitize_id(note_id)
    if not safe_note_id:
        raise ValidationError(ERR_INVALID_NOTE_ID)
    note_id = safe_note_id

    services = get_services()
    deleted = services.notes_manager.delete_archived_note(note_id)
    return {"success": deleted}


@notes_bp.route("/sync-categories", methods=["POST"])
@api_handler(handle_mfa=True)
async def sync_notes_categories():
    """
    Sync known categories with current Monarch categories.

    Detects deleted categories and archives their notes.
    """
    services = get_services()
    passphrase = _get_passphrase()

    # Get current categories from Monarch (with nested categories)
    groups = await services.sync_service.get_all_categories_grouped()

    # Extract all category IDs (both groups and categories)
    current_ids: set[str] = set()
    for group in groups:
        group_id = group.get("id")
        if group_id:
            current_ids.add(group_id)
        # Add category IDs from this group
        for cat in group.get("categories", []):
            cat_id = cat.get("id")
            if cat_id:
                current_ids.add(cat_id)

    result = services.notes_manager.sync_categories(current_ids, passphrase)
    return {"success": True, **result}


@notes_bp.route("/history/<category_type>/<category_id>", methods=["GET"])
@api_handler(handle_mfa=False)
def get_note_history(category_type: str, category_id: str):
    """Get revision history for a category or group's notes."""
    if category_type not in ("group", "category"):
        raise ValidationError(ERR_INVALID_CATEGORY_TYPE)

    safe_category_id = sanitize_id(category_id)
    if not safe_category_id:
        raise ValidationError(ERR_INVALID_CATEGORY_ID)
    category_id = safe_category_id

    services = get_services()
    passphrase = _get_passphrase()
    history = services.notes_manager.get_revision_history(category_type, category_id, passphrase)
    return {"history": history}


# ============================================================================
# Checkbox States
# ============================================================================


@notes_bp.route("/checkboxes/<note_id>", methods=["GET"])
@api_handler(handle_mfa=False)
def get_checkbox_states(note_id: str):
    """Get checkbox states for a category/group note."""
    safe_note_id = sanitize_id(note_id)
    if not safe_note_id:
        raise ValidationError(ERR_INVALID_NOTE_ID)

    viewing_month = request.args.get("viewing_month")
    if not viewing_month or not re.match(MONTH_KEY_PATTERN, viewing_month):
        raise ValidationError(ERR_INVALID_VIEWING_MONTH)

    services = get_services()
    _get_passphrase()  # Verify session is valid
    states = services.notes_manager.get_checkbox_states(safe_note_id, viewing_month)
    return {"states": states}


@notes_bp.route("/checkboxes/general/<source_month>", methods=["GET"])
@api_handler(handle_mfa=False)
def get_general_checkbox_states(source_month: str):
    """Get checkbox states for a general note."""
    if not re.match(MONTH_KEY_PATTERN, source_month):
        raise ValidationError("Invalid source_month. Expected YYYY-MM.")

    viewing_month = request.args.get("viewing_month")
    if not viewing_month or not re.match(MONTH_KEY_PATTERN, viewing_month):
        raise ValidationError(ERR_INVALID_VIEWING_MONTH)

    services = get_services()
    _get_passphrase()  # Verify session is valid
    states = services.notes_manager.get_general_checkbox_states(source_month, viewing_month)
    return {"states": states}


@notes_bp.route("/checkboxes", methods=["POST"])
@api_handler(handle_mfa=False)
def update_checkbox_state():
    """Update a checkbox state."""
    data = request.get_json()

    note_id = data.get("note_id")
    general_note_month_key = data.get("general_note_month_key")
    viewing_month = data.get("viewing_month")
    checkbox_index = data.get("checkbox_index")
    is_checked = data.get("is_checked")

    # Validate inputs
    if not viewing_month or not re.match(MONTH_KEY_PATTERN, viewing_month):
        raise ValidationError(ERR_INVALID_VIEWING_MONTH)

    if checkbox_index is None or not isinstance(checkbox_index, int) or checkbox_index < 0:
        raise ValidationError("Invalid checkbox_index. Must be a non-negative integer.")

    if is_checked is None or not isinstance(is_checked, bool):
        raise ValidationError("Invalid is_checked. Must be a boolean.")

    if not note_id and not general_note_month_key:
        raise ValidationError("Must provide either note_id or general_note_month_key.")

    if note_id and general_note_month_key:
        raise ValidationError("Provide only one of note_id or general_note_month_key.")

    if note_id:
        safe_note_id = sanitize_id(note_id)
        if not safe_note_id:
            raise ValidationError(ERR_INVALID_NOTE_ID)
        note_id = safe_note_id

    if general_note_month_key and not re.match(MONTH_KEY_PATTERN, general_note_month_key):
        raise ValidationError("Invalid general_note_month_key. Expected YYYY-MM.")

    services = get_services()
    _get_passphrase()  # Verify session is valid
    states = services.notes_manager.update_checkbox_state(
        viewing_month=viewing_month,
        checkbox_index=checkbox_index,
        is_checked=is_checked,
        note_id=note_id,
        general_note_month_key=general_note_month_key,
    )
    return {"success": True, "states": states}


@notes_bp.route("/checkboxes/month/<viewing_month>", methods=["GET"])
@api_handler(handle_mfa=False)
def get_month_checkbox_states(viewing_month: str):
    """Get all checkbox states for a viewing month (for export)."""
    if not re.match(MONTH_KEY_PATTERN, viewing_month):
        raise ValidationError(ERR_INVALID_VIEWING_MONTH)

    services = get_services()
    _get_passphrase()  # Verify session is valid
    states = services.notes_manager.get_all_checkbox_states_for_month(viewing_month)
    return {"states": states}


# ============================================================================
# Inheritance Impact
# ============================================================================


@notes_bp.route("/inheritance-impact", methods=["GET"])
@api_handler(handle_mfa=False)
def get_inheritance_impact():
    """
    Get the impact of creating a new note (breaking inheritance).

    Returns affected months and which have checkbox states that will be cleared.
    """
    category_type = request.args.get("category_type")
    category_id = request.args.get("category_id")
    month_key = request.args.get("month_key")
    is_general = request.args.get("is_general", "false").lower() == "true"

    if not month_key or not re.match(MONTH_KEY_PATTERN, month_key):
        raise ValidationError("Invalid month_key. Expected YYYY-MM.")

    services = get_services()
    passphrase = _get_passphrase()

    if is_general:
        impact = services.notes_manager.get_general_inheritance_impact(month_key, passphrase)
    else:
        if not category_type or category_type not in ("group", "category"):
            raise ValidationError(ERR_INVALID_CATEGORY_TYPE)

        safe_category_id = sanitize_id(category_id)
        if not safe_category_id:
            raise ValidationError(ERR_INVALID_CATEGORY_ID)

        impact = services.notes_manager.get_inheritance_impact(
            category_type, safe_category_id, month_key, passphrase
        )

    return impact
