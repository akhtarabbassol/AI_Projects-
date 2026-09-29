from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department


async def get_company_department(
    db: AsyncSession,
    department_id: int,
    company_id: int,
) -> Department:

    department = await db.scalar(
        select(Department).where(
            Department.id == department_id,
            Department.company_id == company_id,
        )
    )

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found.",
        )

    return department
