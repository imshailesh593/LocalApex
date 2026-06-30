"""add review_replies table

Revision ID: b7e1f4a03c92
Revises: a4f2c9e17b83
Create Date: 2026-06-30 16:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'b7e1f4a03c92'
down_revision = 'a4f2c9e17b83'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'review_replies',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False),
        sa.Column('review_id', sa.String(36), nullable=False, unique=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_rr_review', 'review_replies', ['review_id'])
    op.create_index('ix_rr_tenant', 'review_replies', ['tenant_id'])


def downgrade():
    op.drop_index('ix_rr_tenant', 'review_replies')
    op.drop_index('ix_rr_review', 'review_replies')
    op.drop_table('review_replies')
