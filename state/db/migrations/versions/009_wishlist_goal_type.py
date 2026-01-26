"""Add goal_type and completion tracking to wishlist_items.

Replaces subtract_spending boolean with goal_type enum ('one_time' or 'savings_buffer').
Adds completion tracking for one-time purchases and tracking start date for aggregate queries.

Revision ID: 009
Revises: 008
Create Date: 2025-01-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "009"
down_revision: str | None = "008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add goal_type column (default: 'one_time' for existing items)
    # - 'one_time': Save up to buy something, mark complete when done
    # - 'savings_buffer': Ongoing fund that can be spent and refilled
    op.add_column(
        "wishlist_items",
        sa.Column("goal_type", sa.String(20), nullable=False, server_default="one_time"),
    )

    # Add completed_at timestamp for marking one-time purchases as done
    op.add_column(
        "wishlist_items",
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )

    # Add tracking_start_date for custom aggregate query start (one_time goals only)
    # When null, defaults to 1st of the month when item was created
    op.add_column(
        "wishlist_items",
        sa.Column("tracking_start_date", sa.Date(), nullable=True),
    )

    # Migrate existing subtract_spending=true to goal_type='savings_buffer'
    op.execute("UPDATE wishlist_items SET goal_type = 'savings_buffer' WHERE subtract_spending = 1")

    # Remove old subtract_spending column
    op.drop_column("wishlist_items", "subtract_spending")


def downgrade() -> None:
    # Re-add subtract_spending column
    op.add_column(
        "wishlist_items",
        sa.Column("subtract_spending", sa.Boolean(), nullable=False, server_default="0"),
    )

    # Migrate goal_type='savings_buffer' back to subtract_spending=true
    op.execute("UPDATE wishlist_items SET subtract_spending = 1 WHERE goal_type = 'savings_buffer'")

    # Remove new columns
    op.drop_column("wishlist_items", "tracking_start_date")
    op.drop_column("wishlist_items", "completed_at")
    op.drop_column("wishlist_items", "goal_type")
