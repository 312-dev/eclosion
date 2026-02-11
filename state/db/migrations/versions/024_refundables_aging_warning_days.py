"""Add aging_warning_days to refundables_config.

Configurable threshold (in days) for highlighting old unmatched
transactions with an orange-to-red color gradient. Default 30 days.

Revision ID: 024
Revises: 023
Create Date: 2026-02-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "024"
down_revision: str | None = "023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "refundables_config",
        sa.Column("aging_warning_days", sa.Integer(), nullable=False, server_default="30"),
    )


def downgrade() -> None:
    op.drop_column("refundables_config", "aging_warning_days")
