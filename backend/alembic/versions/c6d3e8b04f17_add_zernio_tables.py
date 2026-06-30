"""add zernio_accounts, gbp_posts, tenants.zernio_profile_id

Revision ID: c6d3e8b04f17
Revises: b7e1f4a03c92
Create Date: 2026-06-30 18:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c6d3e8b04f17'
down_revision = 'b7e1f4a03c92'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tenants', sa.Column('zernio_profile_id', sa.String(255), nullable=True))

    op.create_table(
        'zernio_accounts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False),
        sa.Column('zernio_profile_id', sa.String(255), nullable=False),
        sa.Column('zernio_account_id', sa.String(255), nullable=False),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('username', sa.String(255), nullable=True),
        sa.Column('display_name', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('tenant_id', 'zernio_account_id', name='uq_za_account'),
    )
    op.create_index('ix_za_tenant', 'zernio_accounts', ['tenant_id'])

    op.create_table(
        'gbp_posts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False),
        sa.Column('location_id', sa.String(36), nullable=True),
        sa.Column('zernio_post_id', sa.String(255), nullable=True),
        sa.Column('zernio_account_id', sa.String(255), nullable=False),
        sa.Column('platform', sa.String(50), server_default='googlebusiness'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('post_type', sa.String(50), server_default='whats_new'),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(30), server_default='scheduled'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_gbp_tenant', 'gbp_posts', ['tenant_id'])
    op.create_index('ix_gbp_location', 'gbp_posts', ['location_id'])


def downgrade():
    op.drop_index('ix_gbp_location', 'gbp_posts')
    op.drop_index('ix_gbp_tenant', 'gbp_posts')
    op.drop_table('gbp_posts')
    op.drop_index('ix_za_tenant', 'zernio_accounts')
    op.drop_table('zernio_accounts')
    op.drop_column('tenants', 'zernio_profile_id')
