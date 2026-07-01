"""add gmb_refresh_token and superadmin role

Revision ID: d1e9f2a05b83
Revises: c6d3e8b04f17
Create Date: 2026-07-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = 'd1e9f2a05b83'
down_revision = 'c6d3e8b04f17'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tenants', sa.Column('gmb_refresh_token', sa.String(512), nullable=True))
    op.execute("""
        ALTER TABLE users
        MODIFY COLUMN role ENUM('owner','admin','viewer','superadmin') NOT NULL DEFAULT 'admin'
    """)


def downgrade() -> None:
    op.alter_column(
        'users', 'role',
        existing_type=mysql.ENUM('owner', 'admin', 'viewer', 'superadmin'),
        type_=mysql.ENUM('owner', 'admin', 'viewer'),
        existing_nullable=False,
        existing_server_default='admin',
    )
    op.drop_column('tenants', 'gmb_refresh_token')
