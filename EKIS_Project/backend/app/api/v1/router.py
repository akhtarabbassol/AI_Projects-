from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.analytics import router as analytics_router
from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.companies import router as companies_router
from app.api.v1.departments import router as departments_router
from app.api.v1.document import router as documents_router
from app.api.v1.search import router as search_router
from app.api.v1.users import router as users_router
from app.core.database import get_db_session

router = APIRouter()


@router.get("/health_check", tags=["Health"])
async def health_check(db: AsyncSession = Depends(get_db_session)) -> dict[str, str]:
    await db.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "service": "ekis-backend",
        "database": "Success",
    }


router.include_router(auth_router)
router.include_router(companies_router)
router.include_router(departments_router)
router.include_router(documents_router)
router.include_router(users_router)
router.include_router(chat_router)
router.include_router(search_router)
router.include_router(analytics_router)
