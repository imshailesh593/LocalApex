"""
Location health score (0–100) weighting:
  40% — avg rating (scaled 1-5 → 0-40)
  25% — response rate (responded / total)
  20% — NAP citation health (consistent / total citations)
  15% — review volume (capped at 50+ = full marks)
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.review import ReviewFunnel, ReviewStatus
from models.citation import Citation, CitationStatus


async def compute_health_score(db: AsyncSession, tenant_id: str, location_id: str) -> dict:
    # Avg rating + total reviews
    r = await db.execute(
        select(func.avg(ReviewFunnel.rating), func.count(ReviewFunnel.id))
        .where(ReviewFunnel.location_id == location_id, ReviewFunnel.is_deleted == False)
    )
    row = r.one()
    avg_rating = float(row[0] or 0)
    total_reviews = int(row[1] or 0)

    # Response rate
    rr = await db.execute(
        select(func.count(ReviewFunnel.id))
        .where(
            ReviewFunnel.location_id == location_id,
            ReviewFunnel.status == ReviewStatus.responded,
            ReviewFunnel.is_deleted == False,
        )
    )
    responded = int(rr.scalar() or 0)
    response_rate = responded / total_reviews if total_reviews else 0

    # Citation health
    cr = await db.execute(
        select(func.count(Citation.id))
        .where(Citation.location_id == location_id, Citation.is_deleted == False)
    )
    total_citations = int(cr.scalar() or 0)

    cc = await db.execute(
        select(func.count(Citation.id))
        .where(
            Citation.location_id == location_id,
            Citation.status == CitationStatus.consistent,
            Citation.is_deleted == False,
        )
    )
    consistent = int(cc.scalar() or 0)
    citation_health = consistent / total_citations if total_citations else 1.0

    # Compute weighted score
    rating_score = ((avg_rating - 1) / 4) * 40 if avg_rating else 0
    response_score = response_rate * 25
    citation_score = citation_health * 20
    volume_score = min(total_reviews / 50, 1.0) * 15

    total = round(rating_score + response_score + citation_score + volume_score)

    return {
        "score": total,
        "avg_rating": round(avg_rating, 1),
        "total_reviews": total_reviews,
        "response_rate": round(response_rate * 100),
        "citation_health": round(citation_health * 100),
        "grade": "A" if total >= 80 else "B" if total >= 65 else "C" if total >= 50 else "D",
    }
