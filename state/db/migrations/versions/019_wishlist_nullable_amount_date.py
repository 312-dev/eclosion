"""Make amount and target_date nullable in wishlist_items.

Supports open-ended goals (no target amount) and no-deadline goals (no target date).
These were already allowed by the API but the database schema wasn't updated.

Revision ID: 019
Revises: 018
Create Date: 2026-02-04
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "019"
down_revision: str | None = "018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    # Using batch_alter_table handles this automatically
    with op.batch_alter_table("wishlist_items") as batch_op:
        batch_op.alter_column("amount", nullable=True)
        batch_op.alter_column("target_date", nullable=True)


def downgrade() -> None:
    # Note: This will fail if there are NULL values in the columns
    with op.batch_alter_table("wishlist_items") as batch_op:
        batch_op.alter_column("amount", nullable=False)
        batch_op.alter_column("target_date", nullable=False)
