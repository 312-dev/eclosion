"""Add frozen_rollover_amount and frozen_next_due_date to categories.

These columns were added via inline migration v3 but were missing from the
Alembic migration chain, causing fresh databases in dev mode to fail with
'no such column: categories.frozen_rollover_amount'.

Revision ID: 018
Revises: 017
Create Date: 2026-02-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "018"
down_revision: str | None = "017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "categories",
        sa.Column("frozen_rollover_amount", sa.Float(), nullable=True),
    )
    op.add_column(
        "categories",
        sa.Column("frozen_next_due_date", sa.String(20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("categories", "frozen_next_due_date")
    op.drop_column("categories", "frozen_rollover_amount")
