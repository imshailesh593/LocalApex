from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.activity_log import ActivityLog
from services.auth import get_current_user

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("")
async def list_activity(
    limit: int = 50,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.tenant_id == current_user["tenant_id"])
        .order_by(ActivityLog.created_at.desc())
        .limit(min(limit, 200))
    )
    items = result.scalars().all()
    return [
        {
            "id": i.id,
            "action": i.action,
            "entity_type": i.entity_type,
            "entity_label": i.entity_label,
            "user_name": i.user_name,
            "created_at": i.created_at.isoformat(),
        }
        for i in items
    ]
