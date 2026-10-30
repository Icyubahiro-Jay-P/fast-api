from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
from datetime import datetime

from ..utils.constants import ORDER_STATUSES


class OrderItemInput(BaseModel):
    productId: str
    quantity: int = Field(..., ge=1, le=10000)

    class Config:
        extra = "forbid"


class OrderCreate(BaseModel):
    customerId: str
    status: str = "pending"
    items: List[OrderItemInput] = Field(..., min_length=1, max_length=50)

    class Config:
        extra = "forbid"

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in ORDER_STATUSES:
            raise ValueError(f"Status must be one of {ORDER_STATUSES}")
        return v

    @model_validator(mode="after")
    def check_unique_products(self):
        seen = {}
        for i, item in enumerate(self.items):
            if item.productId in seen:
                # Raise with info that will map to items.1.productId
                raise ValueError(f"items.{i}.productId: Each order item must reference a unique product.")
            seen[item.productId] = i
        return self


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    items: Optional[List[OrderItemInput]] = Field(None, min_length=1, max_length=50)

    class Config:
        extra = "forbid"

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is None:
            return v
        if v not in ORDER_STATUSES:
            raise ValueError(f"Status must be one of {ORDER_STATUSES}")
        return v

    @model_validator(mode="after")
    def check_unique_products(self):
        if self.items:
            seen = {}
            for i, item in enumerate(self.items):
                if item.productId in seen:
                    raise ValueError(f"items.{i}.productId: Each order item must reference a unique product.")
                seen[item.productId] = i
        if self.status is None and self.items is None:
            raise ValueError("Provide a status or a replacement items list.")
        return self


class OrderQuery(BaseModel):
    search: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = None
    customerId: Optional[str] = None
    dateFrom: Optional[datetime] = None
    dateTo: Optional[datetime] = None
    minTotal: Optional[float] = Field(None, ge=0)
    maxTotal: Optional[float] = Field(None, ge=0)
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=10, ge=1, le=100)
    sort: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is None:
            return v
        if v not in ORDER_STATUSES:
            raise ValueError(f"Status must be one of {ORDER_STATUSES}")
        return v


class MonthlyRevenueQuery(BaseModel):
    months: int = Field(default=12, ge=1, le=36)


class LimitQuery(BaseModel):
    limit: int = Field(default=5, ge=1, le=20)
