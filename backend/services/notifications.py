from sqlalchemy.ext.asyncio import AsyncSession
from models.notification import Notification


async def push(db: AsyncSession, tenant_id: str, type: str, title: str, body: str = ""):
    notif = Notification(tenant_id=tenant_id, type=type, title=title, body=body)
    db.add(notif)
