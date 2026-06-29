from sqlalchemy import String, Text, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column
from models.base import TenantBase


class Competitor(TenantBase):
    __tablename__ = "competitors"

    location_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    competitor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    competitor_place_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    track_keywords: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    map_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_synced_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
