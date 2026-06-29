from pydantic import BaseModel
from schemas.common import BaseResponse


class CompetitorCreate(BaseModel):
    location_id: str
    competitor_name: str
    competitor_place_id: str | None = None
    track_keywords: str | None = None


class CompetitorUpdate(BaseModel):
    competitor_name: str | None = None
    track_keywords: str | None = None
    current_rating: float | None = None
    review_count: int | None = None
    map_rank: int | None = None


class CompetitorResponse(BaseResponse):
    location_id: str
    competitor_name: str
    competitor_place_id: str | None
    track_keywords: str | None
    current_rating: float | None
    review_count: int
    map_rank: int | None
    last_synced_at: str | None
