from datetime import datetime

from pydantic import BaseModel, Field


class DeviceTokenCreate(BaseModel):
    fcm_token: str = Field(min_length=20, max_length=512)
    platform: str = Field(default="unknown", max_length=20)


class DeviceTokenOut(BaseModel):
    id: int
    client_id: int
    fcm_token: str
    platform: str
    created_at: datetime

    model_config = {"from_attributes": True}
