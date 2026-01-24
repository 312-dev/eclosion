"""Add stash_hypotheses table for saved what-if scenarios.

Creates stash_hypotheses table to store saved hypothesis configurations
for the Distribute Wizard's hypothesize mode. Supports up to 10 saved
hypotheses per user, each containing savings and monthly allocations.

Revision ID: 015
Revises: 014
Create Date: 2026-01-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "015"
down_revision: str | None = "014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create stash_hypotheses table
    op.create_table(
        "stash_hypotheses",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("savings_allocations", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("savings_total", sa.Float(), nullable=False, server_default="0"),
        sa.Column("monthly_allocations", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("monthly_total", sa.Float(), nullable=False, server_default="0"),
        sa.Column("events", sa.Text(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("stash_hypotheses")
