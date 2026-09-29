from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse


class EKISException(Exception):
    """Base exception for expected EKIS application errors."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ResourceNotFoundError(EKISException):
    """Raised when a requested resource does not exist."""

    def __init__(self, message: str = "Resource not found.") -> None:
        super().__init__(
            message,
            status_code=status.HTTP_404_NOT_FOUND,
        )


def unauthorized(detail: str = "Could not validate credentials.") -> HTTPException:
    """Generate a 401 Unauthorized HTTP exception."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def forbidden(detail: str = "Access forbidden.") -> HTTPException:
    """Generate a 403 Forbidden HTTP exception."""
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail,
    )


def bad_request(detail: str = "Bad request.") -> HTTPException:
    """Generate a 400 Bad Request HTTP exception."""
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=detail,
    )


def not_found(detail: str = "Resource not found.") -> HTTPException:
    """Generate a 404 Not Found HTTP exception."""
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=detail,
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register application exception handlers."""

    @app.exception_handler(EKISException)
    async def handle_ekis_exception(
        request: Request,
        exc: EKISException,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "message": exc.message,
                },
            },
        )
