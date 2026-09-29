from pydantic import BaseModel, EmailStr, Field, field_validator

# Special characters that satisfy the password complexity requirement.
_SPECIAL_CHARS = set(r"""!@#$%^&*()_+-=[]{};':"\\|,.<>/?""")


def _validate_password_strength(password: str) -> str:
    """Enforce: min 8 chars, ≥1 uppercase, ≥1 digit, ≥1 special character."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if len(password) > 128:
        raise ValueError("Password must not exceed 128 characters.")
    if not any(c.isupper() for c in password):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not any(c.isdigit() for c in password):
        raise ValueError("Password must contain at least one digit.")
    if not any(c in _SPECIAL_CHARS for c in password):
        raise ValueError(
            "Password must contain at least one special character "
            r"(!@#$%^&*()_+-=[]{};':\"\\|,.<>/?)."
        )
    return password


class RegisterRequest(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description=(
            "Must be 8-128 characters and contain at least one uppercase letter, "
            "one digit, and one special character."
        ),
    )

    @field_validator("password", mode="after")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)

    @field_validator("company_name", "full_name", mode="before")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
