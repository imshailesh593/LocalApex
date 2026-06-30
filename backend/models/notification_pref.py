import uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Boolean
from database import Base

class NotificationPref(Base):
    __tablename__ = "notification_prefs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, unique=True)
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    email_review_new: Mapped[bool] = mapped_column(Boolean, default=True)
    email_review_negative: Mapped[bool] = mapped_column(Boolean, default=True)
    email_weekly_digest: Mapped[bool] = mapped_column(Boolean, default=True)
    push_review_new: Mapped[bool] = mapped_column(Boolean, default=True)
    push_review_negative: Mapped[bool] = mapped_column(Boolean, default=True)
