from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    id: int
    department_id: int
    filename: str
    file_type: str
    file_size: int
    status: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
