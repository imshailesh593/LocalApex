from sqlalchemy import String, Text, Integer, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from models.base import TenantBase
import enum


class MediaCategory(str, enum.Enum):
    exterior = "EXTERIOR"
    interior = "INTERIOR"
    product = "PRODUCT"
    at_work = "AT_WORK"
    food_and_drink = "FOOD_AND_DRINK"
    menu = "MENU"
    common_area = "COMMON_AREA"
    rooms = "ROOMS"
    teams = "TEAMS"
    additional = "ADDITIONAL"


class Media(TenantBase):
    __tablename__ = "media"

    location_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    category: Mapped[MediaCategory] = mapped_column(SAEnum(MediaCategory), default=MediaCategory.additional)
    gbp_media_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_synced: Mapped[bool] = mapped_column(Boolean, default=False)
