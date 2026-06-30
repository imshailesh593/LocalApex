"""add review_campaigns table and tenants.brand_color

Revision ID: f1b3d8c02e45
Revises: e9a2d4f61c08
Create Date: 2026-06-30 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'f1b3d8c02e45'
down_revision = 'e9a2d4f61c08'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tenants', sa.Column('brand_color', sa.String(20), server_default='#1d4ed8'))

    op.create_table(
        'review_campaigns',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('location_id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('emails', sa.Text(), nullable=False),
        sa.Column('custom_message', sa.Text(), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('sent_count', sa.Integer(), default=0),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_rc_status', 'review_campaigns', ['status'])
    op.create_index('ix_rc_scheduled', 'review_campaigns', ['scheduled_at'])


def downgrade():
    op.drop_index('ix_rc_scheduled', 'review_campaigns')
    op.drop_index('ix_rc_status', 'review_campaigns')
    op.drop_table('review_campaigns')
    op.drop_column('tenants', 'brand_color')
