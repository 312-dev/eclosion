"""Add notes_key_encrypted column to credentials table.

Stores the desktop's notes encryption key encrypted with the user's passphrase.
This allows tunnel/remote users to decrypt notes created by the desktop app.

Revision ID: 017
Revises: 016
Create Date: 2026-01-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "017"
down_revision: str | None = "016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add notes_key_encrypted column to store desktop's notes encryption key
    # Nullable because existing users won't have it until they re-enable remote access
    op.add_column(
        "credentials",
        sa.Column("notes_key_encrypted", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("credentials", "notes_key_encrypted")
