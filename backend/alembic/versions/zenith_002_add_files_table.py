# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""add files table with embedding

Revision ID: zenith_002
Revises: zenith_001
Create Date: 2026-02-28 00:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision = 'zenith_002'
down_revision = 'zenith_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=1024), nullable=True),
        sa.Column('mime_type', sa.String(length=127), nullable=True),
        sa.Column('path', sa.String(length=512), nullable=False),
        sa.Column('size', sa.BigInteger(), nullable=False),
        sa.Column('embedding', Vector(1536), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_files_id'), 'files', ['id'], unique=False)
    op.create_index(op.f('ix_files_name'), 'files', ['name'], unique=False)
    op.create_index(op.f('ix_files_user_id'), 'files', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_files_user_id'), table_name='files')
    op.drop_index(op.f('ix_files_name'), table_name='files')
    op.drop_index(op.f('ix_files_id'), table_name='files')
    op.drop_table('files')
