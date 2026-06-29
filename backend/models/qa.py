from sqlalchemy import String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from models.base import TenantBase


class QAEntry(TenantBase):
    __tablename__ = "qa_entries"

    location_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_auto_answered: Mapped[bool] = mapped_column(Boolean, default=False)
    google_question_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_answer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    upvote_count: Mapped[int] = mapped_column(String(10), default="0")
