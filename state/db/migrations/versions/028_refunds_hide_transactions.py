"""Add hide_matched_transactions and hide_expected_transactions to refunds_config.

Settings to hide matched/expected transactions from the transaction list.
Both default to false (show all transactions).

Revision ID: 028
Revises: 027
Create Date: 2026-02-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "028"
down_revision: str | None = "027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "refunds_config",
        sa.Column("hide_matched_transactions", sa.Boolean(), nullable=False, server_default="0"),
    )
    op.add_column(
        "refunds_config",
        sa.Column("hide_expected_transactions", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("refunds_config", "hide_expected_transactions")
    op.drop_column("refunds_config", "hide_matched_transactions")
