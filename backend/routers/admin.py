from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from database import get_db
from services.auth import get_current_user
from models.tenant import Tenant, PlanType, TenantStatus
from models.user import User
from models.review import ReviewFunnel
from models.location import Location
from pydantic import BaseModel
from typing import Any

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_superadmin(cu=Depends(get_current_user)):
    if cu.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return cu


# ── Platform Analytics ───────────────────────────────────────────────────────

@router.get("/stats")
async def platform_stats(db: AsyncSession = Depends(get_db), _=Depends(_require_superadmin)):
    total_tenants = (await db.execute(select(func.count(Tenant.id)))).scalar_one()
    active_tenants = (await db.execute(select(func.count(Tenant.id)).where(Tenant.status == TenantStatus.active))).scalar_one()
    trial_tenants = (await db.execute(select(func.count(Tenant.id)).where(Tenant.status == TenantStatus.trial))).scalar_one()
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    total_locations = (await db.execute(select(func.count(Location.id)).where(Location.is_deleted == False))).scalar_one()
    total_reviews = (await db.execute(select(func.count(ReviewFunnel.id)).where(ReviewFunnel.is_deleted == False))).scalar_one()

    plan_counts: dict[str, int] = {}
    for plan in PlanType:
        n = (await db.execute(select(func.count(Tenant.id)).where(Tenant.plan_type == plan))).scalar_one()
        plan_counts[plan.value] = n

    # Signups per day (last 30 days)
    signups = await db.execute(text("""
        SELECT DATE(created_at) AS day, COUNT(*) AS n
        FROM tenants
        WHERE created_at >= NOW() - INTERVAL 30 DAY
        GROUP BY day ORDER BY day
    """))
    signup_trend = [{"date": str(r.day), "count": r.n} for r in signups.fetchall()]

    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "trial_tenants": trial_tenants,
        "total_users": total_users,
        "total_locations": total_locations,
        "total_reviews": total_reviews,
        "plan_breakdown": plan_counts,
        "signup_trend": signup_trend,
    }


# ── Tenants ──────────────────────────────────────────────────────────────────

@router.get("/tenants")
async def list_tenants(
    page: int = 1,
    per_page: int = 25,
    search: str = "",
    plan: str = "",
    status: str = "",
    db: AsyncSession = Depends(get_db),
    _=Depends(_require_superadmin),
):
    q = select(Tenant)
    if search:
        q = q.where(Tenant.business_name.ilike(f"%{search}%"))
    if plan:
        q = q.where(Tenant.plan_type == plan)
    if status:
        q = q.where(Tenant.status == status)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    result = await db.execute(q.order_by(Tenant.created_at.desc()).offset((page - 1) * per_page).limit(per_page))
    tenants = result.scalars().all()

    rows = []
    for t in tenants:
        loc_count = (await db.execute(
            select(func.count(Location.id)).where(Location.tenant_id == t.id, Location.is_deleted == False)
        )).scalar_one()
        gbp_loc_count = (await db.execute(
            select(func.count(Location.id)).where(
                Location.tenant_id == t.id,
                Location.is_deleted == False,
                Location.gbp_location_id.isnot(None),
            )
        )).scalar_one()
        rev_count = (await db.execute(
            select(func.count(ReviewFunnel.id)).where(ReviewFunnel.tenant_id == t.id, ReviewFunnel.is_deleted == False)
        )).scalar_one()
        google_rev_count = (await db.execute(
            select(func.count(ReviewFunnel.id)).where(
                ReviewFunnel.tenant_id == t.id,
                ReviewFunnel.is_deleted == False,
                ReviewFunnel.source == "google",
            )
        )).scalar_one()
        replied_count = (await db.execute(
            select(func.count(ReviewFunnel.id)).where(
                ReviewFunnel.tenant_id == t.id,
                ReviewFunnel.is_deleted == False,
                ReviewFunnel.source == "google",
                ReviewFunnel.google_reply.isnot(None),
            )
        )).scalar_one()
        user_count = (await db.execute(
            select(func.count(User.id)).where(User.tenant_id == t.id)
        )).scalar_one()
        rows.append({
            "id": t.id,
            "business_name": t.business_name,
            "plan_type": t.plan_type,
            "status": t.status,
            "locations": loc_count,
            "gbp_connected": gbp_loc_count > 0,
            "gbp_locations": gbp_loc_count,
            "reviews": rev_count,
            "google_reviews": google_rev_count,
            "response_rate": round(replied_count / google_rev_count * 100) if google_rev_count else 0,
            "users": user_count,
            "created_at": t.created_at,
            "razorpay_subscription_id": t.razorpay_subscription_id,
        })

    return {"total": total, "page": page, "per_page": per_page, "tenants": rows}


