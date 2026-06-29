from pydantic import BaseModel
from models.citation import CitationStatus
from schemas.common import BaseResponse


class CitationCreate(BaseModel):
    location_id: str
    platform_name: str
    platform_url: str | None = None
    listed_name: str | None = None
    listed_address: str | None = None
    listed_phone: str | None = None


class CitationResponse(BaseResponse):
    location_id: str
    platform_name: str
    platform_url: str | None
    listed_name: str | None
    listed_address: str | None
    listed_phone: str | None
    status: CitationStatus
    nap_match: bool
