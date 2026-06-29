from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.location import Location
from schemas.location import LocationUpdate, LocationResponse
from services.auth import get_current_user

router = APIRouter(prefix="/nap", tags=["NAP & Hours Manager"])


@router.get("/{location_id}", response_model=LocationResponse)
async def get_nap(location_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.tenant_id == current_user["tenant_id"])
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.patch("/{location_id}", response_model=LocationResponse)
async def update_nap(location_id: str, payload: LocationUpdate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.tenant_id == current_user["tenant_id"])
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(location, field, value)
    return location
