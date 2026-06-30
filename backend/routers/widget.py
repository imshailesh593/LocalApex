from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import Depends
from database import get_db
from models.location import Location
from models.review import ReviewFunnel
from models.tenant import Tenant

router = APIRouter(prefix="/widget", tags=["Widget"])


@router.get("/data/{funnel_slug}")
async def widget_data(funnel_slug: str, db: AsyncSession = Depends(get_db)):
    loc_result = await db.execute(
        select(Location).where(Location.funnel_slug == funnel_slug, Location.is_deleted == False)
    )
    location = loc_result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Not found")

    stats = await db.execute(
        select(
            func.count(ReviewFunnel.id).label("total"),
            func.avg(ReviewFunnel.rating).label("avg"),
        ).where(
            ReviewFunnel.location_id == location.id,
            ReviewFunnel.is_deleted == False,
        )
    )
    row = stats.one()
    total = row.total or 0
    avg = round(float(row.avg or 0), 1)

    dist: dict[int, int] = {}
    for star in range(1, 6):
        r = await db.execute(
            select(func.count(ReviewFunnel.id)).where(
                ReviewFunnel.location_id == location.id,
                ReviewFunnel.rating == star,
                ReviewFunnel.is_deleted == False,
            )
        )
        dist[star] = r.scalar() or 0

    tenant_res = await db.execute(select(Tenant).where(Tenant.id == location.tenant_id))
    tenant = tenant_res.scalar_one_or_none()

    return {
        "business_name": location.store_name,
        "logo_url": tenant.logo_url if tenant else None,
        "avg_rating": avg,
        "total_reviews": total,
        "star_distribution": dist,
        "funnel_url": f"/r/{funnel_slug}",
    }


@router.get("/embed/{funnel_slug}", response_class=HTMLResponse)
async def widget_embed(funnel_slug: str, db: AsyncSession = Depends(get_db)):
    data = await widget_data(funnel_slug, db)
    avg = data["avg_rating"]
    total = data["total_reviews"]
    name = data["business_name"]
    logo = data.get("logo_url") or ""
    funnel_url = data["funnel_url"]
    dist = data["star_distribution"]
    max_count = max(dist.values(), default=1) or 1

    stars_html = ""
    for star in range(5, 0, -1):
        count = dist.get(star, 0)
        pct = round((count / max_count) * 100)
        color = "#22c55e" if star >= 4 else "#eab308" if star == 3 else "#ef4444"
        stars_html += f"""
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:12px;color:#6b7280;width:16px;text-align:right">{star}★</span>
          <div style="flex:1;height:6px;background:#f3f4f6;border-radius:9999px;overflow:hidden">
            <div style="height:100%;width:{pct}%;background:{color};border-radius:9999px"></div>
          </div>
          <span style="font-size:11px;color:#9ca3af;width:20px">{count}</span>
        </div>"""

    filled = int(avg)
    half = 1 if avg - filled >= 0.5 else 0
    star_display = "★" * filled + ("½" if half else "") + "☆" * (5 - filled - half)

    logo_html = f'<img src="{logo}" style="height:32px;object-fit:contain;margin-bottom:8px" alt="Logo">' if logo else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{name} Reviews</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: transparent; }}
  .widget {{ border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; background: #fff; max-width: 300px; }}
  .avg {{ font-size: 36px; font-weight: 700; color: #111; }}
  .stars {{ font-size: 22px; color: #f59e0b; letter-spacing: 2px; }}
  .total {{ font-size: 13px; color: #9ca3af; margin-top: 2px; }}
  .cta {{ display: block; margin-top: 16px; background: #1d4ed8; color: #fff; text-align: center;
          padding: 10px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; }}
  .cta:hover {{ background: #1e40af; }}
</style>
</head>
<body>
<div class="widget">
  {logo_html}
  <div style="font-size:14px;font-weight:600;color:#374151;margin-bottom:12px">{name}</div>
  <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
    <span class="avg">{avg}</span>
    <span class="stars">{"★" * round(avg)}{"☆" * (5 - round(avg))}</span>
  </div>
  <div class="total">{total} review{"s" if total != 1 else ""}</div>
  <div style="margin-top:14px">{stars_html}</div>
  <a href="{funnel_url}" target="_blank" class="cta">Leave a Review →</a>
</div>
</body>
</html>"""
