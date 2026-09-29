from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    filename: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    file_path: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="uploaded",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    department = relationship(
        "Department",
        back_populates="documents",
    )

    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    _file_size = None
    _file_type = None

    @property
    def file_size(self) -> int:
        if self._file_size is not None:
            return self._file_size
        try:
            from pathlib import Path

            return Path(self.file_path).stat().st_size
        except Exception:
            return 0

    @file_size.setter
    def file_size(self, value: int) -> None:
        self._file_size = value

    @property
    def file_type(self) -> str:
        if self._file_type is not None:
            return self._file_type
        import mimetypes

        ft, _ = mimetypes.guess_type(self.filename or "")
        return ft or "application/octet-stream"

    @file_type.setter
    def file_type(self, value: str) -> None:
        self._file_type = value
