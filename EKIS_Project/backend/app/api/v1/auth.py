from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.jwt import create_access_token
from app.core.roles import UserRole
from app.core.security import (
    hash_password,
    verify_password_safe,
)
from app.dependencies.auth import get_current_user
from app.models.company import Company
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Register an initial company and create its primary ADMIN user."""
    existing_user = await db.scalar(select(User).where(User.email == data.email))

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    company = Company(
        name=data.company_name,
    )

    db.add(company)
    await db.flush()

    user = User(
        company_id=company.id,
        email=data.email,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role=UserRole.ADMIN.value,
        is_active=True,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(
        user_id=user.id,
        company_id=user.company_id,
        role=user.role,
        department_id=user.department_id,
    )

    return TokenResponse(
        access_token=token,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Authenticate user by email and password, returning signed JWT."""
    user = await db.scalar(select(User).where(User.email == data.email))

    # verify_password_safe() always performs a bcrypt operation — even when
    # `user` is None — so response time is constant regardless of whether
    # the account exists, preventing user-enumeration via timing attacks.
    password_ok = verify_password_safe(
        data.password,
        user.password_hash if user else None,
    )

    if not user or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    token = create_access_token(
        user_id=user.id,
        company_id=user.company_id,
        role=user.role,
        department_id=user.department_id,
    )

    return TokenResponse(
        access_token=token,
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get the profile of the currently logged-in user."""
    company = None

    if current_user.company_id is not None:
        company = await db.scalar(
            select(Company).where(
                Company.id == current_user.company_id
            )
        )

    return UserResponse(
        id=current_user.id,
        company_id=current_user.company_id,
        company_name=company.name if company else None,
        department_id=current_user.department_id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )