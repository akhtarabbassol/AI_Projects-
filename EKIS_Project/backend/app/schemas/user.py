from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.auth import _validate_password_strength


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description=(
            "Must be 8-128 characters and contain at least one uppercase letter, "
            "one digit, and one special character."
        ),
    )
    role: str = Field(default="EMPLOYEE")
    company_id: int | None = None
    department_id: int | None = None

    @field_validator("password", mode="after")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)

    @field_validator("role", mode="before")
    @classmethod
    def normalise_role(cls, v: str) -> str:
        return v.upper() if v else "EMPLOYEE"


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    department_id: int | None = None
    is_active: bool | None = None
    role: str | None = None


class UserResponse(BaseModel):
    id: int
    company_id: int | None
    company_name: str | None = None
    department_id: int | None
    department_name: str | None = None
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int