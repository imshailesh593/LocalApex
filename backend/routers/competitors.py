from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.competitor import Competitor
from models.competitor_history import CompetitorHistory
from schemas.competitor import CompetitorCreate, CompetitorUpdate, CompetitorResponse
from services.auth import get_current_user

router = APIRouter(prefix="/competitors", tags=["Competitors"])


@router.get("", response_model=list[CompetitorResponse])
async def list_competitors(location_id: str | None = None, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(Competitor).where(Competitor.tenant_id == current_user["tenant_id"], Competitor.is_deleted == False)
    if location_id:
        query = query.where(Competitor.location_id == location_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=CompetitorResponse, status_code=201)
async def add_competitor(payload: CompetitorCreate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    competitor = Competitor(tenant_id=current_user["tenant_id"], **payload.model_dump())
    db.add(competitor)
    await db.flush()
    await db.refresh(competitor)
    return competitor


@router.get("/{competitor_id}", response_model=CompetitorResponse)
async def get_competitor(competitor_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Competitor).where(Competitor.id == competitor_id, Competitor.tenant_id == current_user["tenant_id"])
    )
    competitor = result.scalar_one_or_none()
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")
    return competitor


@router.patch("/{competitor_id}", response_model=CompetitorResponse)
async def update_competitor(competitor_id: str, payload: CompetitorUpdate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Competitor).where(Competitor.id == competitor_id, Competitor.tenant_id == current_user["tenant_id"])
    )
    competitor = result.scalar_one_or_none()
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    old_rating = competitor.rating
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(competitor, field, value)

    # Snapshot history whenever rating changes
    if payload.rating is not None and payload.rating != old_rating:
        db.add(CompetitorHistory(
            tenant_id=current_user["tenant_id"],
            competitor_id=competitor.id,
            rating=competitor.rating,
            review_count=competitor.review_count or 0,
        ))

    return competitor


@router.get("/{competitor_id}/history")
async def competitor_history(
    competitor_id: str,
    days: int = 30,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(CompetitorHistory)
        .where(
            CompetitorHistory.competitor_id == competitor_id,
            CompetitorHistory.tenant_id == current_user["tenant_id"],
            CompetitorHistory.recorded_at >= since,
        )
        .order_by(CompetitorHistory.recorded_at.asc())
    )
    rows = result.scalars().all()
    return [{"date": r.recorded_at.isoformat(), "rating": r.rating, "review_count": r.review_count} for r in rows]


@router.delete("/{competitor_id}", status_code=204)
async def delete_competitor(competitor_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Competitor).where(Competitor.id == competitor_id, Competitor.tenant_id == current_user["tenant_id"])
    )
    competitor = result.scalar_one_or_none()
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")
    competitor.is_deleted = True
