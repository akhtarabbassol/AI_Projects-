from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.query_log import QueryLog


async def create_query_log(
    db: AsyncSession,
    *,
    company_id: int,
    user_id: int,
    department_id: int | None,
    query: str,
    query_type: str,
    response_time_ms: int,
    top_k: int,
    sources_count: int,
) -> QueryLog:
    query_log = QueryLog(
        company_id=company_id,
        user_id=user_id,
        department_id=department_id,
        query=query,
        query_type=query_type,
        response_time_ms=response_time_ms,
        top_k=top_k,
        sources_count=sources_count,
    )

    db.add(query_log)

    await db.flush()

    return query_log


async def count_queries(
    db: AsyncSession,
    *,
    company_id: int,
) -> int:
    stmt = select(func.count(QueryLog.id)).where(QueryLog.company_id == company_id)

    result = await db.execute(stmt)

    return int(result.scalar_one())


async def average_response_time(
    db: AsyncSession,
    *,
    company_id: int,
) -> float:
    stmt = select(func.avg(QueryLog.response_time_ms)).where(QueryLog.company_id == company_id)

    result = await db.execute(stmt)

    value = result.scalar_one()

    return float(value or 0.0)


async def get_query_logs(
    db: AsyncSession,
    *,
    company_id: int,
    limit: int = 100,
) -> list[QueryLog]:
    stmt = (
        select(QueryLog)
        .where(QueryLog.company_id == company_id)
        .order_by(QueryLog.created_at.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)

    return list(result.scalars().all())
