from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, HttpUrl
from database import get_db
from models.webhook import Webhook
from services.auth import get_current_user
from services.webhooks import fire

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

VALID_EVENTS = {"review.new", "review.responded", "citation.inconsistent", "qa.new"}


class WebhookCreate(BaseModel):
    url: str
    events: list[str] = ["review.new"]


class WebhookResponse(BaseModel):
    id: str
    url: str
    secret: str
    events: str
    is_active: bool
    model_config = {"from_attributes": True}


@router.get("", response_model=list[WebhookResponse])
async def list_webhooks(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Webhook).where(Webhook.tenant_id == current_user["tenant_id"])
        .order_by(Webhook.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=WebhookResponse, status_code=201)
async def create_webhook(payload: WebhookCreate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    events_str = ",".join(e for e in payload.events if e in VALID_EVENTS) or "review.new"
    hook = Webhook(
        tenant_id=current_user["tenant_id"],
        url=payload.url,
        events=events_str,
    )
    db.add(hook)
    await db.flush()
    await db.refresh(hook)
    return hook


@router.delete("/{hook_id}", status_code=204)
async def delete_webhook(hook_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Webhook).where(Webhook.id == hook_id, Webhook.tenant_id == current_user["tenant_id"])
    )
    hook = result.scalar_one_or_none()
    if not hook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    await db.delete(hook)


@router.post("/{hook_id}/test", status_code=200)
async def test_webhook(hook_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Webhook).where(Webhook.id == hook_id, Webhook.tenant_id == current_user["tenant_id"])
    )
    hook = result.scalar_one_or_none()
    if not hook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    await fire(hook.url, hook.secret, "webhook.test", {"message": "Test ping from LocalApex"})
    return {"ok": True}


@router.patch("/{hook_id}/toggle", response_model=WebhookResponse)
async def toggle_webhook(hook_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Webhook).where(Webhook.id == hook_id, Webhook.tenant_id == current_user["tenant_id"])
    )
    hook = result.scalar_one_or_none()
    if not hook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    hook.is_active = not hook.is_active
    return hook
