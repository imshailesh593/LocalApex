"""add notification_prefs table and review assignment columns

Revision ID: a4f2c9e17b83
Revises: f1b3d8c02e45
Create Date: 2026-06-30 14:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'a4f2c9e17b83'
down_revision = 'f1b3d8c02e45'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'notification_prefs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False, unique=True),
        sa.Column('tenant_id', sa.String(36), nullable=False),
        sa.Column('email_review_new', sa.Boolean(), server_default=sa.true()),
        sa.Column('email_review_negative', sa.Boolean(), server_default=sa.true()),
        sa.Column('email_weekly_digest', sa.Boolean(), server_default=sa.true()),
        sa.Column('push_review_new', sa.Boolean(), server_default=sa.true()),
        sa.Column('push_review_negative', sa.Boolean(), server_default=sa.true()),
    )
    op.create_index('ix_np_user', 'notification_prefs', ['user_id'])

    op.add_column('reviews_funnel', sa.Column('assigned_to', sa.String(36), nullable=True))
    op.add_column('reviews_funnel', sa.Column('assigned_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('reviews_funnel', 'assigned_at')
    op.drop_column('reviews_funnel', 'assigned_to')
    op.drop_index('ix_np_user', 'notification_prefs')
    op.drop_table('notification_prefs')
