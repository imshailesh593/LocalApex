from pydantic import BaseModel
from schemas.common import BaseResponse


class LocationCreate(BaseModel):
    store_name: str
    address: str
    city: str | None = None
    state: str | None = None
    country: str = "India"
    phone: str | None = None
    website: str | None = None
    gbp_location_id: str | None = None
    google_review_url: str | None = None
    funnel_slug: str | None = None


class LocationUpdate(BaseModel):
    store_name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    phone: str | None = None
    website: str | None = None
    business_hours: str | None = None
    special_hours: str | None = None
    google_review_url: str | None = None
    funnel_slug: str | None = None


class LocationResponse(BaseResponse):
    store_name: str
    address: str
    city: str | None
    state: str | None
    country: str
    phone: str | None
    website: str | None
    gbp_location_id: str | None
    google_review_url: str | None
    funnel_slug: str | None
    business_hours: str | None
    special_hours: str | None
