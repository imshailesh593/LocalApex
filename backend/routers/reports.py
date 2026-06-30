from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from database import get_db
from models.location import Location
from models.review import ReviewFunnel
from models.citation import Citation
from models.competitor import Competitor
from models.insight import Insight
from models.tenant import Tenant
from services.auth import get_current_user
from services.resend_email import send_email

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


@router.post("/send-digest")
async def send_weekly_digest(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tid = current_user["tenant_id"]

    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tid))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant or not tenant.notification_email:
        raise HTTPException(status_code=400, detail="Set a notification email in Settings first")

    since = datetime.utcnow() - timedelta(days=7)

    locations = (await db.execute(
        select(Location).where(Location.tenant_id == tid, Location.is_deleted == False)
    )).scalars().all()

    new_reviews = (await db.execute(
        select(func.count(ReviewFunnel.id)).where(
            ReviewFunnel.tenant_id == tid,
            ReviewFunnel.is_deleted == False,
            ReviewFunnel.created_at >= since,
        )
    )).scalar() or 0

    avg_rating = (await db.execute(
        select(func.avg(ReviewFunnel.rating)).where(
            ReviewFunnel.tenant_id == tid,
            ReviewFunnel.is_deleted == False,
        )
    )).scalar()

    total_citations = (await db.execute(
        select(func.count(Citation.id)).where(Citation.tenant_id == tid, Citation.is_deleted == False)
    )).scalar() or 0
    consistent_citations = (await db.execute(
        select(func.count(Citation.id)).where(Citation.tenant_id == tid, Citation.is_deleted == False, Citation.status == "consistent")
    )).scalar() or 0
    nap_health = round((consistent_citations / total_citations) * 100) if total_citations else 0

    routed_this_week = (await db.execute(
        select(func.count(ReviewFunnel.id)).where(
            ReviewFunnel.tenant_id == tid,
            ReviewFunnel.is_deleted == False,
            ReviewFunnel.is_routed == True,
            ReviewFunnel.created_at >= since,
        )
    )).scalar() or 0

    location_rows = "".join(
        f"<tr><td style='padding:8px 12px;border-bottom:1px solid #f3f4f6'>{l.store_name}</td>"
        f"<td style='padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280'>{l.city or '—'}</td></tr>"
        for l in locations[:10]
    )

    avg_str = f"{round(float(avg_rating), 1)}" if avg_rating else "—"
    week_str = since.strftime("%b %d") + " – " + datetime.utcnow().strftime("%b %d, %Y")

    html = f"""
    <div style="font-family:sans-serif;max-width:560px;margin:auto">
      <div style="background:#1d4ed8;padding:24px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">📊 Weekly Digest — {tenant.business_name}</h1>
        <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">{week_str}</p>
      </div>
      <div style="background:#f8fafc;padding:24px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
        <div style="background:#fff;border-radius:10px;padding:16px;border:1px solid #e5e7eb">
          <p style="margin:0;font-size:13px;color:#6b7280">New Reviews (7d)</p>
          <p style="margin:4px 0 0;font-size:28px;font-weight:800;color:#111">{new_reviews}</p>
        </div>
        <div style="background:#fff;border-radius:10px;padding:16px;border:1px solid #e5e7eb">
          <p style="margin:0;font-size:13px;color:#6b7280">Avg Rating (all-time)</p>
          <p style="margin:4px 0 0;font-size:28px;font-weight:800;color:#111">{'⭐ ' + avg_str}</p>
        </div>
        <div style="background:#fff;border-radius:10px;padding:16px;border:1px solid #e5e7eb">
          <p style="margin:0;font-size:13px;color:#6b7280">Routed to Google (7d)</p>
          <p style="margin:4px 0 0;font-size:28px;font-weight:800;color:#16a34a">{routed_this_week}</p>
        </div>
        <div style="background:#fff;border-radius:10px;padding:16px;border:1px solid #e5e7eb">
          <p style="margin:0;font-size:13px;color:#6b7280">NAP Health</p>
          <p style="margin:4px 0 0;font-size:28px;font-weight:800;color:{'#16a34a' if nap_health >= 80 else '#dc2626'}">{nap_health}%</p>
        </div>
      </div>
      {f'''<div style="padding:0 24px 24px;background:#f8fafc">
        <h2 style="font-size:14px;font-weight:600;color:#374151;margin:0 0 12px">Your locations ({len(locations)})</h2>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
          <thead><tr>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;background:#f9fafb">Location</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;background:#f9fafb">City</th>
          </tr></thead>
          <tbody>{location_rows}</tbody>
        </table>
      </div>''' if locations else ''}
      <div style="padding:16px 24px;background:#f8fafc;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center">
        Sent by LocalApex · <a href="#" style="color:#6b7280">Manage notification settings</a>
      </div>
    </div>
    """

    await send_email(tenant.notification_email, f"📊 Weekly digest — {tenant.business_name}", html)
    return {"sent": True, "to": tenant.notification_email}
