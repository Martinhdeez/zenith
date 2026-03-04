"""Add telegram_chat_id to users

Revision ID: a1b2c3d4e5f6
Revises: 42d305237778
Create Date: 2026-03-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '42d305237778'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspect_obj = sa.inspect(conn)
    columns = [c['name'] for c in inspect_obj.get_columns('users')]
    if 'telegram_chat_id' not in columns:
        op.add_column('users', sa.Column('telegram_chat_id', sa.String(), nullable=True))
        op.create_index('ix_users_telegram_chat_id', 'users', ['telegram_chat_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_users_telegram_chat_id', table_name='users')
    op.drop_column('users', 'telegram_chat_id')
