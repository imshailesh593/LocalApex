from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from database import get_db
from models.review import ReviewFunnel
from models.location import Location
from schemas.review import ReviewCreate, ReviewUpdate, ReviewResponse, PublicReviewCreate, PublicReviewResponse
from services.auth import get_current_user
from services.review_funnel import process_review
from services.ai_responder import generate_review_response
from services.notifications import push as push_notification
from services.resend_email import send_email, review_notification_html, review_request_html
from services.webhooks import fire_event
from services.fcm import send_push
from services.activity import log as activity_log
from services.sentiment import classify_sentiment
from services.health_score import compute_health_score
from models.tenant import Tenant
from models.review_note import ReviewNote
from models.user import User
from config import get_settings
import csv, io

settings = get_settings()


class ReviewRequestPayload(BaseModel):
    location_id: str
    emails: list[str]
    custom_message: str = ""

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("/public/{funnel_slug}", response_model=PublicReviewResponse, status_code=201)
async def submit_public_review(funnel_slug: str, payload: PublicReviewCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Location).where(Location.funnel_slug == funnel_slug, Location.is_deleted == False)
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Review funnel not found")

    review = ReviewFunnel(
        tenant_id=location.tenant_id,
        location_id=location.id,
        reviewer_name=payload.reviewer_name,
        reviewer_email=payload.reviewer_email,
        rating=payload.rating,
        comment=payload.comment,
        source="public_funnel",
    )
    review = process_review(review)
    review.sentiment = classify_sentiment(payload.rating, payload.comment)
    db.add(review)
    await db.flush()
    await db.refresh(review)

    reviewer = payload.reviewer_name or "Anonymous"
    stars = "⭐" * payload.rating

    tenant_result = await db.execute(select(Tenant).where(Tenant.id == location.tenant_id))
    tenant = tenant_result.scalar_one_or_none()

    business_name = tenant.business_name if tenant else "Your Business"
    notif_email = tenant.notification_email if tenant else None

    if review.is_routed:
        title = f"New {payload.rating}-star review from {reviewer}"
        body = f"{stars} — {payload.comment or 'No comment'}"
        await push_notification(db, location.tenant_id, "review_positive", title, body)
        await send_push(db, location.tenant_id, title, body, {"type": "review_positive"})
        if notif_email:
            await send_email(
                notif_email,
                f"New {payload.rating}-star review — {business_name}",
                review_notification_html(business_name, reviewer, payload.rating, payload.comment or "", True),
            )
    else:
        title = f"New {payload.rating}-star review needs attention"
        body = f"{reviewer}: {payload.comment or 'No comment'}"
        await push_notification(db, location.tenant_id, "review_negative", title, body)
        await send_push(db, location.tenant_id, title, body, {"type": "review_negative"})
        if notif_email:
            await send_email(
                notif_email,
                f"Action needed: {payload.rating}-star review — {business_name}",
                review_notification_html(business_name, reviewer, payload.rating, payload.comment or "", False),
            )

    await fire_event(db, location.tenant_id, "review.new", {
        "reviewer": reviewer,
        "rating": payload.rating,
        "comment": payload.comment,
        "is_routed": review.is_routed,
        "location": location.store_name,
    })
    await activity_log(db, location.tenant_id, f"New {payload.rating}★ review from {reviewer}", "review", reviewer)

    if review.is_routed:
        return PublicReviewResponse(
            is_routed=True,
            google_review_url=location.google_review_url,
            message="Thank you! We'd love it if you shared your experience on Google.",
        )
    return PublicReviewResponse(
        is_routed=False,
        google_review_url=None,
        message="Thank you for your feedback. We'll look into this right away.",
    )


@router.get("/stats")
async def review_stats(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    base = select(func.count(ReviewFunnel.id)).where(
        ReviewFunnel.tenant_id == current_user["tenant_id"],
        ReviewFunnel.is_deleted == False,
    )
    total = (await db.execute(base)).scalar_one()
    suppressed = (await db.execute(base.where(ReviewFunnel.status == "suppressed"))).scalar_one()
    pending = (await db.execute(base.where(ReviewFunnel.status == "pending"))).scalar_one()
    avg = (await db.execute(
        select(func.avg(ReviewFunnel.rating)).where(
            ReviewFunnel.tenant_id == current_user["tenant_id"],
            ReviewFunnel.is_deleted == False,
        )
    )).scalar_one()
    star_dist = {}
    for star in range(1, 6):
        star_dist[star] = (await db.execute(
            select(func.count(ReviewFunnel.id)).where(
                ReviewFunnel.tenant_id == current_user["tenant_id"],
                ReviewFunnel.is_deleted == False,
                ReviewFunnel.rating == star,
            )
        )).scalar_one()

    return {
        "total": total,
        "suppressed": suppressed,
        "pending": pending,
        "unread": suppressed + pending,
        "avg_rating": round(float(avg), 1) if avg else None,
        "star_distribution": star_dist,
    }


@router.get("", response_model=list[ReviewResponse])
async def list_reviews(
    location_id: str | None = None,
    is_routed: bool | None = None,
    status: str | None = None,
    min_rating: int | None = None,
    max_rating: int | None = None,
    page: int = 1,
    per_page: int = 20,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(ReviewFunnel).where(
        ReviewFunnel.tenant_id == current_user["tenant_id"],
        ReviewFunnel.is_deleted == False,
    )
    if location_id:
        query = query.where(ReviewFunnel.location_id == location_id)
    if is_routed is not None:
        query = query.where(ReviewFunnel.is_routed == is_routed)
    if status:
        query = query.where(ReviewFunnel.status == status)
    if min_rating is not None:
        query = query.where(ReviewFunnel.rating >= min_rating)
    if max_rating is not None:
        query = query.where(ReviewFunnel.rating <= max_rating)
    per_page = min(per_page, 100)
    query = query.order_by(ReviewFunnel.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ReviewResponse, status_code=201)
async def submit_review(payload: ReviewCreate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    review = ReviewFunnel(tenant_id=current_user["tenant_id"], **payload.model_dump())
    review = process_review(review)
    db.add(review)
    await db.flush()
    await db.refresh(review)
    return review


@router.post("/{review_id}/generate-response", response_model=dict)
async def generate_ai_response(review_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ReviewFunnel).where(ReviewFunnel.id == review_id, ReviewFunnel.tenant_id == current_user["tenant_id"])
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    result_loc = await db.execute(select(Location).where(Location.id == review.location_id))
    location = result_loc.scalar_one_or_none()
    business_name = location.store_name if location else "Your Business"

    response_text = await generate_review_response(review.comment or "", review.rating, business_name)
    review.ai_response = response_text
    return {"ai_response": response_text}


@router.get("/export")
async def export_reviews(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ReviewFunnel).where(
            ReviewFunnel.tenant_id == current_user["tenant_id"],
            ReviewFunnel.is_deleted == False,
        ).order_by(ReviewFunnel.created_at.desc())
    )
    reviews = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['id', 'reviewer_name', 'reviewer_email', 'rating', 'comment',
                     'is_routed', 'status', 'ai_response', 'source', 'created_at'])
    for r in reviews:
        writer.writerow([r.id, r.reviewer_name, r.reviewer_email, r.rating, r.comment,
                         r.is_routed, r.status, r.ai_response, r.source, r.created_at])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="reviews.csv"'},
    )


@router.post("/request-reviews")
async def request_reviews(
    payload: ReviewRequestPayload,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Location).where(Location.id == payload.location_id, Location.tenant_id == current_user["tenant_id"])
    )
    location = result.scalar_one_or_none()
    if not location or not location.funnel_slug:
        raise HTTPException(status_code=400, detail="Location not found or funnel slug not configured")

    funnel_url = f"{settings.frontend_url}/r/{location.funnel_slug}"
    sent = 0
    for raw_email in payload.emails[:200]:
        email = raw_email.strip()
        if not email:
            continue
        html = review_request_html(location.store_name, funnel_url, payload.custom_message)
        await send_email(email, f"How was your experience at {location.store_name}?", html)
        sent += 1

    await activity_log(
        db, current_user["tenant_id"],
        f"Sent {sent} review request(s) for {location.store_name}",
        "location", location.store_name, current_user["sub"],
    )
    return {"sent": sent}


