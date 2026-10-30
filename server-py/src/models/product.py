from datetime import datetime

from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class Product(Document):
    name: str
    sku: str
    category: str
    price: float
    stock: int = 0
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "products"
        indexes = [
            IndexModel([("sku", 1)], unique=True),
            "category",
            "status",
        ]
