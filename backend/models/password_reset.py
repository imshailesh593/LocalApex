from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base
import uuid


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False, index=True)
    token = Column(String(36), nullable=False, unique=True, default=lambda: str(uuid.uuid4()))
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
