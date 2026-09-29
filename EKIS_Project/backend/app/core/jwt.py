from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.core.config import settings


def create_access_token(
    user_id: int,
    company_id: int | None = None,
    role: str = "EMPLOYEE",
    department_id: int | None = None,
) -> str:
    """Create a signed JWT access token containing user identity and tenant context."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.jwt_access_token_expire_minutes)

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "company_id": company_id,
        "role": role.upper() if role else "EMPLOYEE",
        "department_id": department_id,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        # Issuer / audience claims bind this token to the EKIS platform.
        # Tokens from other services that lack these claims will be rejected.
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token.

    Raises ``jwt.PyJWTError`` on any validation failure (expired, bad signature,
    wrong issuer/audience, malformed).  Callers should catch this specific type
    rather than bare ``Exception`` so that unrelated errors are not silently swallowed.
    """
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"verify_exp": True},
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
    )
