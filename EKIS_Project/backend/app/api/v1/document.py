import os

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.core.exceptions import forbidden, not_found
from app.core.roles import UserRole
from app.dependencies.auth import get_current_user, require_admin
from app.models.department import Department
from app.models.document import Document
from app.models.user import User
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
)
from app.services.department import get_company_department
from app.services.document_access import (
    get_company_document,
    get_employee_document,
)
from app.services.document_pipeline import process_document
from app.services.storage import save_upload_file


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


# ============================================================
# UPLOAD DOCUMENT
# ============================================================

@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    department_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Upload and process a document.

    Allowed roles:
        - ADMIN
        - SUPERUSER

    ADMIN:
        - Can upload only to departments belonging
          to their own company.

    SUPERUSER:
        - Can upload to any existing department.
    """

    # --------------------------------------------------------
    # 1. Validate file
    # --------------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file was selected.",
        )

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file type '{file.content_type}'. "
                "Allowed types are PDF, DOCX, TXT, and CSV."
            ),
        )

    # --------------------------------------------------------
    # 2. Validate file size
    # --------------------------------------------------------

    max_bytes = settings.max_upload_size_mb * 1024 * 1024

    if file.size is not None and file.size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File size exceeds the maximum allowed size "
                f"of {settings.max_upload_size_mb} MB."
            ),
        )

    # --------------------------------------------------------
    # 3. Validate department
    # --------------------------------------------------------

    if current_user.role == UserRole.SUPERUSER.value:
        # SUPERUSER can access any department.
        department = await db.scalar(
            select(Department).where(
                Department.id == department_id
            )
        )

        if not department:
            raise not_found("Department not found.")

    else:
        # ADMIN must belong to a company.
        if current_user.company_id is None:
            raise forbidden(
                "Admin has no associated company."
            )

        # ADMIN can only access departments
        # inside their own company.
        department = await get_company_department(
            db=db,
            department_id=department_id,
            company_id=current_user.company_id,
        )

    # --------------------------------------------------------
    # 4. Save physical file
    # --------------------------------------------------------

    file_path = None

    try:
        file_path, file_size = await save_upload_file(file)

        # ----------------------------------------------------
        # 5. Create document record
        # ----------------------------------------------------

        document = Document(
            department_id=department.id,
            filename=file.filename,
            file_path=file_path,
            file_type=file.content_type
            or "application/octet-stream",
            file_size=file_size,
            status="uploaded",
        )

        db.add(document)

        await db.commit()
        await db.refresh(document)

        # ----------------------------------------------------
        # 6. Process document
        # ----------------------------------------------------

        await process_document(
            db=db,
            document=document,
        )

        # ----------------------------------------------------
        # 7. Refresh final document state
        # ----------------------------------------------------

        await db.refresh(document)

        return document

    except HTTPException:
        # Remove physical file if something failed
        # after saving it.
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

        raise

    except Exception:
        # Roll back database transaction.
        await db.rollback()

        # Remove uploaded file if processing failed.
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document upload and processing failed.",
        )


# ============================================================
# LIST DOCUMENTS
# ============================================================

@router.get(
    "",
    response_model=DocumentListResponse,
)
async def list_documents(
    department_id: int | None = Query(
        default=None,
        description="Optional department filter.",
    ),
    company_id: int | None = Query(
        default=None,
        description="Target company ID. Applicable for SUPERUSER.",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    List documents according to the authenticated user's scope.

    EMPLOYEE:
        Only own company + own department.

    ADMIN:
        All documents in own company.
        Optional department filter.

    SUPERUSER:
        If company_id is provided:
            All documents in the selected company.

        If company_id is not provided:
            All documents across companies.

        Optional department filter.
    """

    stmt = (
        select(Document)
        .join(
            Department,
            Department.id == Document.department_id,
        )
        .order_by(Document.created_at.desc())
    )

    # --------------------------------------------------------
    # EMPLOYEE
    # --------------------------------------------------------

    if current_user.role == UserRole.EMPLOYEE.value:
        if (
            current_user.company_id is None
            or current_user.department_id is None
        ):
            return DocumentListResponse(
                items=[],
                total=0,
            )

        stmt = stmt.where(
            Department.company_id == current_user.company_id,
            Document.department_id == current_user.department_id,
        )

    # --------------------------------------------------------
    # ADMIN
    # --------------------------------------------------------

    elif current_user.role == UserRole.ADMIN.value:
        if current_user.company_id is None:
            return DocumentListResponse(
                items=[],
                total=0,
            )

        # ADMIN can only see documents
        # belonging to their own company.
        stmt = stmt.where(
            Department.company_id == current_user.company_id
        )

        if department_id is not None:
            stmt = stmt.where(
                Document.department_id == department_id
            )

    # --------------------------------------------------------
    # SUPERUSER
    # --------------------------------------------------------

    elif current_user.role == UserRole.SUPERUSER.value:

        # If a company was selected, restrict documents
        # to that company.
        if company_id is not None:
            stmt = stmt.where(
                Department.company_id == company_id
            )

        # Optional department filter.
        if department_id is not None:
            stmt = stmt.where(
                Document.department_id == department_id
            )

    # --------------------------------------------------------
    # Unknown role
    # --------------------------------------------------------

    else:
        raise forbidden("Access denied.")

    result = await db.scalars(stmt)

    documents = list(result.all())

    return DocumentListResponse(
        items=[
            DocumentResponse.model_validate(document)
            for document in documents
        ],
        total=len(documents),
    )