@router.patch("/{review_id}", response_model=ReviewResponse)
async def update_review(review_id: str, payload: ReviewUpdate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ReviewFunnel).where(ReviewFunnel.id == review_id, ReviewFunnel.tenant_id == current_user["tenant_id"])
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(review, field, value)
    return review


# ── Review Notes ────────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    body: str


@router.get("/{review_id}/notes")
async def list_notes(review_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ReviewNote)
        .where(ReviewNote.review_id == review_id, ReviewNote.tenant_id == current_user["tenant_id"])
        .order_by(ReviewNote.created_at.asc())
    )
    notes = result.scalars().all()
    return [
        {"id": n.id, "author_name": n.author_name, "body": n.body, "created_at": n.created_at.isoformat()}
        for n in notes
    ]


@router.post("/{review_id}/notes", status_code=201)
async def add_note(review_id: str, payload: NoteCreate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_result = await db.execute(select(User).where(User.id == current_user["sub"]))
    user = user_result.scalar_one_or_none()
    author = user.name if user else "Team"

    note = ReviewNote(
        tenant_id=current_user["tenant_id"],
        review_id=review_id,
        user_id=current_user["sub"],
        author_name=author,
        body=payload.body,
    )
    db.add(note)
    await db.flush()
    await db.refresh(note)
    return {"id": note.id, "author_name": note.author_name, "body": note.body, "created_at": note.created_at.isoformat()}


@router.delete("/{review_id}/notes/{note_id}", status_code=204)
async def delete_note(review_id: str, note_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ReviewNote).where(ReviewNote.id == note_id, ReviewNote.tenant_id == current_user["tenant_id"])
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)


# ── Health score ─────────────────────────────────────────────────────────────

@router.get("/health/{location_id}")
async def location_health(location_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await compute_health_score(db, current_user["tenant_id"], location_id)


# ── Review CSV import ────────────────────────────────────────────────────────

@router.post("/import-csv")
async def import_reviews_csv(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Columns: reviewer_name, rating (1-5), comment, location_id (optional),
             reviewer_email (optional), date (optional ISO format)
    """
    from services.review_funnel import process_review
    content = await file.read()
    text = content.decode("utf-8-sig").strip()
    reader = csv.DictReader(io.StringIO(text))
    imported, errors = 0, []

    # get first location as fallback
    first_loc_res = await db.execute(
        select(Location).where(Location.tenant_id == current_user["tenant_id"], Location.is_deleted == False)
    )
    first_location = first_loc_res.scalars().first()

    for i, row in enumerate(reader, 1):
        raw_rating = (row.get("rating") or "").strip()
        if not raw_rating:
            errors.append(f"Row {i}: missing rating")
            continue
        try:
            rating = int(float(raw_rating))
        except ValueError:
            errors.append(f"Row {i}: invalid rating '{raw_rating}'")
            continue
        if not (1 <= rating <= 5):
            errors.append(f"Row {i}: rating must be 1–5")
            continue

        location_id = (row.get("location_id") or "").strip()
        if location_id:
            loc_check = await db.execute(
                select(Location).where(Location.id == location_id, Location.tenant_id == current_user["tenant_id"])
            )
            if not loc_check.scalar_one_or_none():
                errors.append(f"Row {i}: location_id not found")
                continue
        elif first_location:
            location_id = first_location.id
        else:
            errors.append(f"Row {i}: no location available")
            continue

        # Parse optional date
        created_at = None
        raw_date = (row.get("date") or "").strip()
        if raw_date:
            try:
                from dateutil import parser as date_parser
                created_at = date_parser.parse(raw_date)
            except Exception:
                pass

        review = ReviewFunnel(
            tenant_id=current_user["tenant_id"],
            location_id=location_id,
            reviewer_name=(row.get("reviewer_name") or "").strip() or "Imported",
            reviewer_email=(row.get("reviewer_email") or "").strip() or None,
            rating=rating,
            comment=(row.get("comment") or "").strip() or None,
            source="import",
        )
        review = process_review(review)
        review.sentiment = classify_sentiment(rating, review.comment)
        if created_at:
            review.created_at = created_at
        db.add(review)
        imported += 1

    return {"imported": imported, "errors": errors}
