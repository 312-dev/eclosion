"""Add expected refund columns to refundables_matches.

Supports the "Expected Refund" feature: users can mark transactions
with an expected refund date, account, amount, and note without
creating an actual match to a refund transaction.

Revision ID: 026
Revises: 025
Create Date: 2026-02-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "026"
down_revision: str | None = "025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "refundables_matches",
        sa.Column("expected_refund", sa.Boolean(), nullable=False, server_default="0"),
    )
    op.add_column(
        "refundables_matches",
        sa.Column("expected_date", sa.String(20), nullable=True),
    )
    op.add_column(
        "refundables_matches",
        sa.Column("expected_account", sa.String(255), nullable=True),
    )
    op.add_column(
        "refundables_matches",
        sa.Column("expected_account_id", sa.String(100), nullable=True),
    )
    op.add_column(
        "refundables_matches",
        sa.Column("expected_note", sa.Text(), nullable=True),
    )
    op.add_column(
        "refundables_matches",
        sa.Column("expected_amount", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("refundables_matches", "expected_amount")
    op.drop_column("refundables_matches", "expected_note")
    op.drop_column("refundables_matches", "expected_account_id")
    op.drop_column("refundables_matches", "expected_account")
    op.drop_column("refundables_matches", "expected_date")
    op.drop_column("refundables_matches", "expected_refund")
