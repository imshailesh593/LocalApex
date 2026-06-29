from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models.insight import Insight, InsightMetric
from schemas.insight import InsightCreate, InsightSummary
from services.auth import get_current_user
from datetime import date, timedelta
import csv, io

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/summary", response_model=list[InsightSummary])
async def get_summary(location_id: str | None = None, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = (
        select(Insight.metric, Insight.location_id, func.sum(Insight.value).label("total"))
        .where(Insight.tenant_id == current_user["tenant_id"], Insight.is_deleted == False)
        .group_by(Insight.metric, Insight.location_id)
    )
    if location_id:
        query = query.where(Insight.location_id == location_id)
    result = await db.execute(query)
    return [InsightSummary(metric=row.metric, location_id=row.location_id, total=row.total) for row in result.all()]


@router.get("/timeseries")
async def get_timeseries(
    metric: str,
    location_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if date_to is None:
        date_to = date.today()
    if date_from is None:
        date_from = date_to - timedelta(days=29)

    query = (
        select(Insight.date, func.sum(Insight.value).label("value"))
        .where(
            Insight.tenant_id == current_user["tenant_id"],
            Insight.is_deleted == False,
            Insight.metric == metric,
            Insight.date >= date_from,
            Insight.date <= date_to,
        )
        .group_by(Insight.date)
        .order_by(Insight.date)
    )
    if location_id:
        query = query.where(Insight.location_id == location_id)

    result = await db.execute(query)
    rows = {row.date.isoformat(): row.value for row in result.all()}

    # Fill missing days with 0
    series = []
    cur = date_from
    while cur <= date_to:
        series.append({"date": cur.isoformat(), "value": rows.get(cur.isoformat(), 0)})
        cur += timedelta(days=1)
    return series


@router.post("/import-csv", status_code=201)
async def import_csv(
    location_id: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # handles BOM from Excel exports
        reader = csv.DictReader(io.StringIO(text))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse CSV")

    metric_values = {m.value for m in InsightMetric}
    imported = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        try:
            row_date = date.fromisoformat(row.get("date", "").strip())
            metric_raw = row.get("metric", "").strip().lower()
            value_raw = row.get("value", "0").strip()
            if metric_raw not in metric_values:
                errors.append(f"Row {i}: unknown metric '{metric_raw}'")
                continue
            insight = Insight(
                tenant_id=current_user["tenant_id"],
                location_id=location_id,
                metric=InsightMetric(metric_raw),
                value=int(float(value_raw)),
                date=row_date,
                source="csv_import",
            )
            db.add(insight)
            imported += 1
        except Exception as e:
            errors.append(f"Row {i}: {e}")

    await db.flush()
    return {"imported": imported, "errors": errors}


@router.post("", status_code=201)
async def record_insight(payload: InsightCreate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    insight = Insight(tenant_id=current_user["tenant_id"], **payload.model_dump())
    db.add(insight)
    await db.flush()
    return {"status": "recorded"}
