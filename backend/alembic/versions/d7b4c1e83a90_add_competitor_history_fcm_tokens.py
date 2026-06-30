"""add competitor_history fcm_tokens and user.fcm_token

Revision ID: d7b4c1e83a90
Revises: c3e1f5a92b17
Create Date: 2026-06-30 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'd7b4c1e83a90'
down_revision = 'c3e1f5a92b17'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('fcm_token', sa.String(512), nullable=True))

    op.create_table(
        'fcm_tokens',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('token', sa.String(512), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        'competitor_history',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('competitor_id', sa.String(36), nullable=False, index=True),
        sa.Column('rating', sa.Float(), nullable=True),
        sa.Column('review_count', sa.Integer(), default=0),
        sa.Column('recorded_at', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('competitor_history')
    op.drop_table('fcm_tokens')
    op.drop_column('users', 'fcm_token')
