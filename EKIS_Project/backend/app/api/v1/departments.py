from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.roles import UserRole
from app.dependencies.auth import get_current_user, require_admin
from app.models.department import Department
from app.models.user import User

router = APIRouter(
    prefix="/departments",
    tags=["Departments"],
)


class DepartmentCreate(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )

    company_id: int | None = Field(
        default=None,
        description="Target company id. Only applicable for SUPERUSER.",
    )


class DepartmentResponse(BaseModel):
    id: int
    company_id: int
    name: str

    model_config = {
        "from_attributes": True,
    }


@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_department(
    data: DepartmentCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Create a new department.

    SUPERUSER:
        Must provide company_id.

    ADMIN:
        Department is automatically created inside the admin's company.
    """

    # ---------------------------------------------------------
    # Determine target company
    # ---------------------------------------------------------

    if current_user.role == UserRole.SUPERUSER.value:

        if data.company_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Superuser must provide company_id "
                    "when creating a department."
                ),
            )

        target_company_id = data.company_id

    else:
        target_company_id = current_user.company_id

    # ---------------------------------------------------------
    # Validate company context
    # ---------------------------------------------------------

    if target_company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company context is required to create a department.",
        )

    # ---------------------------------------------------------
    # Normalize department name
    # ---------------------------------------------------------

    department_name = data.name.strip()

    if not department_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department name cannot be empty.",
        )

    # ---------------------------------------------------------
    # Check duplicate department
    # ---------------------------------------------------------

    existing = await db.scalar(
        select(Department).where(
            Department.company_id == target_company_id,
            Department.name == department_name,
        )
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A department with this name already exists "
                "in the company."
            ),
        )

    # ---------------------------------------------------------
    # Create department
    # ---------------------------------------------------------

    department = Department(
        company_id=target_company_id,
        name=department_name,
    )

    db.add(department)

    await db.commit()
    await db.refresh(department)

    return department


@router.get(
    "",
    response_model=list[DepartmentResponse],
)
async def list_departments(
    company_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    List departments accessible to the current user.

    SUPERUSER:
        Can optionally provide company_id.
        Without company_id, returns departments from all companies.

    ADMIN / EMPLOYEE:
        Can only see departments belonging to their own company.
    """

    stmt = select(Department)

    # ---------------------------------------------------------
    # SUPERUSER
    # ---------------------------------------------------------

    if current_user.role == UserRole.SUPERUSER.value:

        if company_id is not None:
            stmt = stmt.where(
                Department.company_id == company_id
            )

    # ---------------------------------------------------------
    # ADMIN / EMPLOYEE
    # ---------------------------------------------------------

    else:

        if current_user.company_id is None:
            return []

        stmt = stmt.where(
            Department.company_id == current_user.company_id
        )

    # ---------------------------------------------------------
    # Order
    # ---------------------------------------------------------

    stmt = stmt.order_by(
        Department.name.asc()
    )

    result = await db.scalars(stmt)

    return list(result.all())