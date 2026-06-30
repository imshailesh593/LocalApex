import csv
import io
import qrcode
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.location import Location
from schemas.location import LocationCreate, LocationUpdate, LocationResponse
from services.auth import get_current_user
from services.activity import log as activity_log
from config import get_settings

settings = get_settings()

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("", response_model=list[LocationResponse])
async def list_locations(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Location).where(Location.tenant_id == current_user["tenant_id"], Location.is_deleted == False)
    )
    return result.scalars().all()


@router.post("", response_model=LocationResponse, status_code=201)
async def create_location(payload: LocationCreate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    location = Location(tenant_id=current_user["tenant_id"], **payload.model_dump())
    db.add(location)
    await db.flush()
    await db.refresh(location)
    await activity_log(db, current_user["tenant_id"], f"Added location: {location.store_name}", "location", location.store_name, current_user["sub"])
    return location


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(location_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.tenant_id == current_user["tenant_id"])
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.patch("/{location_id}", response_model=LocationResponse)
async def update_location(location_id: str, payload: LocationUpdate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.tenant_id == current_user["tenant_id"])
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(location, field, value)
    return location


@router.get("/{location_id}/qrcode")
async def get_qr_code(location_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.tenant_id == current_user["tenant_id"])
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    if not location.funnel_slug:
        raise HTTPException(status_code=400, detail="This location has no funnel slug set")

    url = f"{settings.frontend_url}/r/{location.funnel_slug}"
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1d4ed8", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="qr-{location.funnel_slug}.png"'},
    )


@router.post("/import-csv")
async def import_locations_csv(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    text = content.decode("utf-8-sig").strip()
    reader = csv.DictReader(io.StringIO(text))
    imported, errors = 0, []
    for i, row in enumerate(reader, 1):
        name = (row.get("store_name") or row.get("name") or "").strip()
        address = (row.get("address") or "").strip()
        if not name or not address:
            errors.append(f"Row {i}: missing store_name or address")
            continue
        loc = Location(
            tenant_id=current_user["tenant_id"],
            store_name=name,
            address=address,
            city=(row.get("city") or "").strip() or None,
            phone=(row.get("phone") or "").strip() or None,
            website=(row.get("website") or "").strip() or None,
        )
        db.add(loc)
        imported += 1
    if imported:
        await activity_log(db, current_user["tenant_id"], f"Imported {imported} locations from CSV", "location", None, current_user["sub"])
    return {"imported": imported, "errors": errors}


@router.delete("/{location_id}", status_code=204)
async def delete_location(location_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.tenant_id == current_user["tenant_id"])
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    location.is_deleted = True
