from pydantic import BaseModel
from datetime import datetime


class BaseResponse(BaseModel):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    is_deleted: bool

    model_config = {"from_attributes": True}


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    pages: int
