from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from models.response_template import ResponseTemplate
from services.auth import get_current_user

router = APIRouter(prefix="/templates", tags=["Response Templates"])


class TemplateCreate(BaseModel):
    name: str
    body: str
    tone: str = "professional"


class TemplateUpdate(BaseModel):
    name: str | None = None
    body: str | None = None
    tone: str | None = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    body: str
    tone: str
    model_config = {"from_attributes": True}


@router.get("", response_model=list[TemplateResponse])
async def list_templates(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ResponseTemplate)
        .where(ResponseTemplate.tenant_id == current_user["tenant_id"])
        .order_by(ResponseTemplate.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=TemplateResponse, status_code=201)
async def create_template(payload: TemplateCreate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tpl = ResponseTemplate(tenant_id=current_user["tenant_id"], **payload.model_dump())
    db.add(tpl)
    await db.flush()
    await db.refresh(tpl)
    return tpl


@router.patch("/{tpl_id}", response_model=TemplateResponse)
async def update_template(tpl_id: str, payload: TemplateUpdate, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ResponseTemplate).where(ResponseTemplate.id == tpl_id, ResponseTemplate.tenant_id == current_user["tenant_id"])
    )
    tpl = result.scalar_one_or_none()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(tpl, field, value)
    return tpl


@router.delete("/{tpl_id}", status_code=204)
async def delete_template(tpl_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ResponseTemplate).where(ResponseTemplate.id == tpl_id, ResponseTemplate.tenant_id == current_user["tenant_id"])
    )
    tpl = result.scalar_one_or_none()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(tpl)
