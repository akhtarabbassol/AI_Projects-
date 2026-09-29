from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department
from app.models.document import Document


async def get_employee_document(
    db: AsyncSession,
    *,
    document_id: int,
    company_id: int,
    department_id: int,
) -> Document | None:

    result = await db.execute(
        select(Document)
        .join(
            Department,
            Department.id == Document.department_id,
        )
        .where(
            Document.id == document_id,
            Department.company_id == company_id,
            Document.department_id == department_id,
        )
    )

    return result.scalar_one_or_none()


async def get_company_document(
    db: AsyncSession,
    *,
    document_id: int,
    company_id: int,
) -> Document | None:

    result = await db.execute(
        select(Document)
        .join(
            Department,
            Department.id == Document.department_id,
        )
        .where(
            Document.id == document_id,
            Department.company_id == company_id,
        )
    )

    return result.scalar_one_or_none()
