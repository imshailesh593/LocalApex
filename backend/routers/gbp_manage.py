"""
Google Business Profile management endpoints.
All operations act on real GBP data via the authenticated user's OAuth token.
"""
import uuid
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from services.gbp import ALL_METRICS
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from services.auth import get_current_user
from services import gbp as gbp_svc
from models.tenant import Tenant
from models.location import Location
from models.review import ReviewFunnel, ReviewStatus

router = APIRouter(prefix="/gbp", tags=["gbp-manage"])


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_tenant_token(tenant_id: str, db: AsyncSession) -> str:
    """Get a fresh GBP access token for this tenant, or raise 400."""
    r = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = r.scalar_one_or_none()
    if not tenant or not tenant.gmb_refresh_token:
        raise HTTPException(
            status_code=400,
            detail="Google Business Profile not connected. Go to Locations → Import from Google."
        )
    try:
        return await gbp_svc.get_access_token(tenant.gmb_refresh_token)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


async def _get_location(location_id: str, tenant_id: str, db: AsyncSession) -> Location:
    r = await db.execute(
        select(Location).where(Location.id == location_id, Location.tenant_id == tenant_id)
    )
    loc = r.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    if not loc.gbp_location_id:
        raise HTTPException(
            status_code=400,
            detail="This location is not linked to a Google Business Profile. "
                   "Delete it and re-import from Google to link it."
        )
    return loc


# ── Reviews ───────────────────────────────────────────────────────────────────

@router.post("/locations/{location_id}/reviews/sync")
async def sync_reviews(location_id: str, db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    """Pull all Google reviews for this location and upsert into our DB."""
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)

    try:
        google_reviews = await gbp_svc.list_reviews(token, loc.gbp_location_id)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    synced = 0
    updated = 0
    for gr in google_reviews:
        review_id = gr.get("reviewId", "")
        google_name = gr.get("name", "")  # accounts/.../reviews/{id}
        reviewer = gr.get("reviewer", {})
        star_map = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}
        rating = star_map.get(gr.get("starRating", "FIVE"), 5)
        comment = gr.get("comment", "")
        reviewer_name = reviewer.get("displayName", "Anonymous")
        reviewer_photo = reviewer.get("profilePhotoUrl", "")
        create_time = gr.get("createTime", "")
        reply = gr.get("reviewReply", {})
        google_reply = reply.get("comment") if reply else None
        review_url = gr.get("reviewUrl", "")

        # Sentiment
        sentiment = "positive" if rating >= 4 else "negative" if rating <= 2 else "neutral"

        # Upsert by google_review_id
        existing = await db.execute(
            select(ReviewFunnel).where(
                ReviewFunnel.tenant_id == cu["tenant_id"],
                ReviewFunnel.google_review_id == review_id,
            )
        )
        row = existing.scalar_one_or_none()

        if row:
            row.rating = rating
            row.comment = comment
            row.reviewer_name = reviewer_name
            row.reviewer_photo_url = reviewer_photo
            row.google_reply = google_reply
            row.review_url = review_url
            row.sentiment = sentiment
            updated += 1
        else:
            row = ReviewFunnel(
                id=str(uuid.uuid4()),
                tenant_id=cu["tenant_id"],
                location_id=location_id,
                google_review_id=review_id,
                source="google",
                reviewer_name=reviewer_name,
                reviewer_photo_url=reviewer_photo,
                rating=rating,
                comment=comment,
                sentiment=sentiment,
                google_reply=google_reply,
                review_url=review_url,
                status=ReviewStatus.responded if google_reply else ReviewStatus.pending,
            )
            db.add(row)
            synced += 1

    await db.commit()
    return {"synced": synced, "updated": updated, "total": len(google_reviews)}


