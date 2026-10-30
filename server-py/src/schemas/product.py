from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional

from ..utils.constants import PRODUCT_STATUSES


class ProductBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=160)
    sku: str = Field(..., min_length=2, max_length=32)
    category: str = Field(..., min_length=2, max_length=60)
    price: float = Field(..., gt=0)
    stock: int = Field(default=0, ge=0)
    status: str = "active"

    @field_validator("sku")
    @classmethod
    def validate_sku(cls, v):
        import re
        if not re.match(r"^[A-Za-z0-9][A-Za-z0-9_-]*$", v):
            raise ValueError("SKU may contain letters, numbers, dashes, and underscores.")
        return v.upper()

    @field_validator("price")
    @classmethod
    def validate_price(cls, v):
        if v < 0.01:
            raise ValueError("Price must be at least 0.01")
        return round(float(v), 2)


class ProductCreate(ProductBase):
    status: str = Field(default="active")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in PRODUCT_STATUSES:
            raise ValueError(f"Status must be one of {PRODUCT_STATUSES}")
        return v


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=160)
    sku: Optional[str] = Field(None, min_length=2, max_length=32)
    category: Optional[str] = Field(None, min_length=2, max_length=60)
    price: Optional[float] = Field(None, gt=0)
    stock: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None

    @field_validator("sku")
    @classmethod
    def validate_sku(cls, v):
        if v is None:
            return v
        import re
        if not re.match(r"^[A-Za-z0-9][A-Za-z0-9_-]*$", v):
            raise ValueError("SKU may contain letters, numbers, dashes, and underscores.")
        return v.upper()

    @field_validator("price")
    @classmethod
    def validate_price(cls, v):
        if v is None:
            return v
        if v < 0.01:
            raise ValueError("Price must be at least 0.01")
        return round(float(v), 2)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is None:
            return v
        if v not in PRODUCT_STATUSES:
            raise ValueError(f"Status must be one of {PRODUCT_STATUSES}")
        return v

    @model_validator(mode="after")
    def check_at_least_one(self):
        if all(v is None for v in self.model_dump().values()):
            raise ValueError("Provide at least one field to update.")
        return self


class ProductQuery(BaseModel):
    search: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=60)
    status: Optional[str] = None
    minPrice: Optional[float] = Field(None, ge=0)
    maxPrice: Optional[float] = Field(None, ge=0)
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=10, ge=1, le=100)
    sort: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is None:
            return v
        if v not in PRODUCT_STATUSES:
            raise ValueError(f"Status must be one of {PRODUCT_STATUSES}")
        return v

    @model_validator(mode="after")
    def check_price_range(self):
        if self.minPrice is not None and self.maxPrice is not None and self.minPrice > self.maxPrice:
            raise ValueError("minPrice cannot be greater than maxPrice.")
        return self
