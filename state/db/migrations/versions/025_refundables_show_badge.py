"""Add show_badge to refundables_config.

Toggle for showing the pending transaction count badge in the
sidebar navigation. Default enabled (true).

Revision ID: 025
Revises: 024
Create Date: 2026-02-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "025"
down_revision: str | None = "024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "refundables_config",
        sa.Column("show_badge", sa.Boolean(), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_column("refundables_config", "show_badge")
