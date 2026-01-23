"""Add image_attribution to wishlist_items.

Adds image_attribution field to store attribution text for Openverse images.
This is required by Openverse terms of service when using their images.

Revision ID: 013
Revises: 012
Create Date: 2026-01-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "013"
down_revision: str | None = "012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add image_attribution to wishlist_items
    # Stores attribution text for Openverse images (e.g., "Photo by X via Openverse (CC BY)")
    op.add_column(
        "wishlist_items",
        sa.Column("image_attribution", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    # Remove column from wishlist_items
    op.drop_column("wishlist_items", "image_attribution")