# ============================================================
# GET SINGLE DOCUMENT
# ============================================================

@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get one document according to authorization scope.
    """

    # --------------------------------------------------------
    # EMPLOYEE
    # --------------------------------------------------------

    if current_user.role == UserRole.EMPLOYEE.value:
        if (
            current_user.company_id is None
            or current_user.department_id is None
        ):
            raise not_found("Document not found.")

        document = await get_employee_document(
            db=db,
            document_id=document_id,
            company_id=current_user.company_id,
            department_id=current_user.department_id,
        )

        if not document:
            raise not_found(
                "Document not found in your authorized department."
            )

        return document

    # --------------------------------------------------------
    # ADMIN
    # --------------------------------------------------------

    if current_user.role == UserRole.ADMIN.value:
        if current_user.company_id is None:
            raise not_found("Document not found.")

        document = await get_company_document(
            db=db,
            document_id=document_id,
            company_id=current_user.company_id,
        )

        if not document:
            raise not_found(
                "Document not found in your company."
            )

        return document

    # --------------------------------------------------------
    # SUPERUSER
    # --------------------------------------------------------

    if current_user.role == UserRole.SUPERUSER.value:
        document = await db.scalar(
            select(Document).where(
                Document.id == document_id
            )
        )

        if not document:
            raise not_found("Document not found.")

        return document

    raise forbidden("Access denied.")


# ============================================================
# DELETE DOCUMENT
# ============================================================

@router.delete(
    "/{document_id}",
    status_code=status.HTTP_200_OK,
)
async def delete_document(
    document_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Delete a document.

    ADMIN:
        Can delete documents from their company.

    SUPERUSER:
        Can delete any document.

    EMPLOYEE:
        Cannot delete documents.
    """

    # --------------------------------------------------------
    # Find document
    # --------------------------------------------------------

    if current_user.role == UserRole.SUPERUSER.value:
        document = await db.scalar(
            select(Document).where(
                Document.id == document_id
            )
        )

    else:
        if current_user.company_id is None:
            raise forbidden(
                "Admin has no company context."
            )

        document = await get_company_document(
            db=db,
            document_id=document_id,
            company_id=current_user.company_id,
        )

    if not document:
        raise not_found("Document not found.")

    filename = document.filename
    file_path = document.file_path

    # --------------------------------------------------------
    # Delete database record
    # --------------------------------------------------------

    await db.delete(document)
    await db.commit()

    # --------------------------------------------------------
    # Delete physical file
    # --------------------------------------------------------

    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass

    return {
        "success": True,
        "message": (
            f"Document '{filename}' successfully deleted."
        ),
    }