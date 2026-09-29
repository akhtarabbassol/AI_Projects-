from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department
from app.models.document import Document
from app.models.query_log import QueryLog
from app.schemas.analytics import (
    AnalyticsDashboardResponse,
    DashboardStats,
    DepartmentQueryItem,
    PopularTopicItem,
    QueryTrendItem,
)


async def get_total_documents(
    db: AsyncSession,
    *,
    company_id: int,
) -> int:
    stmt = (
        select(func.count(Document.id))
        .join(
            Department,
            Department.id == Document.department_id,
        )
        .where(
            Department.company_id == company_id,
        )
    )

    result = await db.execute(stmt)

    return int(result.scalar_one())


async def get_total_queries(
    db: AsyncSession,
    *,
    company_id: int,
) -> int:
    stmt = select(func.count(QueryLog.id)).where(
        QueryLog.company_id == company_id
    )

    result = await db.execute(stmt)

    return int(result.scalar_one())


async def get_average_response_time(
    db: AsyncSession,
    *,
    company_id: int,
) -> float:
    stmt = select(
        func.avg(QueryLog.response_time_ms)
    ).where(
        QueryLog.company_id == company_id
    )

    result = await db.execute(stmt)

    value = result.scalar_one()

    return float(value or 0.0)


async def get_department_breakdown(
    db: AsyncSession,
    *,
    company_id: int,
) -> list[DepartmentQueryItem]:
    stmt = (
        select(
            Department.name,
            func.count(QueryLog.id),
        )
        .join(
            QueryLog,
            QueryLog.department_id == Department.id,
        )
        .where(
            QueryLog.company_id == company_id,
        )
        .group_by(
            Department.id,
            Department.name,
        )
        .order_by(
            func.count(QueryLog.id).desc()
        )
    )

    result = await db.execute(stmt)

    return [
        DepartmentQueryItem(
            department=name,
            queries=int(count),
        )
        for name, count in result.all()
    ]


async def get_query_trends(
    db: AsyncSession,
    *,
    company_id: int,
    days: int = 30,
) -> list[QueryTrendItem]:
    """
    Return daily query counts for the requested number of days.

    Missing dates are included with a query count of zero.
    """

    today = datetime.now(timezone.utc).date()

    start_date = today - timedelta(days=days - 1)

    start_datetime = datetime.combine(
        start_date,
        datetime.min.time(),
        tzinfo=timezone.utc,
    )

    end_datetime = datetime.combine(
        today + timedelta(days=1),
        datetime.min.time(),
        tzinfo=timezone.utc,
    )

    date_column = func.date(QueryLog.created_at)

    stmt = (
        select(
            date_column.label("date"),
            func.count(QueryLog.id).label("queries"),
        )
        .where(
            QueryLog.company_id == company_id,
            QueryLog.created_at >= start_datetime,
            QueryLog.created_at < end_datetime,
        )
        .group_by(date_column)
        .order_by(date_column.asc())
    )

    result = await db.execute(stmt)

    rows = result.all()

    query_counts = {
        row.date: int(row.queries)
        for row in rows
    }

    trends: list[QueryTrendItem] = []

    for offset in range(days):
        current_date = start_date + timedelta(days=offset)

        trends.append(
            QueryTrendItem(
                date=current_date.isoformat(),
                queries=query_counts.get(
                    current_date,
                    0,
                ),
            )
        )

    return trends


def extract_topic_words(
    query: str,
) -> list[str]:
    stop_words = {
        "the",
        "is",
        "are",
        "was",
        "were",
        "what",
        "why",
        "how",
        "when",
        "where",
        "who",
        "which",
        "can",
        "could",
        "should",
        "would",
        "please",
        "tell",
        "me",
        "about",
        "for",
        "from",
        "with",
        "and",
        "or",
        "to",
        "of",
        "in",
        "on",
        "a",
        "an",
    }

    words = (
        query
        .lower()
        .replace("?", " ")
        .replace(",", " ")
        .replace(".", " ")
        .split()
    )

    return [
        word
        for word in words
        if len(word) >= 4 and word not in stop_words
    ]


async def get_popular_topics(
    db: AsyncSession,
    *,
    company_id: int,
) -> list[PopularTopicItem]:
    stmt = select(QueryLog.query).where(
        QueryLog.company_id == company_id
    )

    result = await db.execute(stmt)

    counter: Counter[str] = Counter()

    for query in result.scalars().all():
        for word in extract_topic_words(query):
            counter[word] += 1

    return [
        PopularTopicItem(
            topic=topic,
            count=count,
        )
        for topic, count in counter.most_common(10)
    ]


async def get_dashboard(
    db: AsyncSession,
    *,
    company_id: int,
    days: int = 30,
) -> AnalyticsDashboardResponse:
    total_documents = await get_total_documents(
        db=db,
        company_id=company_id,
    )

    total_queries = await get_total_queries(
        db=db,
        company_id=company_id,
    )

    average_response_time = await get_average_response_time(
        db=db,
        company_id=company_id,
    )

    department_breakdown = await get_department_breakdown(
        db=db,
        company_id=company_id,
    )

    query_trends = await get_query_trends(
        db=db,
        company_id=company_id,
        days=days,
    )

    popular_topics = await get_popular_topics(
        db=db,
        company_id=company_id,
    )

    return AnalyticsDashboardResponse(
        stats=DashboardStats(
            total_documents=total_documents,
            total_queries=total_queries,
            average_response_time_ms=average_response_time,
            ai_accuracy=None,
            time_saved_minutes=None,
        ),
        query_trends=query_trends,
        department_breakdown=department_breakdown,
        popular_topics=popular_topics,
    )