from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import forbidden, not_found
from app.core.roles import UserRole
from app.dependencies.auth import get_current_user, require_superuser
from app.models.company import Company
from app.models.user import User
from app.schemas.company import (
    CompanyCreate,
    CompanyListResponse,
    CompanyResponse,
)

router = APIRouter(
    prefix="/companies",
    tags=["Companies"],
)


@router.post(
    "",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_company(
    data: CompanyCreate,
    current_user: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
):
    """Create a new company. Restricted to SUPERUSER."""

    company = Company(
        name=data.name.strip(),
    )

    db.add(company)
    await db.commit()
    await db.refresh(company)

    return company


@router.get(
    "",
    response_model=CompanyListResponse,
)
async def list_companies(
    current_user: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
):
    """List all companies across the platform. Restricted to SUPERUSER."""

    result = await db.scalars(
        select(Company).order_by(Company.created_at.desc())
    )

    companies = list(result.all())

    return CompanyListResponse(
        items=[
            CompanyResponse.model_validate(company)
            for company in companies
        ],
        total=len(companies),
    )


@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
)
async def get_company(
    company_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get company details:
    - SUPERUSER can access any company.
    - ADMIN and EMPLOYEE can only view their own company.
    """

    if current_user.role != UserRole.SUPERUSER.value:
        if current_user.company_id != company_id:
            raise forbidden(
                "You cannot access details of another company."
            )

    company = await db.scalar(
        select(Company).where(Company.id == company_id)
    )

    if not company:
        raise not_found("Company not found.")

    return company


@router.delete(
    "/{company_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_company(
    company_id: int,
    current_user: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
):
    """Delete a company. Restricted to SUPERUSER."""

    company = await db.scalar(
        select(Company).where(Company.id == company_id)
    )

    if not company:
        raise not_found("Company not found.")

    await db.delete(company)
    await db.commit()