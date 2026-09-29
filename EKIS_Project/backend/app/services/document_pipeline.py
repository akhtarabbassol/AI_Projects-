from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.embedding import Embedding
from app.services.chunking import split_documents
from app.services.document_metadata import add_document_metadata
from app.services.document_processor import load_document
from app.services.embedding_service import generate_embeddings


async def process_document(
    db: AsyncSession,
    document: Document,
) -> int:
    """
    Process a document through the complete ingestion pipeline:

    1. Load document using LangChain
    2. Add EKIS metadata
    3. Split document into chunks using LangChain
    4. Save chunks to PostgreSQL
    5. Generate Hugging Face embeddings
    6. Save embeddings to PostgreSQL/pgvector
    7. Mark document as processed

    Returns:
        Number of chunks successfully processed.
    """

    document.status = "processing"
    await db.flush()

    try:
        # ---------------------------------------------------------
        # 1. Load document with LangChain
        # ---------------------------------------------------------
        documents = load_document(
            file_path=document.file_path,
            file_type=document.file_type,
        )

        if not documents:
            raise ValueError("No documents were loaded from the uploaded file.")

        # ---------------------------------------------------------
        # 2. Add EKIS metadata
        # ---------------------------------------------------------
        documents = add_document_metadata(
            documents,
            document_id=document.id,
            department_id=document.department_id,
            filename=document.filename,
        )

        # ---------------------------------------------------------
        # 3. Split document with LangChain
        # ---------------------------------------------------------
        chunks = split_documents(documents)

        if not chunks:
            raise ValueError("No text chunks were generated from the document.")

        # ---------------------------------------------------------
        # 4. Save document chunks
        # ---------------------------------------------------------
        chunk_records: list[DocumentChunk] = []

        for index, chunk in enumerate(chunks):
            content = chunk.page_content.strip()

            if not content:
                continue

            chunk_record = DocumentChunk(
                document_id=document.id,
                chunk_index=index,
                content=content,
            )

            db.add(chunk_record)
            chunk_records.append(chunk_record)

        if not chunk_records:
            raise ValueError("The document did not contain any usable text.")

        # Flush so PostgreSQL generates chunk IDs.
        await db.flush()

        # ---------------------------------------------------------
        # 5. Generate Hugging Face embeddings
        # ---------------------------------------------------------
        texts = [chunk.content for chunk in chunk_records]

        vectors = await generate_embeddings(texts)

        if len(vectors) != len(chunk_records):
            raise ValueError("Embedding count does not match chunk count.")

        # ---------------------------------------------------------
        # 6. Store embeddings in PostgreSQL/pgvector
        # ---------------------------------------------------------
        for chunk_record, vector in zip(
            chunk_records,
            vectors,
            strict=True,
        ):
            embedding = Embedding(
                chunk_id=chunk_record.id,
                vector=vector,
            )

            db.add(embedding)

        await db.flush()

        # ---------------------------------------------------------
        # 7. Mark document as processed
        # ---------------------------------------------------------
        document.status = "processed"

        await db.commit()

        return len(chunk_records)

    except Exception:
        # Roll back the failed transaction.
        await db.rollback()

        # Start a fresh transaction before updating the document.
        try:
            await db.refresh(document)
            document.status = "failed"
            await db.commit()

        except Exception:
            # If even the failure-status update fails,
            # don't hide the original processing exception.
            await db.rollback()

        raise
