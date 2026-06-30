from services.firebase_auth import _init, _initialized, firebase_admin
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.fcm_token import FcmToken


async def send_push(
    db: AsyncSession,
    tenant_id: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> int:
    _init()
    if not _initialized and not (firebase_admin._apps if firebase_admin else False):
        return 0

    from firebase_admin import messaging

    result = await db.execute(
        select(FcmToken.token).where(FcmToken.tenant_id == tenant_id)
    )
    tokens = [row[0] for row in result.all()]
    if not tokens:
        return 0

    msg = messaging.MulticastMessage(
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
        tokens=tokens,
    )
    try:
        response = messaging.send_each_for_multicast(msg)
        return response.success_count
    except Exception:
        return 0
