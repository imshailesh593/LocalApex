from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.user import User
from models.tenant import Tenant
from schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse, PasswordChange, UserInvite
from services.auth import hash_password, verify_password, create_access_token, get_current_user
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])


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
