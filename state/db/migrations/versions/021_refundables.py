"""Add refundables tables.

Creates refundables_config, refundables_saved_views, and refundables_matches
tables for the Refundables feature - tracking purchases awaiting refunds.

Revision ID: 021
Revises: 020
Create Date: 2026-02-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "021"
down_revision: str | None = "020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "refundables_config",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("replacement_tag_id", sa.String(100), nullable=True),
        sa.Column("replace_tag_by_default", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("id = 1", name="single_row_refundables_config"),
    )

    op.create_table(
        "refundables_saved_views",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("tag_ids", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "refundables_matches",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("original_transaction_id", sa.String(100), nullable=False, unique=True),
        sa.Column("refund_transaction_id", sa.String(100), nullable=True),
        sa.Column("refund_amount", sa.Float(), nullable=True),
        sa.Column("refund_merchant", sa.String(255), nullable=True),
        sa.Column("refund_date", sa.String(20), nullable=True),
        sa.Column("refund_account", sa.String(255), nullable=True),
        sa.Column("skipped", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("refundables_matches")
    op.drop_table("refundables_saved_views")
    op.drop_table("refundables_config")
