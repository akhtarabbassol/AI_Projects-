from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.exceptions import forbidden, not_found
from app.core.roles import UserRole
from app.core.security import hash_password
from app.dependencies.auth import require_admin
from app.models.company import Company
from app.models.department import Department
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserListResponse,
    UserResponse,
    UserUpdate,
)


router = APIRouter(
    prefix="/users",
    tags=["User Management"],
)


def build_user_response(user: User) -> UserResponse:
    """
    Convert a User SQLAlchemy model into the API response.

    Includes both the IDs and human-readable company/department names.
    """
    return UserResponse(
        id=user.id,
        company_id=user.company_id,
        company_name=user.company.name if user.company else None,
        department_id=user.department_id,
        department_name=(
            user.department.name
            if user.department
            else None
        ),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.get(
    "",
    response_model=UserListResponse,
)
async def list_users(
    company_id: int | None = Query(default=None),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    List users:
    - ADMIN can view only users in their own company.
    - SUPERUSER can view all users or filter by company.
    - EMPLOYEE is rejected with 403 Forbidden.
    """

    stmt = (
        select(User)
        .options(
            selectinload(User.company),
            selectinload(User.department),
        )
        .order_by(User.created_at.desc())
    )

    if current_user.role == UserRole.SUPERUSER.value:
        if company_id is not None:
            stmt = stmt.where(User.company_id == company_id)

    else:
        if current_user.company_id is None:
            return UserListResponse(
                items=[],
                total=0,
            )

        stmt = stmt.where(
            User.company_id == current_user.company_id
        )

    result = await db.scalars(stmt)
    users = list(result.all())

    return UserListResponse(
        items=[
            build_user_response(user)
            for user in users
        ],
        total=len(users),
    )


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    data: UserCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new user:
    - ADMIN can ONLY create EMPLOYEEs inside their own company.
    - SUPERUSER can create ADMINs or EMPLOYEEs for any company.
    - EMPLOYEE is rejected with 403 Forbidden.
    """

    # Check if email is already taken.
    existing = await db.scalar(
        select(User).where(User.email == data.email)
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    role_to_create = (data.role or "EMPLOYEE").upper()

    # ---------------------------------------------------------
    # ADMIN
    # ---------------------------------------------------------

    if current_user.role == UserRole.ADMIN.value:

        # Admin can only create EMPLOYEEs.
        if role_to_create != UserRole.EMPLOYEE.value:
            raise forbidden(
                "Company admins can only create EMPLOYEE users."
            )

        target_company_id = current_user.company_id

        if target_company_id is None:
            raise forbidden(
                "Admin has no company assigned."
            )

        # If department is specified, verify that it
        # belongs to the admin's company.
        if data.department_id is not None:
            dept = await db.scalar(
                select(Department).where(
                    Department.id == data.department_id,
                    Department.company_id == target_company_id,
                )
            )

            if not dept:
                raise not_found(
                    "Department not found in your company."
                )

    # ---------------------------------------------------------
    # SUPERUSER
    # ---------------------------------------------------------

    elif current_user.role == UserRole.SUPERUSER.value:

        if role_to_create not in {
            UserRole.ADMIN.value,
            UserRole.EMPLOYEE.value,
            UserRole.SUPERUSER.value,
        }:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role specified.",
            )

        # SUPERUSER does not need a company.
        if role_to_create == UserRole.SUPERUSER.value:

            target_company_id = None

            # SUPERUSER should not have a department.
            if data.department_id is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="SUPERUSER cannot be assigned to a department.",
                )

        else:
            # ADMIN and EMPLOYEE must have a company.
            if data.company_id is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "company_id is required when creating "
                        "an ADMIN or EMPLOYEE."
                    ),
                )

            company = await db.scalar(
                select(Company).where(
                    Company.id == data.company_id
                )
            )

            if not company:
                raise not_found("Company not found.")

            target_company_id = company.id

            # Validate department belongs to selected company.
            if data.department_id is not None:
                dept = await db.scalar(
                    select(Department).where(
                        Department.id == data.department_id,
                        Department.company_id == target_company_id,
                    )
                )

                if not dept:
                    raise not_found(
                        "Department not found in selected company."
                    )

    else:
        target_company_id = None

    # ---------------------------------------------------------
    # Create user
    # ---------------------------------------------------------

    new_user = User(
        company_id=target_company_id,
        department_id=data.department_id,
        email=data.email,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role=role_to_create,
        is_active=True,
    )

    db.add(new_user)

    await db.commit()

    # Reload the user together with company and department.
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.company),
            selectinload(User.department),
        )
        .where(User.id == new_user.id)
    )

    new_user = result.scalar_one()

    return build_user_response(new_user)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
)
async def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's details or department within the company."""

    user = await db.scalar(
        select(User).where(User.id == user_id)
    )

    if not user:
        raise not_found("User not found.")

    # ---------------------------------------------------------
    # Permission checks
    # ---------------------------------------------------------

    if current_user.role != UserRole.SUPERUSER.value:

        if user.company_id != current_user.company_id:
            raise not_found(
                "User not found in your company."
            )

        if user.role == UserRole.SUPERUSER.value:
            raise forbidden(
                "Cannot modify a platform superuser."
            )

        # Admin cannot escalate roles.
        if (
            data.role
            and data.role.upper() != UserRole.EMPLOYEE.value
        ):
            raise forbidden(
                "Company admins can only manage EMPLOYEE roles."
            )

    # ---------------------------------------------------------
    # Update fields
    # ---------------------------------------------------------

    if data.full_name is not None:
        user.full_name = data.full_name

    if data.is_active is not None:
        user.is_active = data.is_active

    if data.department_id is not None:

        target_company = (
            user.company_id
            or current_user.company_id
        )

        if target_company is None:
            raise forbidden(
                "User has no company assigned."
            )

        dept = await db.scalar(
            select(Department).where(
                Department.id == data.department_id,
                Department.company_id == target_company,
            )
        )

        if not dept:
            raise not_found(
                "Department not found in user's company."
            )

        user.department_id = data.department_id

    if (
        data.role is not None
        and current_user.role == UserRole.SUPERUSER.value
    ):
        user.role = data.role.upper()

    await db.commit()

    # Reload relationships after update.
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.company),
            selectinload(User.department),
        )
        .where(User.id == user.id)
    )

    user = result.scalar_one()

    return build_user_response(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a user in the company. Admins cannot delete themselves."""

    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )

    user = await db.scalar(
        select(User).where(User.id == user_id)
    )

    if not user:
        raise not_found("User not found.")

    if current_user.role != UserRole.SUPERUSER.value:

        if user.company_id != current_user.company_id:
            raise not_found(
                "User not found in your company."
            )

        if user.role == UserRole.SUPERUSER.value:
            raise forbidden(
                "Cannot delete a platform superuser."
            )

    await db.delete(user)
    await db.commit()

    return {
        "success": True,
        "message": (
            f"User '{user.email}' was successfully removed."
        ),
    }