@router.get("/tenants/{tenant_id}")
async def get_tenant(tenant_id: str, db: AsyncSession = Depends(get_db), _=Depends(_require_superadmin)):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    users_r = await db.execute(select(User).where(User.tenant_id == tenant_id))
    users = users_r.scalars().all()

    locations_r = await db.execute(select(Location).where(Location.tenant_id == tenant_id, Location.is_deleted == False))
    locations = locations_r.scalars().all()

    reviews_r = await db.execute(
        select(ReviewFunnel.rating, ReviewFunnel.sentiment, ReviewFunnel.status,
               ReviewFunnel.source, ReviewFunnel.google_reply, ReviewFunnel.created_at)
        .where(ReviewFunnel.tenant_id == tenant_id, ReviewFunnel.is_deleted == False)
        .order_by(ReviewFunnel.created_at.desc())
        .limit(10)
    )
    recent_reviews = [dict(r._mapping) for r in reviews_r.fetchall()]

    # GBP summary
    gbp_locs = [l for l in locations if l.gbp_location_id]
    total_google_reviews = (await db.execute(
        select(func.count(ReviewFunnel.id)).where(
            ReviewFunnel.tenant_id == tenant_id, ReviewFunnel.source == "google"
        )
    )).scalar_one()
    replied_google = (await db.execute(
        select(func.count(ReviewFunnel.id)).where(
            ReviewFunnel.tenant_id == tenant_id,
            ReviewFunnel.source == "google",
            ReviewFunnel.google_reply.isnot(None),
        )
    )).scalar_one()
    avg_rating_r = await db.execute(
        select(func.avg(ReviewFunnel.rating)).where(
            ReviewFunnel.tenant_id == tenant_id,
            ReviewFunnel.source == "google",
        )
    )
    avg_rating = round(float(avg_rating_r.scalar_one() or 0), 1)

    return {
        "tenant": {
            "id": tenant.id,
            "business_name": tenant.business_name,
            "plan_type": tenant.plan_type,
            "status": tenant.status,
            "api_key": tenant.api_key,
            "notification_email": tenant.notification_email,
            "logo_url": tenant.logo_url,
            "brand_color": tenant.brand_color,
            "razorpay_subscription_id": tenant.razorpay_subscription_id,
            "zernio_profile_id": tenant.zernio_profile_id,
            "gmb_connected": bool(tenant.gmb_refresh_token),
            "created_at": tenant.created_at,
        },
        "users": [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "created_at": u.created_at} for u in users],
        "locations": [
            {
                "id": l.id,
                "store_name": l.store_name,
                "city": l.city,
                "funnel_slug": l.funnel_slug,
                "gbp_connected": bool(l.gbp_location_id),
                "gbp_location_id": l.gbp_location_id,
            }
            for l in locations
        ],
        "recent_reviews": recent_reviews,
        "gbp_summary": {
            "connected": bool(tenant.gmb_refresh_token),
            "linked_locations": len(gbp_locs),
            "total_google_reviews": total_google_reviews,
            "replied": replied_google,
            "response_rate": round(replied_google / total_google_reviews * 100) if total_google_reviews else 0,
            "avg_rating": avg_rating,
        },
    }


class TenantPatch(BaseModel):
    plan_type: str | None = None
    status: str | None = None


@router.patch("/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, body: TenantPatch, db: AsyncSession = Depends(get_db), _=Depends(_require_superadmin)):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if body.plan_type:
        tenant.plan_type = body.plan_type
    if body.status:
        tenant.status = body.status
    await db.commit()
    return {"id": tenant.id, "plan_type": tenant.plan_type, "status": tenant.status}


@router.post("/tenants/{tenant_id}/impersonate")
async def impersonate_tenant(tenant_id: str, db: AsyncSession = Depends(get_db), cu=Depends(_require_superadmin)):
    """Returns a short-lived token scoped to the target tenant for debugging."""
    from services.auth import create_access_token

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Find first admin user of that tenant
    user_r = await db.execute(
        select(User).where(User.tenant_id == tenant_id).limit(1)
    )
    user = user_r.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="No users in this tenant")

    token = create_access_token({"sub": user.id, "tenant_id": tenant_id, "role": user.role, "impersonated_by": cu["sub"]})
    return {"token": token, "tenant": tenant.business_name, "user": user.email}


# ── Users ────────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_all_users(
    page: int = 1,
    per_page: int = 50,
    search: str = "",
    db: AsyncSession = Depends(get_db),
    _=Depends(_require_superadmin),
):
    q = select(User)
    if search:
        q = q.where(User.email.ilike(f"%{search}%") | User.name.ilike(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    result = await db.execute(q.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page))
    users = result.scalars().all()
    return {
        "total": total,
        "users": [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "tenant_id": u.tenant_id, "created_at": u.created_at} for u in users],
    }


@router.patch("/users/{user_id}/role")
async def set_user_role(user_id: str, body: dict, db: AsyncSession = Depends(get_db), _=Depends(_require_superadmin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = body.get("role", user.role)
    await db.commit()
    return {"id": user.id, "role": user.role}
