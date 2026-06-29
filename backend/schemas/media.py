from pydantic import BaseModel
from models.media import MediaCategory
from schemas.common import BaseResponse


class MediaCreate(BaseModel):
    location_id: str
    file_name: str
    file_path: str
    file_size: int | None = None
    mime_type: str | None = None
    category: MediaCategory = MediaCategory.additional
    description: str | None = None


class MediaResponse(BaseResponse):
    location_id: str
    file_name: str
    file_path: str
    category: MediaCategory
    gbp_media_id: str | None
    description: str | None
