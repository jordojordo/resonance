from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int


class ActionResponse(BaseModel):
    success: bool
    count: int
    message: str


class ErrorResponse(BaseModel):
    error: bool = True
    code: str
    message: str
    details: dict = {}