@router.get("/locations/{location_id}/reviews")
async def get_reviews(location_id: str, db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    """Return all synced Google reviews for this location."""
    result = await db.execute(
        select(ReviewFunnel).where(
            ReviewFunnel.tenant_id == cu["tenant_id"],
            ReviewFunnel.location_id == location_id,
            ReviewFunnel.source == "google",
        ).order_by(ReviewFunnel.created_at.desc())
    )
    reviews = result.scalars().all()
    return [
        {
            "id": r.id,
            "google_review_id": r.google_review_id,
            "reviewer_name": r.reviewer_name,
            "reviewer_photo_url": r.reviewer_photo_url,
            "rating": r.rating,
            "comment": r.comment,
            "sentiment": r.sentiment,
            "google_reply": r.google_reply,
            "google_reply_at": r.google_reply_at,
            "review_url": r.review_url,
            "status": r.status,
            "created_at": r.created_at,
        }
        for r in reviews
    ]


class ReplyBody(BaseModel):
    reply: str


@router.post("/locations/{location_id}/reviews/{review_id}/reply")
async def reply_to_review(
    location_id: str, review_id: str, body: ReplyBody,
    db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)
):
    """Post a reply directly to Google. Updates our DB on success."""
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)

    # Get the local review row
    r = await db.execute(
        select(ReviewFunnel).where(
            ReviewFunnel.id == review_id,
            ReviewFunnel.tenant_id == cu["tenant_id"],
        )
    )
    review = r.scalar_one_or_none()
    if not review or not review.google_review_id:
        raise HTTPException(status_code=404, detail="Google review not found")

    # Build Google review resource name
    google_review_name = f"{loc.gbp_location_id}/reviews/{review.google_review_id}"

    try:
        await gbp_svc.reply_to_review(token, google_review_name, body.reply)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Update local record
    review.google_reply = body.reply
    review.google_reply_at = datetime.utcnow()
    review.status = ReviewStatus.responded
    await db.commit()

    return {"success": True, "reply": body.reply}


@router.delete("/locations/{location_id}/reviews/{review_id}/reply", status_code=204)
async def delete_review_reply(
    location_id: str, review_id: str,
    db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)
):
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)

    r = await db.execute(
        select(ReviewFunnel).where(ReviewFunnel.id == review_id, ReviewFunnel.tenant_id == cu["tenant_id"])
    )
    review = r.scalar_one_or_none()
    if not review or not review.google_review_id:
        raise HTTPException(status_code=404, detail="Review not found")

    google_review_name = f"{loc.gbp_location_id}/reviews/{review.google_review_id}"
    try:
        await gbp_svc.delete_review_reply(token, google_review_name)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    review.google_reply = None
    review.google_reply_at = None
    review.status = ReviewStatus.pending
    await db.commit()


# ── Photos ────────────────────────────────────────────────────────────────────

@router.get("/locations/{location_id}/photos")
async def get_photos(location_id: str, db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    """List all photos on the GBP listing from Google."""
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    try:
        items = await gbp_svc.list_media(token, loc.gbp_location_id)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return [
        {
            "name": m.get("name"),
            "media_format": m.get("mediaFormat"),
            "category": m.get("locationAssociation", {}).get("category"),
            "google_url": m.get("googleUrl"),
            "thumbnail_url": m.get("thumbnailUrl"),
            "dimensions": m.get("dimensions"),
            "create_time": m.get("createTime"),
            "view_count": m.get("insights", {}).get("mediaItemCount"),
        }
        for m in items
    ]


class PhotoUpload(BaseModel):
    source_url: str
    category: str = "ADDITIONAL"
    media_format: str = "PHOTO"


@router.post("/locations/{location_id}/photos", status_code=201)
async def upload_photo(
    location_id: str, body: PhotoUpload,
    db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)
):
    """Upload a photo to GBP from a publicly accessible URL."""
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    try:
        result = await gbp_svc.upload_media(token, loc.gbp_location_id, body.media_format, body.source_url, body.category)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return result


@router.delete("/locations/{location_id}/photos/{media_name:path}", status_code=204)
async def delete_photo(
    location_id: str, media_name: str,
    db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)
):
    await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    try:
        await gbp_svc.delete_media(token, media_name)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── Q&A ───────────────────────────────────────────────────────────────────────

@router.get("/locations/{location_id}/questions")
async def get_questions(location_id: str, db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    """Fetch real Q&A from Google Business Profile."""
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    try:
        questions = await gbp_svc.list_questions(token, loc.gbp_location_id)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return [
        {
            "name": q.get("name"),
            "text": q.get("text"),
            "author": q.get("author", {}).get("displayName"),
            "author_photo": q.get("author", {}).get("profilePhotoUri"),
            "create_time": q.get("createTime"),
            "upvote_count": q.get("upvoteCount", 0),
            "answers": [
                {
                    "name": a.get("name"),
                    "text": a.get("text"),
                    "author": a.get("author", {}).get("displayName"),
                    "is_owner": a.get("author", {}).get("type") == "MERCHANT",
                    "create_time": a.get("createTime"),
                    "upvote_count": a.get("upvoteCount", 0),
                }
                for a in q.get("topAnswers", [])
            ],
        }
        for q in questions
    ]


class AnswerBody(BaseModel):
    answer: str


@router.post("/locations/{location_id}/questions/{question_name:path}/answer")
async def answer_question(
    location_id: str, question_name: str, body: AnswerBody,
    db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)
):
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    try:
        result = await gbp_svc.answer_question(token, question_name, body.answer)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return result


