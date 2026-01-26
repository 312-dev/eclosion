"""Add sort_order column to wishlist_items and monarch_goal_layout.

Revision ID: 014
Revises: 013
Create Date: 2026-01-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "014"
down_revision: str | None = "013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add sort_order column to wishlist_items for drag-to-reorder persistence
    op.add_column(
        "wishlist_items",
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    # Add sort_order column to monarch_goal_layout for goal reordering
    op.add_column(
        "monarch_goal_layout",
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("wishlist_items", "sort_order")
    op.drop_column("monarch_goal_layout", "sort_order")
