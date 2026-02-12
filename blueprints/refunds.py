# Refunds blueprint
# /refunds/* endpoints for tracking purchases awaiting refunds

import logging

from flask import Blueprint, request

from core import api_handler, sanitize_name
from services.refunds_service import RefundsService

logger = logging.getLogger(__name__)

refunds_bp = Blueprint("refunds", __name__, url_prefix="/refunds")

# Create service instance
_refunds_service: RefundsService | None = None


def get_refunds_service() -> RefundsService:
    """Get or create the refunds service singleton."""
    global _refunds_service
    if _refunds_service is None:
        _refunds_service = RefundsService()
    return _refunds_service


# ---- CONFIG ENDPOINTS ----


@refunds_bp.route("/config", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_config():
    """Get refunds configuration."""
    service = get_refunds_service()
    return await service.get_config()


@refunds_bp.route("/config", methods=["PATCH"])
@api_handler(handle_mfa=False)
async def update_config():
    """Update refunds configuration."""
    data = request.json or {}
    service = get_refunds_service()
    return await service.update_config(data)


# ---- PENDING COUNT ENDPOINT ----


@refunds_bp.route("/pending-count", methods=["GET"])
@api_handler(handle_mfa=True)
async def get_pending_count():
    """Get count of unmatched transactions across all views."""
    service = get_refunds_service()
    return await service.get_pending_count()


# ---- TAGS ENDPOINT ----


@refunds_bp.route("/tags", methods=["GET"])
@api_handler(handle_mfa=True)
async def get_tags():
    """Get all Monarch transaction tags."""
    service = get_refunds_service()
    tags = await service.get_tags()
    return {"tags": tags}


# ---- SAVED VIEWS ENDPOINTS ----


@refunds_bp.route("/views", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_views():
    """Get all saved views."""
    service = get_refunds_service()
    views = await service.get_views()
    return {"views": views}


@refunds_bp.route("/views", methods=["POST"])
@api_handler(handle_mfa=False)
async def create_view():
    """Create a new saved view."""
    data = request.json or {}
    name = sanitize_name(data.get("name", ""))
    tag_ids = data.get("tagIds", [])
    category_ids = data.get("categoryIds")

    if not name:
        return {"success": False, "error": "Name is required"}, 400
    if not isinstance(tag_ids, list):
        tag_ids = []
    has_tags = len(tag_ids) > 0
    has_categories = isinstance(category_ids, list) and len(category_ids) > 0
    if not has_tags and not has_categories:
        return {"success": False, "error": "At least one tag or category is required"}, 400

    service = get_refunds_service()
    return await service.create_view(name, tag_ids, category_ids)


@refunds_bp.route("/views/<view_id>", methods=["PATCH"])
@api_handler(handle_mfa=False)
async def update_view(view_id: str):
    """Update a saved view."""
    data = request.json or {}
    if "name" in data:
        data["name"] = sanitize_name(data["name"])

    service = get_refunds_service()
    return await service.update_view(view_id, data)


@refunds_bp.route("/views/<view_id>", methods=["DELETE"])
@api_handler(handle_mfa=False)
async def delete_view(view_id: str):
    """Delete a saved view."""
    service = get_refunds_service()
    return await service.delete_view(view_id)


@refunds_bp.route("/views/reorder", methods=["POST"])
@api_handler(handle_mfa=False)
async def reorder_views():
    """Reorder saved views."""
    data = request.json or {}
    view_ids = data.get("viewIds", [])
    service = get_refunds_service()
    return await service.reorder_views(view_ids)


# ---- TRANSACTION ENDPOINTS ----


@refunds_bp.route("/transactions", methods=["POST"])
@api_handler(handle_mfa=True)
async def get_transactions():
    """Fetch transactions by tags, categories, and date range."""
    data = request.json or {}
    tag_ids = data.get("tagIds", [])
    category_ids = data.get("categoryIds") or []
    start_date = data.get("startDate")
    end_date = data.get("endDate")

    if not tag_ids and not category_ids:
        return {"transactions": []}

    service = get_refunds_service()
    transactions = await service.get_transactions(
        tag_ids=tag_ids or None,
        category_ids=category_ids or None,
        start_date=start_date,
        end_date=end_date,
    )
    return {"transactions": transactions}


@refunds_bp.route("/search", methods=["POST"])
@api_handler(handle_mfa=True)
async def search_transactions():
    """Search transactions for refund matching."""
    data = request.json or {}
    search = data.get("search") or None
    start_date = data.get("startDate")
    end_date = data.get("endDate")
    limit = data.get("limit", 10)
    cursor = data.get("cursor", 0)

    service = get_refunds_service()
    result = await service.search_for_refund(
        search, start_date, end_date, limit=limit, cursor=cursor
    )
    return result


# ---- MATCH ENDPOINTS ----


@refunds_bp.route("/matches", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_matches():
    """Get all refund matches."""
    service = get_refunds_service()
    matches = await service.get_matches()
    return {"matches": matches}


@refunds_bp.route("/match", methods=["POST"])
@api_handler(handle_mfa=True)
async def create_match():
    """Create a refund match."""
    data = request.json or {}

    original_transaction_id = data.get("originalTransactionId")
    if not original_transaction_id:
        return {"success": False, "error": "originalTransactionId is required"}, 400

    service = get_refunds_service()
    return await service.create_match(
        original_transaction_id=original_transaction_id,
        refund_transaction_id=data.get("refundTransactionId"),
        refund_amount=data.get("refundAmount"),
        refund_merchant=data.get("refundMerchant"),
        refund_date=data.get("refundDate"),
        refund_account=data.get("refundAccount"),
        skipped=data.get("skipped", False),
        expected_refund=data.get("expectedRefund", False),
        expected_date=data.get("expectedDate"),
        expected_account=data.get("expectedAccount"),
        expected_account_id=data.get("expectedAccountId"),
        expected_note=data.get("expectedNote"),
        expected_amount=data.get("expectedAmount"),
        replace_tag=data.get("replaceTag", False),
        original_tag_ids=data.get("originalTagIds"),
        original_notes=data.get("originalNotes"),
        view_tag_ids=data.get("viewTagIds"),
        transaction_data=data.get("transactionData"),
    )


@refunds_bp.route("/match/<match_id>", methods=["DELETE"])
@api_handler(handle_mfa=True)
async def delete_match(match_id: str):
    """Delete a refund match and restore original tags."""
    service = get_refunds_service()
    return await service.delete_match(match_id)
