"""Rename refundables tables to refunds.

Renames refundables_config, refundables_saved_views, and
refundables_matches tables to refunds_config, refunds_saved_views,
and refunds_matches respectively.

Revision ID: 027
Revises: 026
Create Date: 2026-02-11
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "027"
down_revision: str | None = "026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.rename_table("refundables_config", "refunds_config")
    op.rename_table("refundables_saved_views", "refunds_saved_views")
    op.rename_table("refundables_matches", "refunds_matches")


def downgrade() -> None:
    op.rename_table("refunds_config", "refundables_config")
    op.rename_table("refunds_saved_views", "refundables_saved_views")
    op.rename_table("refunds_matches", "refundables_matches")
