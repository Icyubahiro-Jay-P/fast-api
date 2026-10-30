from pydantic import BaseModel, Field


class PaginationQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=10, ge=1, le=100)
    sort: str | None = None


class PaginatedResponse(BaseModel):
    items: list
    page: int
    pageSize: int
    total: int
    pages: int
