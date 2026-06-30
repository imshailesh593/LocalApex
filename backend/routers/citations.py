from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models.citation import Citation, CitationStatus
from models.location import Location
from schemas.citation import CitationCreate, CitationResponse
from services.auth import get_current_user
import csv, io

router = APIRouter(prefix="/citations", tags=["Citations"])


@router.get("", response_model=list[CitationResponse])
async def list_citations(
    location_id: str | None = None,
    status: str | None = None,
    page: int = 1,
    per_page: int = 20,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Citation).where(Citation.tenant_id == current_user["tenant_id"], Citation.is_deleted == False)
    if location_id:
        query = query.where(Citation.location_id == location_id)
    if status:
        query = query.where(Citation.status == status)
    per_page = min(per_page, 100)
    query = query.order_by(Citation.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/export")
async def export_citations(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Citation).where(
            Citation.tenant_id == current_user["tenant_id"],
            Citation.is_deleted == False,
        ).order_by(Citation.created_at.desc())
    )
    citations = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['id', 'platform', 'listed_name', 'listed_address', 'listed_phone',
                     'listed_website', 'status', 'nap_issues', 'profile_url', 'created_at'])
    for c in citations:
        writer.writerow([c.id, c.platform, c.listed_name, c.listed_address, c.listed_phone,
                         c.listed_website, c.status, c.nap_issues, c.profile_url, c.created_at])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="citations.csv"'},
    )


@router.post("", response_model=CitationResponse, status_code=201)
async def create_citation(payload: CitationCreate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    citation = Citation(tenant_id=current_user["tenant_id"], **payload.model_dump())
    db.add(citation)
    await db.flush()
    await db.refresh(citation)
    return citation


@router.post("/{citation_id}/check", response_model=CitationResponse)
async def check_citation_nap(citation_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Citation).where(Citation.id == citation_id, Citation.tenant_id == current_user["tenant_id"])
    )
    citation = result.scalar_one_or_none()
    if not citation:
        raise HTTPException(status_code=404, detail="Citation not found")

    loc_result = await db.execute(select(Location).where(Location.id == citation.location_id))
    location = loc_result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    def norm(s: str | None) -> str:
        return (s or "").strip().lower()

    name_ok = not citation.listed_name or norm(citation.listed_name) == norm(location.store_name)
    addr_ok = not citation.listed_address or norm(citation.listed_address) == norm(location.address)
    phone_ok = not citation.listed_phone or norm(citation.listed_phone) == norm(location.phone)

    citation.nap_match = name_ok and addr_ok and phone_ok
    citation.status = CitationStatus.consistent if citation.nap_match else CitationStatus.inconsistent
    await db.flush()
    await db.refresh(citation)
    return citation


@router.delete("/{citation_id}", status_code=204)
async def delete_citation(citation_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Citation).where(Citation.id == citation_id, Citation.tenant_id == current_user["tenant_id"])
    )
    citation = result.scalar_one_or_none()
    if not citation:
        raise HTTPException(status_code=404, detail="Citation not found")
    citation.is_deleted = True


@router.get("/summary")
async def citation_summary(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Citation.status, func.count(Citation.id))
        .where(Citation.tenant_id == current_user["tenant_id"], Citation.is_deleted == False)
        .group_by(Citation.status)
    )
    return {status: count for status, count in result.all()}
