from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.media import Media, MediaCategory
from schemas.media import MediaResponse
from services.auth import get_current_user
import os, uuid

router = APIRouter(prefix="/media", tags=["Media"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=list[MediaResponse])
async def list_media(location_id: str | None = None, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(Media).where(Media.tenant_id == current_user["tenant_id"], Media.is_deleted == False)
    if location_id:
        query = query.where(Media.location_id == location_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/upload", response_model=MediaResponse, status_code=201)
async def upload_media(
    location_id: str = Form(...),
    category: MediaCategory = Form(MediaCategory.additional),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, current_user["tenant_id"], unique_name)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    media = Media(
        tenant_id=current_user["tenant_id"],
        location_id=location_id,
        file_name=file.filename,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type,
        category=category,
    )
    db.add(media)
    await db.flush()
    await db.refresh(media)
    return media


@router.get("/file/{media_id}")
async def serve_media_file(media_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Media).where(Media.id == media_id, Media.tenant_id == current_user["tenant_id"], Media.is_deleted == False)
    )
    media = result.scalar_one_or_none()
    if not media or not os.path.exists(media.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(media.file_path, media_type=media.mime_type or "application/octet-stream", filename=media.file_name)


@router.delete("/{media_id}", status_code=204)
async def delete_media(media_id: str, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Media).where(Media.id == media_id, Media.tenant_id == current_user["tenant_id"])
    )
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    media.is_deleted = True
