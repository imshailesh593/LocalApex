from sqlalchemy import String, Text, Integer, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from models.base import TenantBase
import enum


class ReviewStatus(str, enum.Enum):
    pending = "pending"
    routed = "routed"
    suppressed = "suppressed"
    responded = "responded"


class ReviewFunnel(TenantBase):
    __tablename__ = "reviews_funnel"

    location_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    reviewer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reviewer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_routed: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[ReviewStatus] = mapped_column(SAEnum(ReviewStatus), default=ReviewStatus.pending)
    ai_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_review_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="funnel")
