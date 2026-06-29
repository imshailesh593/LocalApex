from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db
from models.review import ReviewFunnel
from models.location import Location
from models.qa import QAEntry
from models.citation import Citation
from models.competitor import Competitor
from services.auth import get_current_user

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("")
async def global_search(
    q: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not q or len(q.strip()) < 2:
        return {"locations": [], "reviews": [], "qa": [], "citations": [], "competitors": []}

    tid = current_user["tenant_id"]
    term = f"%{q.strip()}%"

    locs = (await db.execute(
        select(Location.id, Location.store_name, Location.city, Location.address)
        .where(Location.tenant_id == tid, Location.is_deleted == False,
               or_(Location.store_name.ilike(term), Location.city.ilike(term), Location.address.ilike(term)))
        .limit(5)
    )).all()

    reviews = (await db.execute(
        select(ReviewFunnel.id, ReviewFunnel.reviewer_name, ReviewFunnel.comment, ReviewFunnel.rating, ReviewFunnel.status)
        .where(ReviewFunnel.tenant_id == tid, ReviewFunnel.is_deleted == False,
               or_(ReviewFunnel.reviewer_name.ilike(term), ReviewFunnel.comment.ilike(term)))
        .limit(5)
    )).all()

    qa = (await db.execute(
        select(QAEntry.id, QAEntry.question, QAEntry.answer)
        .where(QAEntry.tenant_id == tid, QAEntry.is_deleted == False,
               or_(QAEntry.question.ilike(term), QAEntry.answer.ilike(term)))
        .limit(5)
    )).all()

    citations = (await db.execute(
        select(Citation.id, Citation.platform_name, Citation.listed_name, Citation.status)
        .where(Citation.tenant_id == tid, Citation.is_deleted == False,
               or_(Citation.platform_name.ilike(term), Citation.listed_name.ilike(term)))
        .limit(5)
    )).all()

    competitors = (await db.execute(
        select(Competitor.id, Competitor.competitor_name, Competitor.current_rating)
        .where(Competitor.tenant_id == tid, Competitor.is_deleted == False,
               Competitor.competitor_name.ilike(term))
        .limit(5)
    )).all()

    return {
        "locations": [{"id": r.id, "name": r.store_name, "city": r.city, "type": "location"} for r in locs],
        "reviews": [{"id": r.id, "name": r.reviewer_name or "Anonymous", "comment": r.comment, "rating": r.rating, "status": r.status, "type": "review"} for r in reviews],
        "qa": [{"id": r.id, "question": r.question, "type": "qa"} for r in qa],
        "citations": [{"id": r.id, "platform": r.platform_name, "status": r.status, "type": "citation"} for r in citations],
        "competitors": [{"id": r.id, "name": r.competitor_name, "rating": r.current_rating, "type": "competitor"} for r in competitors],
    }
