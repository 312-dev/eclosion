"""
Refunds Service

Manages the Refunds feature - tracking purchases awaiting refunds/reimbursements.
Handles saved views (tag-filtered tabs), transaction fetching, refund matching,
and tag replacement.
"""

import html
import json
import logging
import re
from datetime import datetime
from typing import Any

from monarch_utils import (
    get_mm,
    get_transaction_notes,
    get_transaction_tags,
    get_transactions_with_icons,
    search_transactions_with_icons,
    set_transaction_tags,
    update_transaction_notes,
)
from state.db import db_session
from state.db.repositories import TrackerRepository

logger = logging.getLogger(__name__)


class RefundsService:
    """Service for refunds feature operations."""

    # === Config ===

    async def get_config(self) -> dict[str, Any]:
        """Get refunds configuration."""
        with db_session() as session:
            repo = TrackerRepository(session)
            config = repo.get_refunds_config()
            return {
                "replacementTagId": config.replacement_tag_id,
                "replaceTagByDefault": config.replace_tag_by_default,
                "agingWarningDays": config.aging_warning_days,
                "showBadge": config.show_badge,
                "hideMatchedTransactions": config.hide_matched_transactions,
                "hideExpectedTransactions": config.hide_expected_transactions,
            }

    async def update_config(self, updates: dict[str, Any]) -> dict[str, Any]:
        """Update refunds configuration."""
        with db_session() as session:
            repo = TrackerRepository(session)
            # Map camelCase to snake_case
            kwargs: dict[str, Any] = {}
            if "replacementTagId" in updates:
                kwargs["replacement_tag_id"] = updates["replacementTagId"]
            if "replaceTagByDefault" in updates:
                kwargs["replace_tag_by_default"] = updates["replaceTagByDefault"]
            if "agingWarningDays" in updates:
                kwargs["aging_warning_days"] = updates["agingWarningDays"]
            if "showBadge" in updates:
                kwargs["show_badge"] = updates["showBadge"]
            if "hideMatchedTransactions" in updates:
                kwargs["hide_matched_transactions"] = updates["hideMatchedTransactions"]
            if "hideExpectedTransactions" in updates:
                kwargs["hide_expected_transactions"] = updates["hideExpectedTransactions"]
            repo.update_refunds_config(**kwargs)
            return {"success": True}

    # === Pending Count ===

    async def get_pending_count(self) -> dict[str, Any]:
        """Get count of unmatched transactions across all saved views.

        Returns total count and per-view counts. Only counts expense
        (negative amount) transactions to match the UI tally logic.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            views = repo.get_refunds_views()
            if not views:
                return {"count": 0, "viewCounts": {}}

            # Parse view filters
            view_filters = _parse_view_filters(views)
            all_tag_ids: set[str] = set()
            for _, tag_ids, _ in view_filters:
                all_tag_ids.update(tag_ids)

            if not all_tag_ids:
                return {"count": 0, "viewCounts": {}}

            matched_ids = {m.original_transaction_id for m in repo.get_refunds_matches()}

        # Fetch all tagged transactions from Monarch in one call.
        # Only pass tag_ids (not category_ids) — category filtering is
        # applied per-view by _txn_matches_view to avoid Monarch ANDing
        # tags with categories and missing transactions from views
        # that have no category restriction.
        mm = await get_mm()
        transactions = await get_transactions_with_icons(
            mm,
            tag_ids=list(all_tag_ids),
        )

        # Only count expenses (negative amount), matching the UI tally logic
        unmatched_expenses = [
            t for t in transactions if t.get("amount", 0) < 0 and t["id"] not in matched_ids
        ]

        return _compute_view_counts(view_filters, unmatched_expenses)

    # === Tags ===

    async def get_tags(self) -> list[dict[str, Any]]:
        """Get all Monarch transaction tags."""
        mm = await get_mm()
        tags = await get_transaction_tags(mm)
        return tags

    # === Saved Views ===

    async def get_views(self) -> list[dict[str, Any]]:
        """Get all saved views."""
        with db_session() as session:
            repo = TrackerRepository(session)
            views = repo.get_refunds_views()
            return [
                {
                    "id": v.id,
                    "name": v.name,
                    "tagIds": json.loads(v.tag_ids),
                    "categoryIds": json.loads(v.category_ids) if v.category_ids else None,
                    "sortOrder": v.sort_order,
                }
                for v in views
            ]

    async def create_view(
        self,
        name: str,
        tag_ids: list[str],
        category_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        """Create a new saved view."""
        with db_session() as session:
            repo = TrackerRepository(session)
            view = repo.create_refunds_view(
                name=name,
                tag_ids=json.dumps(tag_ids),
                category_ids=json.dumps(category_ids) if category_ids else None,
            )
            return {
                "id": view.id,
                "name": view.name,
                "tagIds": tag_ids,
                "categoryIds": category_ids,
                "sortOrder": view.sort_order,
            }

    async def update_view(self, view_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        """Update a saved view."""
        with db_session() as session:
            repo = TrackerRepository(session)
            kwargs: dict[str, Any] = {}
            if "name" in updates:
                kwargs["name"] = updates["name"]
            if "tagIds" in updates:
                kwargs["tag_ids"] = json.dumps(updates["tagIds"])
            if "categoryIds" in updates:
                cat_ids = updates["categoryIds"]
                kwargs["category_ids"] = json.dumps(cat_ids) if cat_ids else None
            if "sortOrder" in updates:
                kwargs["sort_order"] = updates["sortOrder"]

            view = repo.update_refunds_view(view_id, **kwargs)
            if not view:
                return {"success": False, "error": "View not found"}
            return {"success": True}

    async def delete_view(self, view_id: str) -> dict[str, Any]:
        """Delete a saved view."""
        with db_session() as session:
            repo = TrackerRepository(session)
            deleted = repo.delete_refunds_view(view_id)
            return {"success": deleted}

    async def reorder_views(self, view_ids: list[str]) -> dict[str, Any]:
        """Reorder saved views."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.reorder_refunds_views(view_ids)
            return {"success": True}

    # === Transactions ===

    async def get_transactions(
        self,
        tag_ids: list[str] | None = None,
        category_ids: list[str] | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch transactions filtered by tags, categories, and date range."""
        mm = await get_mm()
        transactions = await get_transactions_with_icons(
            mm,
            tag_ids=tag_ids,
            category_ids=category_ids,
            start_date=start_date,
            end_date=end_date,
        )
        return transactions

    async def search_for_refund(
        self,
        search: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        limit: int = 50,
        cursor: int = 0,
    ) -> dict[str, Any]:
        """Search transactions for potential refund matches (credits only).

        Returns dict with 'transactions' (list) and 'nextCursor' (int or None).
        The cursor is the raw Monarch API offset, not the count of credits.
        """
        mm = await get_mm()
        transactions = await search_transactions_with_icons(
            mm,
            search=search,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=cursor,
            credits_only=True,
        )
        exhausted = len(transactions) < limit
        return {
            "transactions": transactions,
            "nextCursor": None if exhausted else cursor + limit,
        }

    # === Matches ===

    async def get_matches(self) -> list[dict[str, Any]]:
        """Get all refund matches."""
        with db_session() as session:
            repo = TrackerRepository(session)
            matches = repo.get_refunds_matches()
            return [
                {
                    "id": m.id,
                    "originalTransactionId": m.original_transaction_id,
                    "refundTransactionId": m.refund_transaction_id,
                    "refundAmount": m.refund_amount,
                    "refundMerchant": m.refund_merchant,
                    "refundDate": m.refund_date,
                    "refundAccount": m.refund_account,
                    "skipped": m.skipped,
                    "expectedRefund": m.expected_refund,
                    "expectedDate": m.expected_date,
                    "expectedAccount": m.expected_account,
                    "expectedAccountId": m.expected_account_id,
                    "expectedNote": m.expected_note,
                    "expectedAmount": m.expected_amount,
                    "transactionData": (
                        json.loads(m.transaction_data) if m.transaction_data else None
                    ),
                }
                for m in matches
            ]

    async def create_match(
        self,
        original_transaction_id: str,
        refund_transaction_id: str | None = None,
        refund_amount: float | None = None,
        refund_merchant: str | None = None,
        refund_date: str | None = None,
        refund_account: str | None = None,
        skipped: bool = False,
        expected_refund: bool = False,
        expected_date: str | None = None,
        expected_account: str | None = None,
        expected_account_id: str | None = None,
        expected_note: str | None = None,
        expected_amount: float | None = None,
        replace_tag: bool = False,
        original_tag_ids: list[str] | None = None,
        original_notes: str | None = None,
        view_tag_ids: list[str] | None = None,
        transaction_data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Create a refund match or expected refund.

        Stores match in local DB, updates Monarch transaction notes,
        and optionally replaces tags (not for expected refunds).
        """
        # Store match in local DB
        with db_session() as session:
            repo = TrackerRepository(session)

            # Check for existing match
            existing = repo.get_refunds_match_by_original(original_transaction_id)
            if existing:
                return {"success": False, "error": "Transaction already matched"}

            repo.create_refunds_match(
                original_transaction_id=original_transaction_id,
                refund_transaction_id=refund_transaction_id,
                refund_amount=refund_amount,
                refund_merchant=refund_merchant,
                refund_date=refund_date,
                refund_account=refund_account,
                skipped=skipped,
                expected_refund=expected_refund,
                expected_date=expected_date,
                expected_account=expected_account,
                expected_account_id=expected_account_id,
                expected_note=expected_note,
                expected_amount=expected_amount,
                transaction_data=json.dumps(transaction_data) if transaction_data else None,
            )

        # Update Monarch transaction notes for expected refunds
        if expected_refund and expected_amount is not None:
            try:
                mm = await get_mm()
                note_line = _build_expected_refund_note(
                    expected_amount, expected_date, expected_account, expected_note
                )
                # Strip any previous Eclosion blocks and decode HTML entities
                base_notes = _prepare_original_notes(original_notes)
                new_notes = f"{base_notes}\n\n{note_line}" if base_notes else note_line
                await update_transaction_notes(mm, original_transaction_id, new_notes)
            except Exception:
                logger.exception("Failed to update transaction notes in Monarch")

        # Update Monarch transaction notes (if not skipped and not expected)
        elif not skipped and not expected_refund and refund_amount is not None:
            try:
                mm = await get_mm()
                note_line = _build_refund_note(
                    refund_amount, refund_merchant, refund_date, refund_account
                )
                # Strip any previous Eclosion blocks and decode HTML entities
                base_notes = _prepare_original_notes(original_notes)
                new_notes = f"{base_notes}\n\n{note_line}" if base_notes else note_line
                await update_transaction_notes(mm, original_transaction_id, new_notes)
            except Exception:
                logger.exception("Failed to update transaction notes in Monarch")

        # Replace or remove tags if configured (not for expected refunds)
        if replace_tag and not expected_refund and original_tag_ids is not None:
            try:
                mm = await get_mm()
                config = await self.get_config()
                replacement_tag_id = config.get("replacementTagId")

                # Remove only the active view's tags (preserving other views' tags),
                # or fall back to removing all original tags if view_tag_ids not provided
                tags_to_remove = set(view_tag_ids) if view_tag_ids else set(original_tag_ids)
                new_tag_ids = [tid for tid in original_tag_ids if tid not in tags_to_remove]

                # Add replacement tag if configured and not already present
                if replacement_tag_id and replacement_tag_id not in new_tag_ids:
                    new_tag_ids.append(replacement_tag_id)

                await set_transaction_tags(mm, original_transaction_id, new_tag_ids)
            except Exception:
                logger.exception("Failed to update transaction tags in Monarch")

        return {"success": True}

    async def delete_match(self, match_id: str) -> dict[str, Any]:
        """Delete a refund match or expected refund, restoring original tags/notes."""
        with db_session() as session:
            repo = TrackerRepository(session)
            matches = repo.get_refunds_matches()
            match = next((m for m in matches if m.id == match_id), None)
            if not match:
                return {"success": False, "error": "Match not found"}

            is_expected = match.expected_refund
            is_skipped = match.skipped

            # Restore original tags from snapshot before deleting (not for expected refunds)
            original_tag_ids: list[str] | None = None
            original_transaction_id = match.original_transaction_id
            if not is_expected and match.transaction_data:
                try:
                    snapshot = json.loads(match.transaction_data)
                    tags = snapshot.get("tags", [])
                    original_tag_ids = [t["id"] for t in tags if "id" in t]
                except (json.JSONDecodeError, TypeError):
                    pass

            # Track whether we added notes (expected or matched, not skipped)
            should_strip_notes = not is_skipped

            deleted = repo.delete_refunds_match(match_id)

        if not deleted:
            return {"success": False}

        mm = await get_mm()

        # Strip Eclosion note blocks from Monarch transaction (best-effort)
        if should_strip_notes:
            try:
                current_notes = await get_transaction_notes(mm, original_transaction_id)
                if current_notes and _BLOCK_PATTERN.search(current_notes):
                    cleaned = _strip_refund_notes(_decode_html(current_notes))
                    await update_transaction_notes(mm, original_transaction_id, cleaned)
            except Exception:
                logger.exception("Failed to strip refund notes from Monarch transaction")

        # Restore tags in Monarch (best-effort, after DB commit)
        if original_tag_ids is not None:
            try:
                await set_transaction_tags(mm, original_transaction_id, original_tag_ids)
            except Exception:
                logger.exception("Failed to restore transaction tags in Monarch")

        return {"success": True}


def _parse_view_filters(
    views: list[Any],
) -> list[tuple[str, list[str], list[str] | None]]:
    """Parse saved views into (view_id, tag_ids, category_ids) tuples."""
    return [
        (
            v.id,
            json.loads(v.tag_ids),
            json.loads(v.category_ids) if v.category_ids else None,
        )
        for v in views
    ]


def _txn_matches_view(
    txn: dict[str, Any],
    tag_set: set[str],
    cat_set: set[str] | None,
) -> bool:
    """Check whether a transaction belongs to a view's tag/category filters."""
    txn_tags = {t["id"] for t in txn.get("tags", [])}
    tags_match = bool(tag_set) and bool(tag_set & txn_tags)
    if not tags_match and cat_set is None:
        return False
    cat_id = (txn.get("category") or {}).get("id")
    cats_match = cat_set is not None and cat_id is not None and cat_id in cat_set
    if not tags_match and not cats_match:
        return False
    return not (cat_set is not None and not cats_match)


def _compute_view_counts(
    view_filters: list[tuple[str, list[str], list[str] | None]],
    unmatched_expenses: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compute per-view and global unmatched counts."""
    view_counts: dict[str, int] = {}
    global_unmatched_ids: set[str] = set()
    for view_id, tag_ids, cat_ids in view_filters:
        tag_set = set(tag_ids)
        cat_set = set(cat_ids) if cat_ids else None
        count = 0
        for txn in unmatched_expenses:
            if _txn_matches_view(txn, tag_set, cat_set):
                count += 1
                global_unmatched_ids.add(txn["id"])
        view_counts[view_id] = count
    return {"count": len(global_unmatched_ids), "viewCounts": view_counts}


# ── Note block markers ──
# These wrap notes we append to Monarch transactions so they can be
# cleanly identified and stripped later (e.g. on unmatch / clear expected).
_MATCHED_MARKER = "── Refund Matched ──"
_EXPECTED_MARKER = "── Expected Refund ──"
_BLOCK_END = "──────────"

# Regex that matches any Eclosion refund note block (matched or expected).
# Handles blocks at start, middle, or end of notes, with optional
# surrounding newlines.
_BLOCK_PATTERN = re.compile(
    r"\n?── (?:Refund Matched|Expected Refund) ──\n.*?──────────\n?",
    re.DOTALL,
)


def _decode_html(text: str) -> str:
    """Decode HTML entities in text from the Monarch API."""
    return html.unescape(text)


def _strip_refund_notes(notes: str) -> str:
    """Strip all Eclosion refund note blocks from a notes string.

    Removes matched/expected refund blocks and cleans up extra whitespace.
    """
    cleaned = _BLOCK_PATTERN.sub("", notes)
    # Collapse multiple blank lines into one, strip leading/trailing whitespace
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _build_refund_note(
    amount: float | None,
    merchant: str | None,
    date: str | None,
    account: str | None,
) -> str:
    """Build a wrapped note block for a matched refund."""
    parts: list[str] = []
    if amount is not None:
        parts.append(f"${abs(amount):.2f}")
    if merchant:
        parts.append(f'from "{_decode_html(merchant)}"')
    if date:
        try:
            dt = datetime.strptime(date, "%Y-%m-%d")
            parts.append(f"on {dt.strftime('%-m/%-d/%Y')}")
        except ValueError:
            parts.append(f"on {date}")
    if account:
        parts.append(f"via {_decode_html(account)}")
    body = " ".join(parts)
    return f"{_MATCHED_MARKER}\n{body}\n{_BLOCK_END}"


def _build_expected_refund_note(
    amount: float | None,
    date: str | None,
    account: str | None,
    note: str | None,
) -> str:
    """Build a wrapped note block for an expected refund."""
    parts: list[str] = []
    if amount is not None:
        parts.append(f"${abs(amount):.2f}")
    if date:
        try:
            dt = datetime.strptime(date, "%Y-%m-%d")
            parts.append(f"expected by {dt.strftime('%-m/%-d/%Y')}")
        except ValueError:
            parts.append(f"expected by {date}")
    if account:
        parts.append(f"to {_decode_html(account)}")
    body = " ".join(parts)
    if note:
        body += f"\n{note}"
    return f"{_EXPECTED_MARKER}\n{body}\n{_BLOCK_END}"


def _prepare_original_notes(original_notes: str | None) -> str:
    """Clean original notes: strip existing Eclosion blocks and decode HTML entities."""
    if not original_notes:
        return ""
    return _strip_refund_notes(_decode_html(original_notes))
