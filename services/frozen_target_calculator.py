"""
Frozen Target Calculator

Manages frozen monthly savings targets that don't change mid-month.
Eliminates duplicated calculation logic between dashboard and rollup data.

The frozen target is calculated at the start of each month and stays fixed
to prevent confusing fluctuations as category balances change throughout the month.

Balance Model:
- Starting Balance = previousMonthRolloverAmount (what rolled over from last month)
- Progress = Starting Balance + Budgeted This Month
- Target is calculated based on starting balance, not current balance

Rounding Policy:
- Monthly targets use round() instead of ceil() to minimize overbudgeting
- Minimum $1/mo for any non-zero rate (prevents showing $0 for small expenses)
- Uses round-half-up for consistency (not banker's rounding)
- Self-corrects: if slightly behind, rate increases as due date approaches
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


def round_monthly_rate(rate: float) -> int:
    """
    Round to nearest dollar, minimum $1 for non-zero rates.

    Uses round-half-up (not banker's rounding) for consistency.
    Returns 0 for zero/negative rates (fully funded).

    This minimizes overbudgeting compared to ceil() while ensuring:
    - Small expenses ($5/year) still show at least $1/mo
    - The system self-corrects via monthly recalculation
    """
    if rate <= 0:
        return 0
    return max(1, int(rate + 0.5))


class StateManagerProtocol(Protocol):
    """Protocol for state manager dependency injection."""

    def get_frozen_target(self, recurring_id: str) -> dict | None: ...
    def set_frozen_target(
        self,
        recurring_id: str,
        frozen_target: float,
        target_month: str,
        balance_at_start: float,
        amount: float,
        frequency_months: float,
        rollover_amount: float | None = None,
        next_due_date: str | None = None,
    ) -> None: ...


@dataclass
class FrozenTargetResult:
    """Result of frozen target calculation."""

    frozen_target: float
    balance_at_start: float  # The rollover amount (what we started with)
    contributed_this_month: float  # What was budgeted this month
    monthly_progress_percent: float
    was_recalculated: bool


def calculate_frozen_target(
    *,
    recurring_id: str,
    amount: float,
    frequency_months: float,
    months_until_due: float,
    rollover_amount: float,
    budgeted_this_month: float,
    next_due_date: str | None,
    state_manager: StateManagerProtocol,
    current_month: str | None = None,
) -> FrozenTargetResult:
    """
    Calculate or retrieve the frozen monthly target for a recurring item.

    The frozen target is locked at the start of each month to prevent
    mid-month fluctuations. It's recalculated when:
    - It's a new month
    - The subscription amount changes
    - The frequency changes
    - The rollover amount changes (e.g., user edited prior months)
    - The due date changes

    Args:
        recurring_id: Unique identifier for the item (may include prefix like "rollup_")
        amount: Total subscription amount
        frequency_months: How many months between charges
        months_until_due: Months remaining until next payment
        rollover_amount: Amount that rolled over from previous month (starting balance)
        budgeted_this_month: Amount budgeted this month
        next_due_date: Next due date string (for change detection)
        state_manager: State manager for persistence
        current_month: Current month string (YYYY-MM), defaults to now

    Returns:
        FrozenTargetResult with target and progress data
    """
    if current_month is None:
        current_month = datetime.now().strftime("%Y-%m")

    stored_target = state_manager.get_frozen_target(recurring_id)

    needs_recalc = (
        stored_target is None
        or stored_target.get("target_month") != current_month
        or stored_target.get("frozen_amount") != amount
        or stored_target.get("frozen_frequency_months") != frequency_months
        or stored_target.get("frozen_rollover_amount") != rollover_amount
        or stored_target.get("frozen_next_due_date") != next_due_date
    )

    if needs_recalc:
        # New month or inputs changed - calculate and freeze
        frozen_target = _calculate_target(
            amount=amount,
            frequency_months=frequency_months,
            months_until_due=months_until_due,
            starting_balance=rollover_amount,
        )

        state_manager.set_frozen_target(
            recurring_id=recurring_id,
            frozen_target=frozen_target,
            target_month=current_month,
            balance_at_start=rollover_amount,
            amount=amount,
            frequency_months=frequency_months,
            rollover_amount=rollover_amount,
            next_due_date=next_due_date,
        )
        balance_at_start = rollover_amount
        was_recalculated = True
    else:
        # stored_target is guaranteed non-None here since needs_recalc is False
        assert stored_target is not None
        frozen_target = stored_target["frozen_monthly_target"]
        balance_at_start = stored_target.get("frozen_rollover_amount") or 0
        was_recalculated = False

    # Calculate monthly progress
    # Progress = what we've put towards the target this month (the budget amount)
    contributed_this_month = max(0, budgeted_this_month)
    monthly_progress_percent = (
        (contributed_this_month / frozen_target * 100) if frozen_target > 0 else 100
    )

    return FrozenTargetResult(
        frozen_target=frozen_target,
        balance_at_start=balance_at_start,
        contributed_this_month=contributed_this_month,
        monthly_progress_percent=monthly_progress_percent,
        was_recalculated=was_recalculated,
    )


def _calculate_target(
    *,
    amount: float,
    frequency_months: float,
    months_until_due: float,
    starting_balance: float,
) -> float:
    """
    Calculate the monthly savings target based on subscription frequency.

    For sub-monthly (weekly, bi-weekly):
        Target is the monthly equivalent minus what you have.
        Monthly equivalent = amount / frequency_months
        Example: $78/week → $78/0.25 = $312/month

    For monthly:
        Target is the shortfall (what's still needed).

    For infrequent (quarterly, yearly):
        Shortfall is spread across months remaining until due.

    Uses round() instead of ceil() to minimize overbudgeting.
    The system self-corrects via monthly recalculation.
    """
    if frequency_months < 1:
        # Sub-monthly (weekly, bi-weekly): use monthly equivalent
        # $78/week → $312/month
        monthly_equivalent = amount / frequency_months
        return round_monthly_rate(max(0, monthly_equivalent - starting_balance))
    elif frequency_months == 1:
        # Monthly items: target is the shortfall (what's still needed)
        return round_monthly_rate(max(0, amount - starting_balance))
    else:
        # Infrequent subscriptions - calculate catch-up rate
        shortfall = max(0, amount - starting_balance)
        months_remaining = max(1, months_until_due)
        if shortfall > 0:
            return round_monthly_rate(shortfall / months_remaining)
        return 0


def calculate_rate_after_catchup(
    frozen_target: float,
    ideal_monthly_rate: float,
) -> float:
    """
    Calculate what the rate will be after catching-up items finish.

    Catching up items (frozen > ideal): will drop to ideal after payment.
    Non-catching up items: stay at their current frozen rate.
    """
    if frozen_target > ideal_monthly_rate:
        return ideal_monthly_rate
    return frozen_target
