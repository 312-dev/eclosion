"""Add extended fields to stash_hypotheses table.

Adds custom fund overrides and item APY settings to support
full scenario persistence from the hypothesize mode:
- custom_available_funds: Override for Available to Stash amount
- custom_left_to_budget: Override for Left to Budget amount
- item_apys: Per-item APY settings for HYSA projections

Revision ID: 016
Revises: 015
Create Date: 2026-01-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "016"
down_revision: str | None = "015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add custom fund override columns (nullable - only set when user overrides)
    op.add_column(
        "stash_hypotheses",
        sa.Column("custom_available_funds", sa.Float(), nullable=True),
    )
    op.add_column(
        "stash_hypotheses",
        sa.Column("custom_left_to_budget", sa.Float(), nullable=True),
    )
    # Add item APYs as JSON text (default empty object)
    op.add_column(
        "stash_hypotheses",
        sa.Column("item_apys", sa.Text(), nullable=False, server_default="{}"),
    )


def downgrade() -> None:
    op.drop_column("stash_hypotheses", "item_apys")
    op.drop_column("stash_hypotheses", "custom_left_to_budget")
    op.drop_column("stash_hypotheses", "custom_available_funds")
