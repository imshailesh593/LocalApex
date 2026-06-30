from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.tenant import Tenant
from models.user import User
from models.location import Location
from models.review import ReviewFunnel
from models.citation import Citation
from models.competitor import Competitor
from schemas.tenant import TenantCreate, TenantUpdate, TenantResponse
from services.auth import get_current_user
import uuid, json
from datetime import datetime

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.get("/me", response_model=TenantResponse)
async def get_my_tenant(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == current_user["tenant_id"]))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.patch("/me", response_model=TenantResponse)
async def update_my_tenant(payload: TenantUpdate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == current_user["tenant_id"]))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(tenant, field, value)
    return tenant


@router.post("/regenerate-api-key")
async def regenerate_api_key(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == current_user["tenant_id"]))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant.api_key = str(uuid.uuid4())
    await db.flush()
    await db.refresh(tenant)
    return {"api_key": tenant.api_key}


@router.get("/export-data")
async def export_all_data(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tid = current_user["tenant_id"]

    def rows(result):
        return [dict(r.__dict__) for r in result.scalars().all()]

    def clean(objs):
        out = []
        for o in objs:
            d = {k: v for k, v in o.items() if not k.startswith("_")}
            for k, v in d.items():
                if isinstance(v, datetime):
                    d[k] = v.isoformat()
            out.append(d)
        return out

    users = clean(rows(await db.execute(select(User).where(User.tenant_id == tid, User.is_deleted == False))))
    for u in users:
        u.pop("password_hash", None)

    locations = clean(rows(await db.execute(select(Location).where(Location.tenant_id == tid, Location.is_deleted == False))))
    reviews = clean(rows(await db.execute(select(ReviewFunnel).where(ReviewFunnel.tenant_id == tid, ReviewFunnel.is_deleted == False))))
    citations = clean(rows(await db.execute(select(Citation).where(Citation.tenant_id == tid, Citation.is_deleted == False))))
    competitors = clean(rows(await db.execute(select(Competitor).where(Competitor.tenant_id == tid, Competitor.is_deleted == False))))

    payload = json.dumps({
        "exported_at": datetime.utcnow().isoformat(),
        "tenant_id": tid,
        "users": users,
        "locations": locations,
        "reviews": reviews,
        "citations": citations,
        "competitors": competitors,
    }, indent=2, default=str)

    return StreamingResponse(
        iter([payload]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=\"localapex-export-{datetime.utcnow().date()}.json\""},
    )
