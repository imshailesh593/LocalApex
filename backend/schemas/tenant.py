from pydantic import BaseModel
from datetime import datetime
from models.tenant import PlanType, TenantStatus


class TenantCreate(BaseModel):
    business_name: str


class TenantUpdate(BaseModel):
    business_name: str | None = None
    plan_type: PlanType | None = None
    status: TenantStatus | None = None
    notification_email: str | None = None
    logo_url: str | None = None


class TenantResponse(BaseModel):
    id: str
    business_name: str
    plan_type: PlanType
    status: TenantStatus
    api_key: str
    notification_email: str | None = None
    logo_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
