from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models.location import Location
from models.review import ReviewFunnel
from models.citation import Citation
from models.competitor import Competitor
from models.insight import Insight
from services.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/location/{location_id}")
async def location_report(location_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tid = current_user["tenant_id"]

    loc_result = await db.execute(
        select(Location).where(Location.id == location_id, Location.tenant_id == tid, Location.is_deleted == False)
    )
    location = loc_result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    base_review = select(ReviewFunnel).where(
        ReviewFunnel.tenant_id == tid,
        ReviewFunnel.location_id == location_id,
        ReviewFunnel.is_deleted == False,
    )
    total_reviews = (await db.execute(select(func.count()).select_from(base_review.subquery()))).scalar() or 0
    avg_rating = (await db.execute(
        select(func.avg(ReviewFunnel.rating)).where(
            ReviewFunnel.tenant_id == tid,
            ReviewFunnel.location_id == location_id,
            ReviewFunnel.is_deleted == False,
        )
    )).scalar()
    routed = (await db.execute(
        select(func.count()).select_from(
            select(ReviewFunnel).where(
                ReviewFunnel.tenant_id == tid,
                ReviewFunnel.location_id == location_id,
                ReviewFunnel.is_deleted == False,
                ReviewFunnel.is_routed == True,
            ).subquery()
        )
    )).scalar() or 0

    total_citations = (await db.execute(
        select(func.count()).select_from(
            select(Citation).where(
                Citation.tenant_id == tid,
                Citation.location_id == location_id,
                Citation.is_deleted == False,
            ).subquery()
        )
    )).scalar() or 0
    consistent_citations = (await db.execute(
        select(func.count()).select_from(
            select(Citation).where(
                Citation.tenant_id == tid,
                Citation.location_id == location_id,
                Citation.is_deleted == False,
                Citation.status == "consistent",
            ).subquery()
        )
    )).scalar() or 0

    total_competitors = (await db.execute(
        select(func.count()).select_from(
            select(Competitor).where(
                Competitor.tenant_id == tid,
                Competitor.location_id == location_id,
                Competitor.is_deleted == False,
            ).subquery()
        )
    )).scalar() or 0

    insight_rows = (await db.execute(
        select(Insight.metric, func.sum(Insight.value).label("total"))
        .where(Insight.tenant_id == tid, Insight.location_id == location_id)
        .group_by(Insight.metric)
    )).all()
    insights = {r.metric: int(r.total) for r in insight_rows}

    citation_health = round((consistent_citations / total_citations) * 100) if total_citations > 0 else None

    return {
        "location": {
            "id": location.id,
            "store_name": location.store_name,
            "address": location.address,
            "city": location.city,
            "phone": location.phone,
            "funnel_slug": location.funnel_slug,
            "google_review_url": location.google_review_url,
        },
        "reviews": {
            "total": total_reviews,
            "avg_rating": round(float(avg_rating), 1) if avg_rating else None,
            "routed": routed,
            "routed_pct": round((routed / total_reviews) * 100) if total_reviews > 0 else 0,
        },
        "citations": {
            "total": total_citations,
            "consistent": consistent_citations,
            "health_pct": citation_health,
        },
        "competitors": {
            "total": total_competitors,
        },
        "insights": insights,
    }


@router.get("/overview")
async def overview_report(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tid = current_user["tenant_id"]

    locations = (await db.execute(
        select(Location).where(Location.tenant_id == tid, Location.is_deleted == False)
    )).scalars().all()

    rows = []
    for loc in locations:
        total_reviews = (await db.execute(
            select(func.count(ReviewFunnel.id)).where(
                ReviewFunnel.tenant_id == tid,
                ReviewFunnel.location_id == loc.id,
                ReviewFunnel.is_deleted == False,
            )
        )).scalar() or 0
        avg_rating = (await db.execute(
            select(func.avg(ReviewFunnel.rating)).where(
                ReviewFunnel.tenant_id == tid,
                ReviewFunnel.location_id == loc.id,
                ReviewFunnel.is_deleted == False,
            )
        )).scalar()
        total_citations = (await db.execute(
            select(func.count(Citation.id)).where(
                Citation.tenant_id == tid,
                Citation.location_id == loc.id,
                Citation.is_deleted == False,
            )
        )).scalar() or 0
        consistent = (await db.execute(
            select(func.count(Citation.id)).where(
                Citation.tenant_id == tid,
                Citation.location_id == loc.id,
                Citation.is_deleted == False,
                Citation.status == "consistent",
            )
        )).scalar() or 0
        rows.append({
            "id": loc.id,
            "store_name": loc.store_name,
            "city": loc.city,
            "reviews": total_reviews,
            "avg_rating": round(float(avg_rating), 1) if avg_rating else None,
            "citations": total_citations,
            "citation_health": round((consistent / total_citations) * 100) if total_citations > 0 else None,
        })

    return rows
