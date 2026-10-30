from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import Field


class OrderItem(Document):
    productId: str
    productName: str
    sku: str
    quantity: int
    unitPrice: float
    lineTotal: float


class Order(Document):
    orderNumber: str
    customerId: str
    customerName: str
    items: List[dict]
    totalAmount: float
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "orders"
        indexes = [
            "orderNumber",
            "customerId",
            "status",
        ]
