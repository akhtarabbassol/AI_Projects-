from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_documents: int
    total_queries: int
    average_response_time_ms: float
    ai_accuracy: float | None = None
    time_saved_minutes: float | None = None


class QueryTrendItem(BaseModel):
    date: str
    queries: int


class DepartmentQueryItem(BaseModel):
    department: str
    queries: int


class PopularTopicItem(BaseModel):
    topic: str
    count: int


class AnalyticsDashboardResponse(BaseModel):
    stats: DashboardStats
    query_trends: list[QueryTrendItem]
    department_breakdown: list[DepartmentQueryItem]
    popular_topics: list[PopularTopicItem]