# ── Business Profile / SEO ────────────────────────────────────────────────────

@router.get("/locations/{location_id}/profile")
async def get_profile(location_id: str, db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    """Get the full GBP business profile including categories, hours, description."""
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    try:
        profile = await gbp_svc.get_location_profile(token, loc.gbp_location_id)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return profile


class ProfileUpdate(BaseModel):
    title: str | None = None
    websiteUri: str | None = None
    phone: str | None = None
    description: str | None = None
    regularHours: dict | None = None
    specialHours: dict | None = None
    categories: dict | None = None
    labels: list[str] | None = None


@router.patch("/locations/{location_id}/profile")
async def update_profile(
    location_id: str, body: ProfileUpdate,
    db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)
):
    """Update GBP profile fields. Only provided fields are changed."""
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)

    update_data = {}
    mask_fields = []

    if body.title is not None:
        update_data["title"] = body.title
        mask_fields.append("title")
    if body.websiteUri is not None:
        update_data["websiteUri"] = body.websiteUri
        mask_fields.append("websiteUri")
    if body.phone is not None:
        update_data["phoneNumbers"] = {"primaryPhone": body.phone}
        mask_fields.append("phoneNumbers")
    if body.description is not None:
        update_data["profile"] = {"description": body.description}
        mask_fields.append("profile.description")
    if body.regularHours is not None:
        update_data["regularHours"] = body.regularHours
        mask_fields.append("regularHours")
    if body.specialHours is not None:
        update_data["specialHours"] = body.specialHours
        mask_fields.append("specialHours")
    if body.categories is not None:
        update_data["categories"] = body.categories
        mask_fields.append("categories")
    if body.labels is not None:
        update_data["labels"] = body.labels
        mask_fields.append("labels")

    if not mask_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    try:
        result = await gbp_svc.update_location_profile(
            token, loc.gbp_location_id, update_data, ",".join(mask_fields)
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Mirror title/website/phone to our local location record
    if body.title:
        loc.store_name = body.title
    if body.websiteUri:
        loc.website = body.websiteUri
    if body.phone:
        loc.phone = body.phone
    await db.commit()

    return result


# ── Performance Insights ──────────────────────────────────────────────────────

METRIC_LABELS = {
    "BUSINESS_IMPRESSIONS_DESKTOP_MAPS":   "Desktop Map Views",
    "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH": "Desktop Search Views",
    "BUSINESS_IMPRESSIONS_MOBILE_MAPS":    "Mobile Map Views",
    "BUSINESS_IMPRESSIONS_MOBILE_SEARCH":  "Mobile Search Views",
    "CALL_CLICKS":                          "Phone Calls",
    "WEBSITE_CLICKS":                       "Website Clicks",
    "BUSINESS_DIRECTION_REQUESTS":          "Direction Requests",
    "BUSINESS_BOOKINGS":                    "Bookings",
    "BUSINESS_FOOD_ORDERS":                 "Food Orders",
}


@router.get("/locations/{location_id}/insights")
async def get_insights(
    location_id: str,
    days: int = Query(default=90, ge=7, le=540),
    db: AsyncSession = Depends(get_db),
    cu=Depends(get_current_user),
):
    """
    Fetch real performance insights from Google Business Profile Performance API.
    Returns daily timeseries + totals + week-over-week change for all metrics.
    """
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)

    end = date.today()
    start = end - timedelta(days=days)

    try:
        raw = await gbp_svc.get_performance(
            token,
            loc.gbp_location_id,
            (start.year, start.month, start.day),
            (end.year, end.month, end.day),
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Parse the nested Google response into clean timeseries per metric
    series_map: dict[str, dict[str, int]] = {}  # metric → {date_str: value}

    for entry in raw.get("multiDailyMetricTimeSeries", []):
        metric = entry.get("dailyMetric", "")
        ts = entry.get("timeSeries", {}).get("datedValues", [])
        daily: dict[str, int] = {}
        for point in ts:
            d = point.get("date", {})
            date_str = f"{d.get('year')}-{str(d.get('month', 1)).zfill(2)}-{str(d.get('day', 1)).zfill(2)}"
            daily[date_str] = int(point.get("value") or 0)
        series_map[metric] = daily

    # Build summary cards: total + vs previous period
    mid = start + timedelta(days=days // 2)
    summaries = []
    for metric in ALL_METRICS:
        daily = series_map.get(metric, {})
        total = sum(daily.values())
        current_half = sum(v for k, v in daily.items() if k >= str(mid))
        prev_half = sum(v for k, v in daily.items() if k < str(mid))
        change_pct = round(((current_half - prev_half) / prev_half * 100) if prev_half else 0)
        summaries.append({
            "metric": metric,
            "label": METRIC_LABELS.get(metric, metric),
            "total": total,
            "change_pct": change_pct,
            "daily": [{"date": k, "value": v} for k, v in sorted(daily.items())],
        })

    # Aggregate views
    total_views = sum(
        series_map.get(m, {}).values()
        for m in [
            "BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
            "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
        ]
    )
    total_searches = sum(
        series_map.get(m, {}).values()
        for m in ["BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH"]
    )
    total_maps = sum(
        series_map.get(m, {}).values()
        for m in ["BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_MAPS"]
    )

    return {
        "location_id": location_id,
        "location_name": loc.store_name,
        "period_days": days,
        "start_date": str(start),
        "end_date": str(end),
        "summary": {
            "total_views": total_views,
            "total_searches": total_searches,
            "total_map_views": total_maps,
            "total_calls": sum(series_map.get("CALL_CLICKS", {}).values()),
            "total_website_clicks": sum(series_map.get("WEBSITE_CLICKS", {}).values()),
            "total_directions": sum(series_map.get("BUSINESS_DIRECTION_REQUESTS", {}).values()),
        },
        "metrics": summaries,
    }


# ── Notifications ─────────────────────────────────────────────────────────────

NOTIFICATION_TYPE_LABELS = {
    "NEW_REVIEW":           "New review posted",
    "UPDATED_REVIEW":       "Review updated by customer",
    "NEW_CUSTOMER_MEDIA":   "Customer uploaded a photo",
    "NEW_QUESTION":         "New Q&A question asked",
    "UPDATED_QUESTION":     "Q&A question updated",
    "COMPETITOR_INSIGHTS":  "Competitor insights available",
}

ALL_NOTIFICATION_TYPES = list(NOTIFICATION_TYPE_LABELS.keys())


async def _get_account_name(tenant_id: str, db: AsyncSession) -> str:
    """Extract account name from the first location's gbp_location_id."""
    r = await db.execute(
        select(Location).where(
            Location.tenant_id == tenant_id,
            Location.gbp_location_id.isnot(None),
        ).limit(1)
    )
    loc = r.scalar_one_or_none()
    if not loc or not loc.gbp_location_id:
        raise HTTPException(status_code=400, detail="No GBP-linked locations found.")
    # Extract accounts/{id} from accounts/{id}/locations/{id}
    parts = loc.gbp_location_id.split("/locations/")
    return parts[0]


@router.get("/notifications/settings")
async def get_notification_settings(db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    """Get current Google notification settings for this account."""
    token = await _get_tenant_token(cu["tenant_id"], db)
    account_name = await _get_account_name(cu["tenant_id"], db)
    try:
        settings = await gbp_svc.get_notification_settings(token, account_name)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    enabled = set(settings.get("notificationTypes", []))
    return {
        "account": account_name,
        "notifications": [
            {
                "type": t,
                "label": NOTIFICATION_TYPE_LABELS[t],
                "enabled": t in enabled,
            }
            for t in ALL_NOTIFICATION_TYPES
        ],
    }


class NotificationUpdate(BaseModel):
    enabled_types: list[str]


@router.patch("/notifications/settings")
async def update_notification_settings(
    body: NotificationUpdate,
    db: AsyncSession = Depends(get_db),
    cu=Depends(get_current_user),
):
    """Enable or disable specific Google notification types."""
    token = await _get_tenant_token(cu["tenant_id"], db)
    account_name = await _get_account_name(cu["tenant_id"], db)
    try:
        result = await gbp_svc.update_notification_settings(token, account_name, body.enabled_types)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return result


# ── Place Actions (CTA Booking Links) ─────────────────────────────────────────

PLACE_ACTION_LABELS = {
    "APPOINTMENT":          "Book Appointment",
    "ONLINE_APPOINTMENT":   "Book Online Appointment",
    "DINING_RESERVATION":   "Reserve a Table",
    "FOOD_ORDERING":        "Order Food",
    "FOOD_DELIVERY":        "Food Delivery",
    "FOOD_TAKEOUT":         "Food Takeout",
    "SHOP_ONLINE":          "Shop Online",
}


@router.get("/locations/{location_id}/actions")
async def list_place_actions(location_id: str, db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    """List all CTA links (booking, ordering, reservations) on this GBP listing."""
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    try:
        actions = await gbp_svc.list_place_actions(token, loc.gbp_location_id)
        types = await gbp_svc.list_place_action_types(token, loc.gbp_location_id)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {
        "actions": [
            {
                "name": a.get("name"),
                "type": a.get("placeActionType"),
                "label": PLACE_ACTION_LABELS.get(a.get("placeActionType", ""), a.get("placeActionType")),
                "uri": a.get("uri"),
                "is_preferred": a.get("isPreferred", False),
                "is_editable": a.get("isEditable", True),
                "create_time": a.get("createTime"),
            }
            for a in actions
        ],
        "available_types": [
            {
                "type": t.get("placeActionType"),
                "label": PLACE_ACTION_LABELS.get(t.get("placeActionType", ""), t.get("placeActionType")),
            }
            for t in types
        ],
    }


class PlaceActionCreate(BaseModel):
    action_type: str
    uri: str


@router.post("/locations/{location_id}/actions", status_code=201)
async def create_place_action(
    location_id: str, body: PlaceActionCreate,
    db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)
):
    """Add a booking/ordering/reservation link to the GBP listing."""
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    if body.action_type not in PLACE_ACTION_LABELS:
        raise HTTPException(status_code=400, detail=f"Unknown action type: {body.action_type}")
    try:
        result = await gbp_svc.create_place_action(token, loc.gbp_location_id, body.action_type, body.uri)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return result


@router.delete("/locations/{location_id}/actions/{action_name:path}", status_code=204)
async def delete_place_action(
    location_id: str, action_name: str,
    db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)
):
    await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    try:
        await gbp_svc.delete_place_action(token, action_name)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── Verifications ─────────────────────────────────────────────────────────────

@router.get("/locations/{location_id}/verification")
async def get_verification(location_id: str, db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    """Get the current verification state of this listing."""
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    try:
        state = await gbp_svc.get_verification_state(token, loc.gbp_location_id)
        options = await gbp_svc.fetch_verification_options(token, loc.gbp_location_id)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    verifications = state.get("verifications", [])
    is_verified = any(v.get("state") == "COMPLETED" for v in verifications)

    return {
        "is_verified": is_verified,
        "verifications": verifications,
        "available_methods": [
            {
                "method": o.get("verificationMethod"),
                "description": {
                    "ADDRESS": "Receive a postcard at your business address (5-14 days)",
                    "PHONE_CALL": "Receive an automated phone call with a PIN",
                    "SMS": "Receive a text message with a PIN",
                    "EMAIL": "Receive an email with a verification link",
                    "VETTED_PARTNER": "Verified through a Google trusted partner",
                }.get(o.get("verificationMethod", ""), ""),
                "display_data": o.get("addressData") or o.get("emailData") or o.get("phoneData") or {},
            }
            for o in options
        ],
    }


class VerificationRequest(BaseModel):
    method: str
    context: dict | None = None


@router.post("/locations/{location_id}/verification/request")
async def request_verification(
    location_id: str, body: VerificationRequest,
    db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)
):
    """Initiate verification (sends postcard/SMS/phone call/email)."""
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    try:
        result = await gbp_svc.request_verification(token, loc.gbp_location_id, body.method, body.context)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return result


class PinSubmit(BaseModel):
    verification_name: str
    pin: str


@router.post("/locations/{location_id}/verification/complete")
async def complete_verification(
    location_id: str, body: PinSubmit,
    db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)
):
    """Submit the PIN to complete verification."""
    await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    try:
        result = await gbp_svc.complete_verification(token, body.verification_name, body.pin)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return result


# ── Lodging ───────────────────────────────────────────────────────────────────

@router.get("/locations/{location_id}/lodging")
async def get_lodging(location_id: str, db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)):
    """Get lodging-specific data (for hotels/resorts: amenities, rooms, policies)."""
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    try:
        data = await gbp_svc.get_lodging(token, loc.gbp_location_id)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return data


@router.patch("/locations/{location_id}/lodging")
async def update_lodging(
    location_id: str, body: dict,
    db: AsyncSession = Depends(get_db), cu=Depends(get_current_user)
):
    """Update lodging fields (amenities, room types, check-in policy, etc.)."""
    loc = await _get_location(location_id, cu["tenant_id"], db)
    token = await _get_tenant_token(cu["tenant_id"], db)
    update_mask = ",".join(body.pop("_update_mask", "").split(","))
    if not update_mask:
        raise HTTPException(status_code=400, detail="Provide _update_mask field")
    try:
        result = await gbp_svc.update_lodging(token, loc.gbp_location_id, body, update_mask)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return result
