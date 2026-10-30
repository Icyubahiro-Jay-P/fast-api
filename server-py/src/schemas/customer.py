from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional

from ..utils.constants import CUSTOMER_STATUSES


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., max_length=254)
    phone: Optional[str] = None
    status: str = "active"

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        import re
        v = v.strip().lower()
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", v):
            raise ValueError("Invalid email")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v is None or v == "":
            return None
        v = str(v).strip()
        if len(v) > 30:
            raise ValueError("Phone too long")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in CUSTOMER_STATUSES:
            raise ValueError(f"Status must be one of {CUSTOMER_STATUSES}")
        return v


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    email: Optional[str] = Field(None, max_length=254)
    phone: Optional[str] = None
    status: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if v is None:
            return v
        import re
        v = v.strip().lower()
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", v):
            raise ValueError("Invalid email")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v is None or v == "":
            return None
        v = str(v).strip()
        if len(v) > 30:
            raise ValueError("Phone too long")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is None:
            return v
        if v not in CUSTOMER_STATUSES:
            raise ValueError(f"Status must be one of {CUSTOMER_STATUSES}")
        return v

    @model_validator(mode="after")
    def check_at_least_one(self):
        if all(v is None for v in self.model_dump().values()):
            raise ValueError("Provide at least one field to update.")
        return self


class CustomerQuery(BaseModel):
    search: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = None
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=10, ge=1, le=100)
    sort: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is None:
            return v
        if v not in CUSTOMER_STATUSES:
            raise ValueError(f"Status must be one of {CUSTOMER_STATUSES}")
        return v
