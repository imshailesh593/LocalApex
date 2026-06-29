from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from database import get_db
from models.notification import Notification
from services.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
async def list_notifications(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification)
        .where(Notification.tenant_id == current_user["tenant_id"])
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()


@router.patch("/{notif_id}/read")
async def mark_read(notif_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification)
        .where(Notification.id == notif_id, Notification.tenant_id == current_user["tenant_id"])
        .values(is_read=True)
    )
    return {"ok": True}


@router.post("/mark-all-read")
async def mark_all_read(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification)
        .where(Notification.tenant_id == current_user["tenant_id"], Notification.is_read == False)
        .values(is_read=True)
    )
    return {"ok": True}
