from pydantic import BaseModel
from schemas.common import BaseResponse


class QACreate(BaseModel):
    location_id: str
    question: str
    answer: str | None = None


class QAUpdate(BaseModel):
    answer: str | None = None
    is_published: bool | None = None


class QAResponse(BaseResponse):
    location_id: str
    question: str
    answer: str | None
    is_auto_answered: bool
    is_published: bool
    google_question_id: str | None
