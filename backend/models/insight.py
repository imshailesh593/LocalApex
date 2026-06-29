from sqlalchemy import String, Integer, Date, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from models.base import TenantBase
import enum
from datetime import date


class InsightMetric(str, enum.Enum):
    views = "views"
    searches = "searches"
    clicks = "clicks"
    calls = "calls"
    directions = "directions"
    bookings = "bookings"


class Insight(TenantBase):
    __tablename__ = "insights"

    location_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    metric: Mapped[InsightMetric] = mapped_column(SAEnum(InsightMetric), nullable=False)
    value: Mapped[int] = mapped_column(Integer, default=0)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    source: Mapped[str] = mapped_column(String(50), default="gbp")
