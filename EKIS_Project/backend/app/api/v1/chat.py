from time import perf_counter

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.roles import UserRole
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.chat import (
    ChatQueryRequest,
    ChatQueryResponse,
    ChatSource,
)
from app.services.query_log import create_query_log
from app.services.rag_service import answer_question


router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


# ============================================================
# CHAT QUERY
# ============================================================

@router.post(
    "/query",
    response_model=ChatQueryResponse,
)
async def chat_query(
    request: ChatQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Execute a RAG query with strict tenant and
    department access control.

    EMPLOYEE:
        - Must belong to a company.
        - Must belong to a department.
        - Retrieval is restricted to their own
          company + department.

    ADMIN:
        - Must belong to a company.
        - Retrieval can span their company.
        - Optional department_id can further
          restrict retrieval.

    SUPERUSER:
        - Platform-level access.
        - Optional department_id can be supplied.
    """

    # --------------------------------------------------------
    # Determine RAG access scope
    # --------------------------------------------------------

    if current_user.role == UserRole.EMPLOYEE.value:

        if (
            current_user.company_id is None
            or current_user.department_id is None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Employee must have an assigned company "
                    "and department to ask RAG questions."
                ),
            )

        # Employee cannot choose another company
        # or department.
        company_id = current_user.company_id
        department_id = current_user.department_id

    elif current_user.role == UserRole.ADMIN.value:

        if current_user.company_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Admin must belong to a company "
                    "to execute queries."
                ),
            )

        company_id = current_user.company_id

        # Admin can optionally restrict retrieval
        # to a specific department.
        department_id = request.department_id

    elif current_user.role == UserRole.SUPERUSER.value:

        # Superuser is platform-level.
        company_id = current_user.company_id
        department_id = request.department_id

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized role.",
        )

    # --------------------------------------------------------
    # Execute RAG
    # --------------------------------------------------------

    started_at = perf_counter()

    answer, chunks = await answer_question(
        db=db,
        question=request.query,
        company_id=company_id,
        department_id=department_id,
        top_k=request.top_k,
    )

    response_time_ms = int(
        (perf_counter() - started_at) * 1000
    )

    # --------------------------------------------------------
    # Save query analytics
    # --------------------------------------------------------
    #
    # IMPORTANT:
    # We keep QueryLog.
    # We do NOT save chat history.
    #

    if company_id is not None:
        await create_query_log(
            db=db,
            company_id=company_id,
            user_id=current_user.id,
            department_id=department_id,
            query=request.query,
            query_type="rag",
            response_time_ms=response_time_ms,
            top_k=request.top_k,
            sources_count=len(chunks),
        )

        await db.commit()

    # --------------------------------------------------------
    # Return response
    # --------------------------------------------------------

    return ChatQueryResponse(
        answer=answer,
        sources=[
            ChatSource(
                chunk_id=chunk.chunk_id,
                document_id=chunk.document_id,
                filename=chunk.filename,
                score=chunk.score,
            )
            for chunk in chunks
        ],
    )