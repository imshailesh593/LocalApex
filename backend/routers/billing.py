from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from models.tenant import Tenant
from services.auth import get_current_user
from services.razorpay_service import (
    create_subscription, verify_subscription_payment, verify_payment_signature, PLANS
)

router = APIRouter(prefix="/billing", tags=["Billing"])


class CreateSubscriptionRequest(BaseModel):
    plan_key: str


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str
    plan_key: str


@router.get("/plans")
async def list_plans():
    return {
        key: {
            "amount": cfg["amount"],
            "amount_display": f"₹{cfg['amount'] // 100}",
            "currency": cfg["currency"],
            "period": cfg["period"],
            "tier": cfg["tier"],
        }
        for key, cfg in PLANS.items()
    }


@router.post("/create-subscription")
async def create_sub(
    payload: CreateSubscriptionRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.plan_key not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user["tenant_id"])
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    user_email = current_user.get("email", "")
    try:
        sub = create_subscription(payload.plan_key, tenant.id, user_email)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Razorpay error: {str(e)}")

    return sub


@router.post("/verify-payment")
async def verify_payment(
    payload: VerifyPaymentRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ok = verify_subscription_payment(
        payload.razorpay_payment_id,
        payload.razorpay_subscription_id,
        payload.razorpay_signature,
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user["tenant_id"])
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    plan_cfg = PLANS.get(payload.plan_key, {})
    tenant.plan_type = plan_cfg.get("tier", "starter")
    tenant.razorpay_subscription_id = payload.razorpay_subscription_id
    await db.flush()

    return {"success": True, "plan": tenant.plan_type}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")

    if not verify_payment_signature(body, sig):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    import json
    event = json.loads(body)
    event_type = event.get("event")

    if event_type in ("subscription.charged", "payment.captured"):
        sub_id = (
            event.get("payload", {})
            .get("subscription", {})
            .get("entity", {})
            .get("id")
        )
        if sub_id:
            result = await db.execute(
                select(Tenant).where(Tenant.razorpay_subscription_id == sub_id)
            )
            tenant = result.scalar_one_or_none()
            if tenant:
                notes = (
                    event.get("payload", {})
                    .get("subscription", {})
                    .get("entity", {})
                    .get("notes", {})
                )
                plan_key = notes.get("plan_key", "")
                tier = PLANS.get(plan_key, {}).get("tier")
                if tier:
                    tenant.plan_type = tier
                await db.flush()

    elif event_type == "subscription.cancelled":
        sub_id = (
            event.get("payload", {})
            .get("subscription", {})
            .get("entity", {})
            .get("id")
        )
        if sub_id:
            result = await db.execute(
                select(Tenant).where(Tenant.razorpay_subscription_id == sub_id)
            )
            tenant = result.scalar_one_or_none()
            if tenant:
                tenant.plan_type = "free"
                await db.flush()

    return {"status": "ok"}
