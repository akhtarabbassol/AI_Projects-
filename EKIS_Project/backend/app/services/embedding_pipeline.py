from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_chunk import DocumentChunk
from app.models.embedding import Embedding
from app.services.embedding_service import generate_embeddings


async def embed_document_chunks(
    db: AsyncSession,
    chunks: list[DocumentChunk],
) -> int:
    if not chunks:
        return 0

    texts = [chunk.content for chunk in chunks]

    vectors = await generate_embeddings(texts)

    for chunk, vector in zip(chunks, vectors, strict=True):
        embedding = Embedding(
            chunk_id=chunk.id,
            vector=vector,
        )

        db.add(embedding)

    await db.flush()

    return len(vectors)
