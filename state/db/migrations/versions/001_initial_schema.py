"""Initial schema with all tables.

Revision ID: 001
Revises:
Create Date: 2025-01-11
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === CREDENTIALS ===
    op.create_table(
        "credentials",
        sa.Column("id", sa.Integer(), primary_key=True, default=1),
        sa.Column("salt", sa.Text(), nullable=False),
        sa.Column("email_encrypted", sa.Text(), nullable=False),
        sa.Column("password_encrypted", sa.Text(), nullable=False),
        sa.Column("mfa_secret_encrypted", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("id = 1", name="single_row_credentials"),
    )

    op.create_table(
        "automation_credentials",
        sa.Column("id", sa.Integer(), primary_key=True, default=1),
        sa.Column("salt", sa.Text(), nullable=False),
        sa.Column("email_encrypted", sa.Text(), nullable=False),
        sa.Column("password_encrypted", sa.Text(), nullable=False),
        sa.Column("mfa_secret_encrypted", sa.Text(), nullable=True),
        sa.Column("consent_acknowledged", sa.Boolean(), default=False),
        sa.Column("consent_timestamp", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("id = 1", name="single_row_automation"),
    )

    # === TRACKER ===
    op.create_table(
        "tracker_config",
        sa.Column("id", sa.Integer(), primary_key=True, default=1),
        sa.Column("schema_version", sa.String(20), nullable=False, default="1.0"),
        sa.Column("target_group_id", sa.String(100), nullable=True),
        sa.Column("target_group_name", sa.String(255), nullable=True),
        sa.Column("auto_sync_new", sa.Boolean(), default=False),
        sa.Column("auto_track_threshold", sa.Float(), nullable=True),
        sa.Column("auto_update_targets", sa.Boolean(), default=False),
        sa.Column("auto_categorize_enabled", sa.Boolean(), default=False),
        sa.Column("last_auto_categorize_date", sa.String(20), nullable=True),
        sa.Column("show_category_group", sa.Boolean(), default=True),
        sa.Column("last_sync", sa.DateTime(), nullable=True),
        sa.Column("last_read_changelog_version", sa.String(50), nullable=True),
        sa.Column("user_first_name", sa.String(100), nullable=True),
        sa.Column("mfa_mode", sa.String(20), default="secret"),
        sa.Column("sync_blocked_reason", sa.String(100), nullable=True),
        sa.CheckConstraint("id = 1", name="single_row_config"),
    )

    op.create_table(
        "categories",
        sa.Column("recurring_id", sa.String(100), primary_key=True),
        sa.Column("monarch_category_id", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("emoji", sa.String(10), default="🔄"),
        sa.Column("target_amount", sa.Float(), nullable=False),
        sa.Column("over_contribution", sa.Float(), default=0.0),
        sa.Column("previous_due_date", sa.String(20), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("is_linked", sa.Boolean(), default=False),
        sa.Column("sync_name", sa.Boolean(), default=True),
        sa.Column("frozen_monthly_target", sa.Float(), nullable=True),
        sa.Column("target_month", sa.String(10), nullable=True),
        sa.Column("balance_at_month_start", sa.Float(), nullable=True),
        sa.Column("frozen_amount", sa.Float(), nullable=True),
        sa.Column("frozen_frequency_months", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "enabled_items",
        sa.Column("recurring_id", sa.String(100), primary_key=True),
    )

    op.create_table(
        "rollup",
        sa.Column("id", sa.Integer(), primary_key=True, default=1),
        sa.Column("enabled", sa.Boolean(), default=False),
        sa.Column("monarch_category_id", sa.String(100), nullable=True),
        sa.Column("category_name", sa.String(255), default="Recurring Rollup"),
        sa.Column("emoji", sa.String(10), default="🔄"),
        sa.Column("total_budgeted", sa.Float(), default=0.0),
        sa.Column("is_linked", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("last_updated_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint("id = 1", name="single_row_rollup"),
    )

    op.create_table(
        "rollup_items",
        sa.Column("recurring_id", sa.String(100), primary_key=True),
        sa.Column("rollup_id", sa.Integer(), sa.ForeignKey("rollup.id", ondelete="CASCADE"), default=1),
    )

    op.create_table(
        "removed_item_notices",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("recurring_id", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category_name", sa.String(255), nullable=False),
        sa.Column("was_rollup", sa.Boolean(), nullable=False),
        sa.Column("removed_at", sa.DateTime(), nullable=False),
        sa.Column("dismissed", sa.Boolean(), default=False),
    )

    op.create_table(
        "auto_sync_state",
        sa.Column("id", sa.Integer(), primary_key=True, default=1),
        sa.Column("enabled", sa.Boolean(), default=False),
        sa.Column("interval_minutes", sa.Integer(), default=360),
        sa.Column("last_auto_sync", sa.DateTime(), nullable=True),
        sa.Column("last_auto_sync_success", sa.Boolean(), nullable=True),
        sa.Column("last_auto_sync_error", sa.Text(), nullable=True),
        sa.Column("consent_acknowledged", sa.Boolean(), default=False),
        sa.Column("consent_timestamp", sa.DateTime(), nullable=True),
        sa.CheckConstraint("id = 1", name="single_row_auto_sync"),
    )

    # === NOTES (encrypted) ===
    op.create_table(
        "notes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("category_type", sa.String(20), nullable=False),
        sa.Column("category_id", sa.String(100), nullable=False),
        sa.Column("category_name", sa.String(255), nullable=False),
        sa.Column("group_id", sa.String(100), nullable=True),
        sa.Column("group_name", sa.String(255), nullable=True),
        sa.Column("month_key", sa.String(10), nullable=False),
        sa.Column("content_encrypted", sa.Text(), nullable=False),
        sa.Column("salt", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("idx_notes_category", "notes", ["category_type", "category_id"])
    op.create_index("idx_notes_month", "notes", ["month_key"])

    op.create_table(
        "general_notes",
        sa.Column("month_key", sa.String(10), primary_key=True),
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("content_encrypted", sa.Text(), nullable=False),
        sa.Column("salt", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "archived_notes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("category_type", sa.String(20), nullable=False),
        sa.Column("category_id", sa.String(100), nullable=False),
        sa.Column("category_name", sa.String(255), nullable=False),
        sa.Column("group_id", sa.String(100), nullable=True),
        sa.Column("group_name", sa.String(255), nullable=True),
        sa.Column("month_key", sa.String(10), nullable=False),
        sa.Column("content_encrypted", sa.Text(), nullable=False),
        sa.Column("salt", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("archived_at", sa.DateTime(), nullable=False),
        sa.Column("original_category_name", sa.String(255), nullable=False),
        sa.Column("original_group_name", sa.String(255), nullable=True),
    )

    op.create_table(
        "known_categories",
        sa.Column("category_id", sa.String(100), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
    )

    # === SECURITY ===
    op.create_table(
        "security_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
    )
    op.create_index("idx_security_timestamp", "security_events", ["timestamp"])
    op.create_index("idx_security_type", "security_events", ["event_type"])
    op.create_index("idx_security_success", "security_events", ["success"])

    op.create_table(
        "ip_geolocation_cache",
        sa.Column("ip_address", sa.String(45), primary_key=True),
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("cached_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "security_preferences",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    # Drop in reverse order
    op.drop_table("security_preferences")
    op.drop_table("ip_geolocation_cache")
    op.drop_index("idx_security_success", table_name="security_events")
    op.drop_index("idx_security_type", table_name="security_events")
    op.drop_index("idx_security_timestamp", table_name="security_events")
    op.drop_table("security_events")

    op.drop_table("known_categories")
    op.drop_table("archived_notes")
    op.drop_table("general_notes")
    op.drop_index("idx_notes_month", table_name="notes")
    op.drop_index("idx_notes_category", table_name="notes")
    op.drop_table("notes")

    op.drop_table("auto_sync_state")
    op.drop_table("removed_item_notices")
    op.drop_table("rollup_items")
    op.drop_table("rollup")
    op.drop_table("enabled_items")
    op.drop_table("categories")
    op.drop_table("tracker_config")

    op.drop_table("automation_credentials")
    op.drop_table("credentials")
