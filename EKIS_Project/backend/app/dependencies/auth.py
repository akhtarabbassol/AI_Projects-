from collections.abc import Callable

import jwt
from fastapi import Depends
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import forbidden, unauthorized
from app.core.jwt import decode_access_token
from app.core.roles import UserRole
from app.models.user import User

bearer_scheme = HTTPBearer(
    auto_error=False,
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate bearer token and return authenticated User model."""
    if credentials is None:
        raise unauthorized("Authentication credentials were not provided.")

    try:
        payload = decode_access_token(credentials.credentials)
        sub = payload.get("sub")
        if not sub:
            raise unauthorized("Invalid token: subject missing.")
        user_id = int(sub)

    except (jwt.PyJWTError, ValueError) as err:
        raise unauthorized("Invalid or expired token.") from err

    result = await db.execute(select(User).where(User.id == user_id))

    user = result.scalar_one_or_none()

    if user is None:
        raise unauthorized("User no longer exists.")

    if not user.is_active:
        raise unauthorized("User account is inactive.")

    return user


def require_roles(
    *allowed_roles: UserRole | str,
) -> Callable:
    """Dependency factory checking if current user has one of the allowed roles."""
    normalized_allowed = {
        role.value.upper() if isinstance(role, UserRole) else str(role).upper()
        for role in allowed_roles
    }

    async def dependency(
        current_user: User = Depends(get_current_user),
    ) -> User:
        user_role = (current_user.role or "").upper()
        if user_role not in normalized_allowed:
            raise forbidden(
                f"Operation not permitted for role '{current_user.role}'. "
                f"Required role: {', '.join(normalized_allowed)}"
            )

        return current_user

    return dependency


async def require_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require authenticated user to be SUPERUSER."""
    if (current_user.role or "").upper() != UserRole.SUPERUSER.value:
        raise forbidden("This action requires SUPERUSER privileges.")
    return current_user


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require authenticated user to be company ADMIN or platform SUPERUSER."""
    role = (current_user.role or "").upper()
    if role not in {UserRole.ADMIN.value, UserRole.SUPERUSER.value}:
        raise forbidden("This action requires ADMIN or SUPERUSER privileges.")
    return current_user


async def require_employee(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require authenticated user to be an EMPLOYEE."""
    role = (current_user.role or "").upper()
    if role != UserRole.EMPLOYEE.value:
        raise forbidden("This action requires EMPLOYEE privileges.")
    return current_user
