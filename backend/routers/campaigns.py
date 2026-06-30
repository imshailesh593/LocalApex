from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timezone
from database import get_db
from models.campaign import ReviewCampaign
from models.location import Location
from models.tenant import Tenant
from services.auth import get_current_user
from services.resend_email import send_email, review_request_html
import json

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


class CampaignCreate(BaseModel):
    name: str
    location_id: str
    emails: list[str]
    custom_message: str = ""
    scheduled_at: datetime


class CampaignResponse(BaseModel):
    id: str
    name: str
    location_id: str
    emails: list[str]
    custom_message: str | None
    scheduled_at: datetime
    sent_at: datetime | None
    sent_count: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[CampaignResponse])
async def list_campaigns(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ReviewCampaign)
        .where(ReviewCampaign.tenant_id == current_user["tenant_id"])
        .order_by(ReviewCampaign.scheduled_at.desc())
    )
    campaigns = result.scalars().all()
    out = []
    for c in campaigns:
        d = CampaignResponse(
            id=c.id, name=c.name, location_id=c.location_id,
            emails=json.loads(c.emails),
            custom_message=c.custom_message,
            scheduled_at=c.scheduled_at, sent_at=c.sent_at,
            sent_count=c.sent_count, status=c.status, created_at=c.created_at,
        )
        out.append(d)
    return out


@router.post("", status_code=201)
async def create_campaign(
    payload: CampaignCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    loc = await db.execute(
        select(Location).where(Location.id == payload.location_id, Location.tenant_id == current_user["tenant_id"])
    )
    if not loc.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Location not found")

    campaign = ReviewCampaign(
        tenant_id=current_user["tenant_id"],
        location_id=payload.location_id,
        name=payload.name,
        emails=json.dumps(payload.emails),
        custom_message=payload.custom_message or None,
        scheduled_at=payload.scheduled_at,
    )
    db.add(campaign)
    await db.flush()
    await db.refresh(campaign)
    return {"id": campaign.id, "status": campaign.status, "scheduled_at": campaign.scheduled_at.isoformat()}


@router.delete("/{campaign_id}", status_code=204)
async def cancel_campaign(campaign_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ReviewCampaign).where(
            ReviewCampaign.id == campaign_id,
            ReviewCampaign.tenant_id == current_user["tenant_id"],
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == "sent":
        raise HTTPException(status_code=400, detail="Cannot cancel a sent campaign")
    campaign.status = "cancelled"


@router.post("/run-pending")
async def run_pending_campaigns(db: AsyncSession = Depends(get_db)):
    """Called by external cron (e.g. every 5 minutes). No auth — protect with firewall or internal network."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    result = await db.execute(
        select(ReviewCampaign).where(
            ReviewCampaign.status == "pending",
            ReviewCampaign.scheduled_at <= now,
        )
    )
    campaigns = result.scalars().all()
    fired = 0

    for campaign in campaigns:
        loc_res = await db.execute(select(Location).where(Location.id == campaign.location_id))
        location = loc_res.scalar_one_or_none()
        if not location or not location.funnel_slug:
            campaign.status = "failed"
            continue

        tenant_res = await db.execute(select(Tenant).where(Tenant.id == campaign.tenant_id))
        tenant = tenant_res.scalar_one_or_none()
        business_name = tenant.business_name if tenant else location.store_name
        brand_color = getattr(tenant, "brand_color", "#1d4ed8") if tenant else "#1d4ed8"

        funnel_url = f"{location.funnel_slug}"
        emails = json.loads(campaign.emails)
        sent = 0
        for email in emails:
            html = review_request_html(business_name, funnel_url, campaign.custom_message or "", brand_color)
            await send_email(email, f"How was your experience at {business_name}?", html)
            sent += 1

        campaign.status = "sent"
        campaign.sent_at = datetime.utcnow()
        campaign.sent_count = sent
        fired += 1

    return {"processed": len(campaigns), "sent": fired}
