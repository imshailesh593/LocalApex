from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from database import get_db
from models.user import User
from models.tenant import Tenant
from models.password_reset import PasswordResetToken
from schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse, PasswordChange, UserInvite
from services.auth import hash_password, verify_password, create_access_token, get_current_user
from services.email import send_email
from config import get_settings
from datetime import datetime, timedelta
import uuid

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    tenant = Tenant(business_name=f"{payload.name}'s Business")
    db.add(tenant)
    await db.flush()
    await db.refresh(tenant)

    user = User(
        tenant_id=tenant.id,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token({"sub": user.id, "tenant_id": tenant.id, "role": user.role})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id, "tenant_id": user.tenant_id, "role": user.role})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/forgot-password", status_code=200)
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email, User.is_deleted == False))
    user = result.scalar_one_or_none()
    # Always return 200 to prevent email enumeration
    if not user:
        return {"message": "If that email is registered, you'll receive a reset link shortly."}

    reset_token = PasswordResetToken(
        email=payload.email,
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    db.add(reset_token)
    await db.flush()
    await db.refresh(reset_token)

    frontend_url = getattr(settings, 'frontend_url', 'http://localhost:5173')
    reset_link = f"{frontend_url}/reset-password?token={reset_token.token}"

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#1e3a5f">Reset your LocalApex password</h2>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="{reset_link}"
         style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
        Reset Password
      </a>
      <p style="color:#666;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    await send_email(payload.email, "Reset your LocalApex password", html)
    return {"message": "If that email is registered, you'll receive a reset link shortly."}


@router.post("/reset-password", status_code=200)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == payload.token,
            PasswordResetToken.used == False,
        )
    )
    reset = result.scalar_one_or_none()
    if not reset or reset.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user_result = await db.execute(select(User).where(User.email == reset.email, User.is_deleted == False))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    reset.used = True
    return {"message": "Password updated successfully"}


@router.post("/change-password", status_code=204)
async def change_password(payload: PasswordChange, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == current_user["sub"], User.is_deleted == False))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    user.password_hash = hash_password(payload.new_password)


@router.get("/users", response_model=list[UserResponse])
async def list_users(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.tenant_id == current_user["tenant_id"], User.is_deleted == False)
    )
    return result.scalars().all()


@router.post("/users", response_model=UserResponse, status_code=201)
async def invite_user(payload: UserInvite, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        tenant_id=current_user["tenant_id"],
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
async def remove_user(user_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user_id == current_user["sub"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user["tenant_id"])
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_deleted = True
