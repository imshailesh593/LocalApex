"""add firebase_uid and razorpay fields

Revision ID: c3e1f5a92b17
Revises: af8d924b34e8
Create Date: 2026-06-30 09:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c3e1f5a92b17'
down_revision = 'af8d924b34e8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('firebase_uid', sa.String(128), nullable=True))
    op.create_index('ix_users_firebase_uid', 'users', ['firebase_uid'])

    op.add_column('tenants', sa.Column('razorpay_subscription_id', sa.String(255), nullable=True))
    op.create_index('ix_tenants_razorpay_sub_id', 'tenants', ['razorpay_subscription_id'])


def downgrade():
    op.drop_index('ix_tenants_razorpay_sub_id', 'tenants')
    op.drop_column('tenants', 'razorpay_subscription_id')

    op.drop_index('ix_users_firebase_uid', 'users')
    op.drop_column('users', 'firebase_uid')
