from pydantic import BaseModel
from models.review import ReviewStatus
from schemas.common import BaseResponse


class PublicReviewCreate(BaseModel):
    reviewer_name: str | None = None
    reviewer_email: str | None = None
    rating: int
    comment: str | None = None


class PublicReviewResponse(BaseModel):
    is_routed: bool
    google_review_url: str | None
    message: str


class ReviewCreate(BaseModel):
    location_id: str
    reviewer_name: str | None = None
    reviewer_email: str | None = None
    rating: int
    comment: str | None = None
    source: str = "funnel"


class ReviewUpdate(BaseModel):
    status: ReviewStatus | None = None
    ai_response: str | None = None
    is_routed: bool | None = None


class ReviewResponse(BaseResponse):
    location_id: str
    reviewer_name: str | None
    rating: int
    comment: str | None
    is_routed: bool
    status: ReviewStatus
    ai_response: str | None
    source: str
