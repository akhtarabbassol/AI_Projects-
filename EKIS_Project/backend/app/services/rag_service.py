from langchain_core.prompts import (
    ChatPromptTemplate,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.llm_service import llm
from app.services.retrieval_service import (
    RetrievedChunk,
    retrieve_relevant_chunks,
)

RAG_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are EKIS, an Enterprise Knowledge
Intelligence System.

Use ONLY the authorized enterprise
document context supplied below.

Rules:

1. Never invent company-specific facts.
2. Never use outside knowledge.
3. If the answer is not supported by the
   context, say that the information was
   not found in the available company
   documents.
4. Answer clearly and professionally.
5. Mention the document filename when
   useful.
6. The backend has already filtered the
   context by company and department.

AUTHORIZED CONTEXT:

{context}
""",
        ),
        (
            "human",
            "{question}",
        ),
    ]
)


def build_context(
    chunks: list[RetrievedChunk],
) -> str:

    if not chunks:
        return "No relevant authorized documents were found."

    sections = []

    for index, chunk in enumerate(
        chunks,
        start=1,
    ):
        sections.append(
            f"""
SOURCE {index}

Document: {chunk.filename}
Relevance: {chunk.score:.4f}

{chunk.content}
""".strip()
        )

    return "\n\n---\n\n".join(sections)


async def answer_question(
    db: AsyncSession,
    *,
    question: str,
    company_id: int | None = None,
    department_id: int | None = None,
    top_k: int = 5,
):

    chunks = await retrieve_relevant_chunks(
        db=db,
        query=question,
        company_id=company_id,
        department_id=department_id,
        top_k=top_k,
    )

    context = build_context(chunks)

    prompt = RAG_PROMPT.invoke(
        {
            "context": context,
            "question": question,
        }
    )

    response = await llm.ainvoke(prompt)

    answer = response.content

    if isinstance(answer, list):
        answer = "\n".join(str(item) for item in answer)

    return str(answer), chunks
