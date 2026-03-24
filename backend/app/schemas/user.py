from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole


# ──── Auth ────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ──── User ────
class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=8, max_length=20)
    password: str = Field(min_length=6)
    role: UserRole = UserRole.CLIENT
    specialty: str | None = None
    salary: float | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    is_active: bool | None = None
    specialty: str | None = None
    salary: float | None = None


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str
    role: UserRole
    is_active: bool
    avatar_url: str | None
    specialty: str | None
    salary: float | None
    is_vip: bool = False
    vip_discount_percent: int = 0
    vip_since: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkerStats(BaseModel):
    worker_id: int
    full_name: str
    specialty: str | None
    total_days: int
    present_days: int
    attendance_rate: float
    completed_bookings: int
    performance_points: int


class ChangePassword(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6)


# Fix forward reference
TokenResponse.model_rebuild()
