"""Add acknowledgement columns to tracker_config.

Moves tour completion, news article read state, and stash intro
from client-side localStorage to server-side database storage.

Revision ID: 020
Revises: 019
Create Date: 2026-02-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "020"
down_revision: str | None = "019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("tracker_config") as batch_op:
        batch_op.add_column(
            sa.Column("seen_stash_tour", sa.Boolean(), server_default="0", nullable=False)
        )
        batch_op.add_column(
            sa.Column("seen_notes_tour", sa.Boolean(), server_default="0", nullable=False)
        )
        batch_op.add_column(
            sa.Column("seen_recurring_tour", sa.Boolean(), server_default="0", nullable=False)
        )
        batch_op.add_column(
            sa.Column("seen_stash_intro", sa.Boolean(), server_default="0", nullable=False)
        )
        batch_op.add_column(sa.Column("read_update_ids", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("updates_install_date", sa.String(50), nullable=True))
        batch_op.add_column(sa.Column("updates_last_viewed_at", sa.String(50), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("tracker_config") as batch_op:
        batch_op.drop_column("updates_last_viewed_at")
        batch_op.drop_column("updates_install_date")
        batch_op.drop_column("read_update_ids")
        batch_op.drop_column("seen_stash_intro")
        batch_op.drop_column("seen_recurring_tour")
        batch_op.drop_column("seen_notes_tour")
        batch_op.drop_column("seen_stash_tour")
