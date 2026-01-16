"""
Tests for the Frozen Target Calculator service.

Tests cover:
- Frozen target calculation and caching
- Monthly vs infrequent subscription handling
- Progress percentage calculations (based on budgeted amount)
- State persistence interactions
- Rate after catch-up calculations
"""

from dataclasses import dataclass
from datetime import datetime

from services.frozen_target_calculator import (
    calculate_frozen_target,
    calculate_rate_after_catchup,
)


@dataclass
class MockStateManager:
    """Mock state manager for testing."""

    frozen_targets: dict

    def __init__(self):
        self.frozen_targets = {}

    def get_frozen_target(self, recurring_id: str) -> dict | None:
        return self.frozen_targets.get(recurring_id)

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
    ) -> None:
        self.frozen_targets[recurring_id] = {
            "frozen_monthly_target": frozen_target,
            "target_month": target_month,
            "balance_at_month_start": balance_at_start,
            "frozen_amount": amount,
            "frozen_frequency_months": frequency_months,
            "frozen_rollover_amount": rollover_amount,
            "frozen_next_due_date": next_due_date,
        }


class TestFrozenTargetCalculationMonthly:
    """Tests for monthly subscription frozen targets."""

    def test_monthly_subscription_new_calculation(self) -> None:
        """Monthly subscription should calculate shortfall as target."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-monthly",
            amount=80.0,
            frequency_months=1,
            months_until_due=1,
            rollover_amount=30.0,  # Starting balance
            budgeted_this_month=0.0,
            next_due_date="2025-02-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Monthly: target is shortfall = ceil(80 - 30) = 50
        assert result.frozen_target == 50
        assert result.was_recalculated is True
        assert result.balance_at_start == 30.0

    def test_monthly_subscription_fully_funded(self) -> None:
        """Fully funded monthly subscription should have zero target."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-monthly-funded",
            amount=80.0,
            frequency_months=1,
            months_until_due=1,
            rollover_amount=80.0,  # Fully funded at start of month
            budgeted_this_month=0.0,
            next_due_date="2025-02-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Fully funded: target is 0
        assert result.frozen_target == 0
        assert result.was_recalculated is True

    def test_monthly_subscription_overfunded(self) -> None:
        """Overfunded monthly subscription should have zero target."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-monthly-over",
            amount=80.0,
            frequency_months=1,
            months_until_due=1,
            rollover_amount=100.0,  # Overfunded
            budgeted_this_month=0.0,
            next_due_date="2025-02-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Overfunded: target is max(0, ...) = 0
        assert result.frozen_target == 0


class TestFrozenTargetCalculationInfrequent:
    """Tests for infrequent (quarterly, yearly) subscription frozen targets."""

    def test_yearly_subscription_new(self) -> None:
        """New yearly subscription should spread shortfall over months."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-yearly",
            amount=600.0,
            frequency_months=12,
            months_until_due=12,
            rollover_amount=0.0,  # Nothing saved yet
            budgeted_this_month=0.0,
            next_due_date="2026-01-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Yearly new: shortfall = 600, months = 12, target = ceil(600/12) = 50
        assert result.frozen_target == 50
        assert result.was_recalculated is True

    def test_yearly_subscription_catching_up(self) -> None:
        """Behind-schedule yearly should have higher catch-up target."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-yearly-catch",
            amount=600.0,
            frequency_months=12,
            months_until_due=3,  # Only 3 months left
            rollover_amount=300.0,  # Only half saved at start
            budgeted_this_month=0.0,
            next_due_date="2025-04-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Catch-up: shortfall = 300, months = 3, target = ceil(300/3) = 100
        assert result.frozen_target == 100

    def test_yearly_subscription_fully_funded(self) -> None:
        """Fully funded yearly subscription should have zero target."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-yearly-funded",
            amount=600.0,
            frequency_months=12,
            months_until_due=3,
            rollover_amount=600.0,  # Fully funded
            budgeted_this_month=0.0,
            next_due_date="2025-04-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Fully funded: shortfall = 0, target = 0
        assert result.frozen_target == 0

    def test_quarterly_subscription(self) -> None:
        """Quarterly subscription should calculate correctly."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-quarterly",
            amount=90.0,
            frequency_months=3,
            months_until_due=3,
            rollover_amount=0.0,
            budgeted_this_month=0.0,
            next_due_date="2025-04-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Quarterly: shortfall = 90, months = 3, target = ceil(90/3) = 30
        assert result.frozen_target == 30


class TestFrozenTargetCaching:
    """Tests for frozen target caching behavior."""

    def test_uses_cached_target_same_month(self) -> None:
        """Should use cached target within the same month."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        # Pre-populate cache
        state_manager.frozen_targets["test-cached"] = {
            "frozen_monthly_target": 42.0,
            "target_month": current_month,
            "balance_at_month_start": 10.0,
            "frozen_amount": 100.0,
            "frozen_frequency_months": 12,
            "frozen_rollover_amount": 10.0,
            "frozen_next_due_date": "2025-07-15",
        }

        result = calculate_frozen_target(
            recurring_id="test-cached",
            amount=100.0,
            frequency_months=12,
            months_until_due=6,
            rollover_amount=10.0,  # Same rollover
            budgeted_this_month=40.0,  # Budget changed but target should not
            next_due_date="2025-07-15",  # Same due date
            state_manager=state_manager,
            current_month=current_month,
        )

        # Should use cached value, not recalculate
        assert result.frozen_target == 42.0
        assert result.was_recalculated is False
        assert result.balance_at_start == 10.0

    def test_recalculates_on_new_month(self) -> None:
        """Should recalculate target when month changes."""
        state_manager = MockStateManager()

        # Cache from previous month
        state_manager.frozen_targets["test-new-month"] = {
            "frozen_monthly_target": 42.0,
            "target_month": "2024-01",  # Old month
            "balance_at_month_start": 10.0,
            "frozen_amount": 100.0,
            "frozen_frequency_months": 12,
            "frozen_rollover_amount": 10.0,
            "frozen_next_due_date": "2024-07-15",
        }

        result = calculate_frozen_target(
            recurring_id="test-new-month",
            amount=100.0,
            frequency_months=12,
            months_until_due=6,
            rollover_amount=50.0,  # New month's rollover
            budgeted_this_month=0.0,
            next_due_date="2024-07-15",
            state_manager=state_manager,
            current_month="2024-02",  # New month
        )

        # Should recalculate
        assert result.was_recalculated is True
        # Shortfall = 50, months = 6, target = round(50/6) = 8
        assert result.frozen_target == 8

    def test_recalculates_on_amount_change(self) -> None:
        """Should recalculate target when subscription amount changes."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        # Cache with old amount
        state_manager.frozen_targets["test-amount-change"] = {
            "frozen_monthly_target": 42.0,
            "target_month": current_month,
            "balance_at_month_start": 10.0,
            "frozen_amount": 100.0,  # Old amount
            "frozen_frequency_months": 12,
            "frozen_rollover_amount": 50.0,
            "frozen_next_due_date": "2025-07-15",
        }

        result = calculate_frozen_target(
            recurring_id="test-amount-change",
            amount=200.0,  # Amount changed!
            frequency_months=12,
            months_until_due=6,
            rollover_amount=50.0,
            budgeted_this_month=0.0,
            next_due_date="2025-07-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Should recalculate due to amount change
        assert result.was_recalculated is True
        # Shortfall = 150, months = 6, target = ceil(150/6) = 25
        assert result.frozen_target == 25

    def test_recalculates_on_frequency_change(self) -> None:
        """Should recalculate target when frequency changes."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        # Cache with old frequency
        state_manager.frozen_targets["test-freq-change"] = {
            "frozen_monthly_target": 42.0,
            "target_month": current_month,
            "balance_at_month_start": 10.0,
            "frozen_amount": 120.0,
            "frozen_frequency_months": 12,  # Was yearly
            "frozen_rollover_amount": 0.0,
            "frozen_next_due_date": "2025-12-15",
        }

        result = calculate_frozen_target(
            recurring_id="test-freq-change",
            amount=120.0,
            frequency_months=3,  # Now quarterly
            months_until_due=3,
            rollover_amount=0.0,
            budgeted_this_month=0.0,
            next_due_date="2025-04-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Should recalculate due to frequency change
        assert result.was_recalculated is True
        # Shortfall = 120, months = 3, target = ceil(120/3) = 40
        assert result.frozen_target == 40

    def test_recalculates_on_rollover_change(self) -> None:
        """Should recalculate target when rollover amount changes."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        # Cache with old rollover
        state_manager.frozen_targets["test-rollover-change"] = {
            "frozen_monthly_target": 50.0,
            "target_month": current_month,
            "balance_at_month_start": 100.0,
            "frozen_amount": 600.0,
            "frozen_frequency_months": 12,
            "frozen_rollover_amount": 100.0,  # Old rollover
            "frozen_next_due_date": "2025-12-15",
        }

        result = calculate_frozen_target(
            recurring_id="test-rollover-change",
            amount=600.0,
            frequency_months=12,
            months_until_due=10,
            rollover_amount=200.0,  # Rollover changed (e.g., user edited prior months)
            budgeted_this_month=0.0,
            next_due_date="2025-12-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Should recalculate due to rollover change
        assert result.was_recalculated is True
        # Shortfall = 400, months = 10, target = ceil(400/10) = 40
        assert result.frozen_target == 40

    def test_recalculates_on_due_date_change(self) -> None:
        """Should recalculate target when due date changes."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        # Cache with old due date
        state_manager.frozen_targets["test-due-date-change"] = {
            "frozen_monthly_target": 50.0,
            "target_month": current_month,
            "balance_at_month_start": 100.0,
            "frozen_amount": 600.0,
            "frozen_frequency_months": 12,
            "frozen_rollover_amount": 100.0,
            "frozen_next_due_date": "2025-12-15",  # Old due date
        }

        result = calculate_frozen_target(
            recurring_id="test-due-date-change",
            amount=600.0,
            frequency_months=12,
            months_until_due=6,  # Due date moved closer
            rollover_amount=100.0,
            budgeted_this_month=0.0,
            next_due_date="2025-07-15",  # Due date changed!
            state_manager=state_manager,
            current_month=current_month,
        )

        # Should recalculate due to due date change
        assert result.was_recalculated is True
        # Shortfall = 500, months = 6, target = round(500/6) = 83
        assert result.frozen_target == 83


class TestMonthlyProgressCalculation:
    """Tests for monthly progress percentage calculations."""

    def test_progress_based_on_budgeted(self) -> None:
        """Progress should be based on what was budgeted this month."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-progress",
            amount=100.0,
            frequency_months=12,
            months_until_due=10,
            rollover_amount=25.0,
            budgeted_this_month=5.0,  # Budgeted $5 this month
            next_due_date="2025-11-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Target = ceil(75/10) = 8, contributed = 5, progress = 5/8*100 = 62.5%
        assert result.contributed_this_month == 5.0
        assert result.monthly_progress_percent == 62.5

    def test_progress_zero_budgeted(self) -> None:
        """Progress should be 0 when nothing budgeted this month."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-progress-zero",
            amount=100.0,
            frequency_months=12,
            months_until_due=10,
            rollover_amount=25.0,
            budgeted_this_month=0.0,  # Nothing budgeted
            next_due_date="2025-11-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Target = ceil(75/10) = 8, contributed = 0, progress = 0%
        assert result.contributed_this_month == 0
        assert result.monthly_progress_percent == 0

    def test_progress_complete(self) -> None:
        """Progress should show 100% when target is met."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        # Pre-populate cache to test cached path
        state_manager.frozen_targets["test-progress-complete"] = {
            "frozen_monthly_target": 50.0,
            "target_month": current_month,
            "balance_at_month_start": 100.0,
            "frozen_amount": 600.0,
            "frozen_frequency_months": 12,
            "frozen_rollover_amount": 100.0,
            "frozen_next_due_date": "2025-11-15",
        }

        result = calculate_frozen_target(
            recurring_id="test-progress-complete",
            amount=600.0,
            frequency_months=12,
            months_until_due=10,
            rollover_amount=100.0,  # Same as cached
            budgeted_this_month=50.0,  # Budgeted full target
            next_due_date="2025-11-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Contributed = 50, target = 50, progress = 100%
        assert result.contributed_this_month == 50.0
        assert result.monthly_progress_percent == 100.0

    def test_progress_over_target(self) -> None:
        """Progress should exceed 100% when budgeted more than target."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        # Pre-populate cache
        state_manager.frozen_targets["test-progress-over"] = {
            "frozen_monthly_target": 50.0,
            "target_month": current_month,
            "balance_at_month_start": 100.0,
            "frozen_amount": 600.0,
            "frozen_frequency_months": 12,
            "frozen_rollover_amount": 100.0,
            "frozen_next_due_date": "2025-11-15",
        }

        result = calculate_frozen_target(
            recurring_id="test-progress-over",
            amount=600.0,
            frequency_months=12,
            months_until_due=10,
            rollover_amount=100.0,
            budgeted_this_month=75.0,  # Budgeted more than target
            next_due_date="2025-11-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Contributed = 75, target = 50, progress = 150%
        assert result.contributed_this_month == 75.0
        assert result.monthly_progress_percent == 150.0

    def test_progress_zero_target(self) -> None:
        """Progress should be 100% when target is zero (fully funded)."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-progress-funded",
            amount=600.0,
            frequency_months=12,
            months_until_due=10,
            rollover_amount=600.0,  # Fully funded at start
            budgeted_this_month=0.0,
            next_due_date="2025-11-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Target = 0, progress should be 100%
        assert result.frozen_target == 0
        assert result.monthly_progress_percent == 100.0


class TestRateAfterCatchup:
    """Tests for rate after catch-up calculation."""

    def test_catching_up_returns_ideal(self) -> None:
        """Catching up items should return ideal rate after payment."""
        result = calculate_rate_after_catchup(
            frozen_target=100.0,  # Higher than ideal
            ideal_monthly_rate=50.0,
        )

        # Will drop to ideal rate after catching up
        assert result == 50.0

    def test_not_catching_up_returns_frozen(self) -> None:
        """Non-catching up items should stay at frozen rate."""
        result = calculate_rate_after_catchup(
            frozen_target=50.0,  # Same as ideal
            ideal_monthly_rate=50.0,
        )

        assert result == 50.0

    def test_ahead_of_schedule_returns_frozen(self) -> None:
        """Ahead of schedule items should stay at lower frozen rate."""
        result = calculate_rate_after_catchup(
            frozen_target=25.0,  # Lower than ideal
            ideal_monthly_rate=50.0,
        )

        # Stays at frozen rate (not catching up)
        assert result == 25.0

    def test_zero_rates(self) -> None:
        """Zero rates should be handled correctly."""
        result = calculate_rate_after_catchup(
            frozen_target=0.0,
            ideal_monthly_rate=0.0,
        )

        assert result == 0.0


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_zero_months_until_due(self) -> None:
        """Should handle zero months until due (due now)."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-due-now",
            amount=100.0,
            frequency_months=12,
            months_until_due=0,  # Due now
            rollover_amount=50.0,
            budgeted_this_month=0.0,
            next_due_date="2025-01-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Due now: shortfall = 50, months = max(1, 0) = 1, target = 50
        assert result.frozen_target == 50

    def test_negative_rollover(self) -> None:
        """Should handle negative rollover (shouldn't happen but be safe)."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-negative",
            amount=100.0,
            frequency_months=12,
            months_until_due=10,
            rollover_amount=-10.0,  # Negative rollover
            budgeted_this_month=0.0,
            next_due_date="2025-11-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Shortfall = 100 - (-10) = 110
        # target = ceil(110/10) = 11
        assert result.frozen_target == 11

    def test_very_small_amounts(self) -> None:
        """Should handle very small amounts with proper rounding."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-small",
            amount=1.0,
            frequency_months=12,
            months_until_due=12,
            rollover_amount=0.0,
            budgeted_this_month=0.0,
            next_due_date="2026-01-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Shortfall = 1, months = 12, target = ceil(1/12) = 1
        assert result.frozen_target == 1

    def test_large_amounts(self) -> None:
        """Should handle large amounts correctly."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-large",
            amount=10000.0,
            frequency_months=12,
            months_until_due=12,
            rollover_amount=0.0,
            budgeted_this_month=0.0,
            next_due_date="2026-01-15",
            state_manager=state_manager,
            current_month=current_month,
        )

        # Shortfall = 10000, months = 12, target = round(10000/12) = 833
        assert result.frozen_target == 833


class TestDefaultCurrentMonth:
    """Tests for default current month behavior."""

    def test_uses_current_month_when_not_specified(self) -> None:
        """Should use current month when not explicitly provided."""
        state_manager = MockStateManager()

        calculate_frozen_target(
            recurring_id="test-default-month",
            amount=100.0,
            frequency_months=12,
            months_until_due=6,
            rollover_amount=50.0,
            budgeted_this_month=0.0,
            next_due_date="2025-07-15",
            state_manager=state_manager,
            # current_month not specified
        )

        # Should use current month and persist it (result not needed, checking side effect)
        expected_month = datetime.now().strftime("%Y-%m")
        stored = state_manager.frozen_targets.get("test-default-month")
        assert stored is not None
        assert stored["target_month"] == expected_month
