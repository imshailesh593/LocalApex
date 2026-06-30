"""add_notifications_templates_webhooks_activity_password_reset

Revision ID: af8d924b34e8
Revises: 1568af9093c6
Create Date: 2026-06-30 08:25:36.650468

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'af8d924b34e8'
down_revision: Union[str, None] = '1568af9093c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add notification_email and logo_url to tenants
    op.add_column('tenants', sa.Column('notification_email', sa.String(255), nullable=True))
    op.add_column('tenants', sa.Column('logo_url', sa.String(500), nullable=True))

    # notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('type', sa.String(100), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # response_templates
    op.create_table(
        'response_templates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('tone', sa.String(50), nullable=True, default='professional'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # webhooks
    op.create_table(
        'webhooks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('secret', sa.String(36), nullable=False, unique=True),
        sa.Column('events', sa.String(500), nullable=True, default='review.new'),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # activity_logs
    op.create_table(
        'activity_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), nullable=True),
        sa.Column('user_name', sa.String(255), nullable=True),
        sa.Column('action', sa.String(500), nullable=False),
        sa.Column('entity_type', sa.String(100), nullable=True),
        sa.Column('entity_label', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # password_reset_tokens
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, index=True),
        sa.Column('token', sa.String(36), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('password_reset_tokens')
    op.drop_table('activity_logs')
    op.drop_table('webhooks')
    op.drop_table('response_templates')
    op.drop_table('notifications')
    op.drop_column('tenants', 'logo_url')
    op.drop_column('tenants', 'notification_email')
