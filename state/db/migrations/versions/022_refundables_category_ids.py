"""Add category_ids to refundables_saved_views.

Allows views to optionally filter by Monarch category IDs in addition to tags.
NULL means "all categories" (no category filter).

Revision ID: 022
Revises: 021
Create Date: 2026-02-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "022"
down_revision: str | None = "021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "refundables_saved_views",
        sa.Column("category_ids", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("refundables_saved_views", "category_ids")
