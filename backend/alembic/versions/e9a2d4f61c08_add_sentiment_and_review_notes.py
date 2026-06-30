"""add sentiment to reviews and review_notes table

Revision ID: e9a2d4f61c08
Revises: d7b4c1e83a90
Create Date: 2026-06-30 11:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'e9a2d4f61c08'
down_revision = 'd7b4c1e83a90'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('reviews_funnel', sa.Column('sentiment', sa.String(20), nullable=True))

    op.create_table(
        'review_notes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('review_id', sa.String(36), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('author_name', sa.String(255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('review_notes')
    op.drop_column('reviews_funnel', 'sentiment')
