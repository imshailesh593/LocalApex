from sqlalchemy.ext.asyncio import AsyncSession
from models.activity_log import ActivityLog


async def log(
    db: AsyncSession,
    tenant_id: str,
    action: str,
    entity_type: str | None = None,
    entity_label: str | None = None,
    user_id: str | None = None,
    user_name: str | None = None,
):
    entry = ActivityLog(
        tenant_id=tenant_id,
        action=action,
        entity_type=entity_type,
        entity_label=entity_label,
        user_id=user_id,
        user_name=user_name,
    )
    db.add(entry)
