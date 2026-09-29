from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # Relationship to Company
    company = relationship(
        "Company",
        back_populates="departments",
    )

    # Relationship to Documents
    documents = relationship(
        "Document",
        back_populates="department",
        cascade="all, delete-orphan",
    )

    # Relationship to Users
    users = relationship(
        "User",
        back_populates="department",
    )
