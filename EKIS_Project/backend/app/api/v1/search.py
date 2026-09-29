from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.roles import UserRole
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.chat import (
    ChatQueryRequest,
    RetrievedChunkResponse,
    SearchResponse,
)
from app.services.retrieval_service import retrieve_relevant_chunks

router = APIRouter(
    prefix="/search",
    tags=["Search"],
)


@router.post(
    "/semantic",
    response_model=SearchResponse,
)
async def semantic_search(
    request: ChatQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Semantic search with strict isolation:
    - EMPLOYEE: can ONLY search within their assigned department in their company.
    - ADMIN: can search across all company documents, or filter by specific department.
    - SUPERUSER: can search across platform documents.
    """
    if current_user.role == UserRole.EMPLOYEE.value:
        if current_user.company_id is None or current_user.department_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employee must belong to a company and department to search.",
            )
        # STRICT ISOLATION: Employees are locked to their own company and department
        company_id = current_user.company_id
        department_id = current_user.department_id

    elif current_user.role == UserRole.ADMIN.value:
        if current_user.company_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin has no associated company context.",
            )
        company_id = current_user.company_id
        department_id = request.department_id

    elif current_user.role == UserRole.SUPERUSER.value:
        company_id = None
        department_id = request.department_id
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized role.",
        )

    results = await retrieve_relevant_chunks(
        db=db,
        query=request.query,
        company_id=company_id,
        department_id=department_id,
        top_k=request.top_k,
    )

    return SearchResponse(
        query=request.query,
        results=[
            RetrievedChunkResponse(
                chunk_id=result.chunk_id,
                document_id=result.document_id,
                filename=result.filename,
                content=result.content,
                score=result.score,
            )
            for result in results
        ],
    )
