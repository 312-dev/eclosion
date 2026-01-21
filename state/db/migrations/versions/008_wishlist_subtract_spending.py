"""Add subtract_spending column to wishlist_items.

Revision ID: 008
Revises: 007
Create Date: 2025-01-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "008"
down_revision: str | None = "007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add subtract_spending column - when True, spending reduces progress
    # Default is False (spending does NOT reduce progress)
    op.add_column(
        "wishlist_items",
        sa.Column("subtract_spending", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("wishlist_items", "subtract_spending")
