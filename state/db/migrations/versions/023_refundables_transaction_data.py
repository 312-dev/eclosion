"""Add transaction_data to refundables_matches.

Stores a JSON snapshot of the transaction at match time, so matched
transactions remain visible even after their tags are removed.

Revision ID: 023
Revises: 022
Create Date: 2026-02-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "023"
down_revision: str | None = "022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "refundables_matches",
        sa.Column("transaction_data", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("refundables_matches", "transaction_data")
