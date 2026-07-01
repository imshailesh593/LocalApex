from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from services.auth import get_current_user
from models.notification_pref import NotificationPref
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/notification-prefs", tags=["notification-prefs"])

class PrefsUpdate(BaseModel):
    email_review_new: bool = True
    email_review_negative: bool = True
    email_weekly_digest: bool = True
    push_review_new: bool = True
    push_review_negative: bool = True

def _row(pref: NotificationPref) -> dict:
    return {
        "email_review_new": pref.email_review_new,
        "email_review_negative": pref.email_review_negative,
        "email_weekly_digest": pref.email_weekly_digest,
        "push_review_new": pref.push_review_new,
        "push_review_negative": pref.push_review_negative,
    }

@router.get("")
async def get_prefs(db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    result = await db.execute(select(NotificationPref).where(NotificationPref.user_id == cu["sub"]))
    pref = result.scalar_one_or_none()
    if not pref:
        return _row(NotificationPref())
    return _row(pref)

@router.patch("")
async def update_prefs(body: PrefsUpdate, db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    result = await db.execute(select(NotificationPref).where(NotificationPref.user_id == cu["sub"]))
    pref = result.scalar_one_or_none()
    if not pref:
        pref = NotificationPref(id=str(uuid.uuid4()), user_id=cu["sub"], tenant_id=cu["tenant_id"])
        db.add(pref)
    for k, v in body.model_dump().items():
        setattr(pref, k, v)
    await db.commit()
    await db.refresh(pref)
    return _row(pref)
