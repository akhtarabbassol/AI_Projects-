from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.embedding import Embedding
from app.services.embedding_service import generate_embedding


@dataclass(slots=True)
class RetrievedChunk:
    chunk_id: int
    document_id: int
    filename: str
    content: str
    score: float
    department_id: int


async def retrieve_relevant_chunks(
    db: AsyncSession,
    *,
    query: str,
    company_id: int | None = None,
    department_id: int | None = None,
    top_k: int = 5,
) -> list[RetrievedChunk]:

    if not query or not query.strip():
        return []

    top_k = max(
        1,
        min(top_k, 20),
    )

    query_vector = await generate_embedding(query)

    distance = Embedding.vector.cosine_distance(query_vector).label("distance")

    statement = (
        select(
            DocumentChunk.id,
            DocumentChunk.document_id,
            Document.filename,
            DocumentChunk.content,
            Document.department_id,
            distance,
        )
        .join(
            Embedding,
            Embedding.chunk_id == DocumentChunk.id,
        )
        .join(
            Document,
            Document.id == DocumentChunk.document_id,
        )
        .join(
            Department,
            Department.id == Document.department_id,
        )
        .where(
            Document.status == "processed",
        )
    )

    # COMPANY ISOLATION:
    if company_id is not None:
        statement = statement.where(Department.company_id == company_id)

    # DEPARTMENT ISOLATION:
    if department_id is not None:
        statement = statement.where(Document.department_id == department_id)

    statement = statement.order_by(distance).limit(top_k)

    result = await db.execute(statement)

    rows = result.all()

    return [
        RetrievedChunk(
            chunk_id=row.id,
            document_id=row.document_id,
            filename=row.filename,
            content=row.content,
            score=1.0 - float(row.distance),
            department_id=row.department_id,
        )
        for row in rows
    ]
