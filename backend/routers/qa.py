from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.qa import QAEntry
from models.tenant import Tenant
from schemas.qa import QACreate, QAUpdate, QAResponse
from services.auth import get_current_user
from services.ai_responder import suggest_qa_answer

router = APIRouter(prefix="/qa", tags=["Q&A Manager"])


@router.get("", response_model=list[QAResponse])
async def list_qa(location_id: str | None = None, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(QAEntry).where(QAEntry.tenant_id == current_user["tenant_id"], QAEntry.is_deleted == False)
    if location_id:
        query = query.where(QAEntry.location_id == location_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=QAResponse, status_code=201)
async def create_qa(payload: QACreate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    entry = QAEntry(tenant_id=current_user["tenant_id"], **payload.model_dump())
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


@router.delete("/{qa_id}", status_code=204)
async def delete_qa(qa_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QAEntry).where(QAEntry.id == qa_id, QAEntry.tenant_id == current_user["tenant_id"])
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Q&A entry not found")
    entry.is_deleted = True


@router.post("/{qa_id}/suggest-answer", response_model=QAResponse)
async def suggest_answer(qa_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QAEntry).where(QAEntry.id == qa_id, QAEntry.tenant_id == current_user["tenant_id"])
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Q&A entry not found")

    tenant_result = await db.execute(select(Tenant).where(Tenant.id == current_user["tenant_id"]))
    tenant = tenant_result.scalar_one_or_none()
    business_name = tenant.business_name if tenant else "our business"

    entry.answer = await suggest_qa_answer(entry.question, business_name)
    entry.is_auto_answered = True
    await db.flush()
    await db.refresh(entry)
    return entry


@router.patch("/{qa_id}", response_model=QAResponse)
async def update_qa(qa_id: str, payload: QAUpdate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QAEntry).where(QAEntry.id == qa_id, QAEntry.tenant_id == current_user["tenant_id"])
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Q&A entry not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(entry, field, value)
    return entry
