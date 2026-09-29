from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.roles import UserRole
from app.dependencies.auth import require_admin
from app.models.user import User
from app.schemas.analytics import AnalyticsDashboardResponse
from app.services.analytics_service import get_dashboard

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get(
    "/dashboard",
    response_model=AnalyticsDashboardResponse,
)
async def analytics_dashboard(
    company_id: int | None = Query(
        default=None,
        description="Target company ID. Applicable for SUPERUSER.",
    ),
    days: int = Query(
        default=30,
        ge=1,
        le=90,
        description="Number of days to include in query trends.",
    ),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Analytics dashboard:
    - Restricted to ADMIN and SUPERUSER.
    - EMPLOYEE is rejected with 403 Forbidden.
    - Computed metrics derive strictly from the company's query logs and documents.
    - Query trends cover the requested number of days.
    """
    if current_user.role == UserRole.SUPERUSER.value:
        target_company_id = company_id or current_user.company_id

        if target_company_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Superuser must provide company_id parameter to view company analytics.",
            )
    else:
        if current_user.company_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin has no associated company context.",
            )

        target_company_id = current_user.company_id

    return await get_dashboard(
        db=db,
        company_id=target_company_id,
        days=days,
    )