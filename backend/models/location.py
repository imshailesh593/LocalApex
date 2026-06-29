from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from models.base import TenantBase


class Location(TenantBase):
    __tablename__ = "locations"

    gbp_location_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    store_name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), default="India")
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    business_hours: Mapped[str | None] = mapped_column(Text, nullable=True)
    special_hours: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_review_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    funnel_slug: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
