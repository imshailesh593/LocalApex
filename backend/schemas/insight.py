from pydantic import BaseModel
from models.insight import InsightMetric
from datetime import date


class InsightCreate(BaseModel):
    location_id: str
    metric: InsightMetric
    value: int
    date: date


class InsightSummary(BaseModel):
    metric: InsightMetric
    total: int
    location_id: str
