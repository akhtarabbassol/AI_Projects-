from datetime import datetime

from pydantic import BaseModel, Field


class ChatQueryRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        max_length=5000,
    )

    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
    )

    department_id: int | None = Field(
        default=None,
        description="Optional department filter. For employees, this is automatically forced to their own department.",
    )


class ChatSource(BaseModel):
    chunk_id: int
    document_id: int
    filename: str
    score: float


class ChatQueryResponse(BaseModel):
    answer: str
    sources: list[ChatSource]


class RetrievedChunkResponse(BaseModel):
    chunk_id: int
    document_id: int
    filename: str
    content: str
    score: float


class SearchResponse(BaseModel):
    query: str
    results: list[RetrievedChunkResponse]


class ChatHistoryResponse(BaseModel):
    id: int
    query: str
    response: str
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class ChatHistoryListResponse(BaseModel):
    items: list[ChatHistoryResponse]
    total: int
