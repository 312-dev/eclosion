"""Add exclude_from_all to refunds_saved_views.

Per-view toggle to exclude a view's transactions from the aggregated All tab.
Defaults to false (included in All tab).

Revision ID: 029
Revises: 028
Create Date: 2026-02-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "029"
down_revision: str | None = "028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "refunds_saved_views",
        sa.Column("exclude_from_all", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("refunds_saved_views", "exclude_from_all")
