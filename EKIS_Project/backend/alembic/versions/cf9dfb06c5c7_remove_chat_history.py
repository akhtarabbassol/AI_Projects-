"""remove chat history

Revision ID: cf9dfb06c5c7
Revises: 456c441d8402
Create Date: 2026-09-25 16:09:04.310565

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cf9dfb06c5c7'
down_revision: Union[str, Sequence[str], None] = '456c441d8402'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
