from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models.location import Location
from models.review import ReviewFunnel
from models.tenant import Tenant

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/biz/{slug}")
async def public_profile(slug: str, db: AsyncSession = Depends(get_db)):
    loc_result = await db.execute(
        select(Location).where(Location.funnel_slug == slug, Location.is_deleted == False)
    )
    location = loc_result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Business not found")

    tenant_result = await db.execute(select(Tenant).where(Tenant.id == location.tenant_id))
    tenant = tenant_result.scalar_one_or_none()

    reviews_result = await db.execute(
        select(ReviewFunnel)
        .where(
            ReviewFunnel.location_id == location.id,
            ReviewFunnel.is_deleted == False,
        )
        .order_by(ReviewFunnel.created_at.desc())
        .limit(50)
    )
    reviews = reviews_result.scalars().all()

    stats = await db.execute(
        select(func.count(ReviewFunnel.id), func.avg(ReviewFunnel.rating))
        .where(ReviewFunnel.location_id == location.id, ReviewFunnel.is_deleted == False)
    )
    total, avg = stats.one()

    star_dist: dict[int, int] = {}
    for star in range(1, 6):
        n = (await db.execute(
            select(func.count(ReviewFunnel.id)).where(
                ReviewFunnel.location_id == location.id,
                ReviewFunnel.is_deleted == False,
                ReviewFunnel.rating == star,
            )
        )).scalar_one()
        star_dist[star] = n

    public_reviews = [
        {
            "id": r.id,
            "reviewer_name": r.reviewer_name or "Anonymous",
            "rating": r.rating,
            "comment": r.comment,
            "ai_response": r.ai_response,
            "sentiment": r.sentiment,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reviews
    ]

    return {
        "business_name": tenant.business_name if tenant else location.store_name,
        "logo_url": tenant.logo_url if tenant else None,
        "brand_color": tenant.brand_color if tenant else "#1d4ed8",
        "funnel_url": f"/r/{slug}",
        "location": {
            "store_name": location.store_name,
            "address": location.address,
            "city": location.city,
            "state": location.state,
            "country": location.country,
            "phone": location.phone,
            "website": location.website,
            "google_review_url": location.google_review_url,
        },
        "stats": {
            "total_reviews": total or 0,
            "avg_rating": round(float(avg), 1) if avg else None,
            "star_distribution": star_dist,
        },
        "reviews": public_reviews,
    }
