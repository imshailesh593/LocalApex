from sqlalchemy import String, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from models.base import TenantBase
import enum


class CitationStatus(str, enum.Enum):
    unchecked = "unchecked"
    consistent = "consistent"
    inconsistent = "inconsistent"
    missing = "missing"


class Citation(TenantBase):
    __tablename__ = "citations"

    location_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    platform_name: Mapped[str] = mapped_column(String(255), nullable=False)
    platform_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    listed_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    listed_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    listed_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[CitationStatus] = mapped_column(SAEnum(CitationStatus), default=CitationStatus.unchecked)
    nap_match: Mapped[bool] = mapped_column(Boolean, default=False)
