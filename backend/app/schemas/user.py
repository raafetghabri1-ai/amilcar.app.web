import datetime as dt
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
    date_of_birth: dt.date | None = None
    specialty: str | None = None
    salary: float | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    date_of_birth: dt.date | None = None
    is_active: bool | None = None
    specialty: str | None = None
    salary: float | None = None


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str
    date_of_birth: dt.date | None = None
    role: UserRole
    is_active: bool
    avatar_url: str | None
    specialty: str | None
    salary: float | None
    is_vip: bool = False
    vip_discount_percent: int = 0
    vip_since: dt.datetime | None = None
    created_at: dt.datetime

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


# ──── Client Full Details (admin view) ────
class ClientDetail(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str
    date_of_birth: dt.date | None = None
    is_vip: bool = False
    vip_discount_percent: int = 0
    vip_since: dt.datetime | None = None
    created_at: dt.datetime
    # aggregated
    vehicles: list[dict] = []
    total_visits: int = 0
    total_spent: float = 0
    services_used: list[dict] = []
    orders: list[dict] = []


# Fix forward reference
TokenResponse.model_rebuild()
