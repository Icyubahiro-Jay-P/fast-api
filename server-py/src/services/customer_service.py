from typing import Optional
import re
from datetime import datetime

from pymongo.errors import DuplicateKeyError

from ..models import Customer, Order
from ..utils.errors import ApiError
from ..utils.pagination import skip_for
from ..utils.sort import parse_sort
from ..utils.constants import CUSTOMER_SORT_FIELDS
from ..utils.ids import is_valid_object_id


def escape_regex(text: str) -> str:
    if not text:
        return ""
    return re.escape(text)


def build_filter(search: Optional[str] = None, status: Optional[str] = None):
    and_conditions = []
    if search:
        and_conditions.append({
            "$or": [
                {"name": {"$regex": escape_regex(search.strip()), "$options": "i"}},
                {"email": {"$regex": escape_regex(search.strip()), "$options": "i"}},
            ]
        })
    if status:
        and_conditions.append({"status": status})
    if len(and_conditions) == 1:
        return and_conditions[0]
    elif and_conditions:
        return {"$and": and_conditions}
    return {}


async def list_customers(search=None, status=None, sort=None, page=1, page_size=10):
    filter_query = build_filter(search, status)
    sort_spec = parse_sort(sort, CUSTOMER_SORT_FIELDS)
    sort_list = [(field, direction) for field, direction in sort_spec]
    total = await Customer.find(filter_query).count()
    items = await Customer.find(filter_query).sort(*sort_list).skip(skip_for(page, page_size)).limit(page_size).to_list()
    return {"items": items, "total": total}


async def get_customer(id: str):
    if not is_valid_object_id(id):
        raise ApiError(400, "invalid_id", "A supplied identifier or value has the wrong format.", {"path": "id", "value": id})
    customer = await Customer.get(id)
    if not customer:
        raise ApiError(404, "customer_not_found", "Customer not found.", {"id": id})
    return customer


async def create_customer(data: dict):
    if "email" in data and isinstance(data["email"], str):
        data["email"] = data["email"].strip().lower()
    try:
        customer = Customer(**data)
        await customer.insert()
        return customer
    except DuplicateKeyError:
        raise ApiError(409, "duplicate_value", "A record with that unique value already exists.", {"field": "email"})
    except Exception as e:
        msg = str(e)
        if "E11000" in msg or "duplicate key" in msg.lower():
            raise ApiError(409, "duplicate_value", "A record with that unique value already exists.", {"field": "email"})
        raise


async def update_customer(id: str, data: dict):
    if not is_valid_object_id(id):
        raise ApiError(400, "invalid_id", "A supplied identifier or value has the wrong format.", {"path": "id", "value": id})
    customer = await Customer.get(id)
    if not customer:
        raise ApiError(404, "customer_not_found", "Customer not found.", {"id": id})
    if "email" in data and isinstance(data["email"], str):
        data["email"] = data["email"].strip().lower()
    for k, v in data.items():
        setattr(customer, k, v)
    customer.updated_at = datetime.utcnow()
    try:
        await customer.save()
    except DuplicateKeyError:
        raise ApiError(409, "duplicate_value", "A record with that unique value already exists.", {"field": "email"})
    except Exception as e:
        msg = str(e)
        if "E11000" in msg or "duplicate key" in msg.lower():
            raise ApiError(409, "duplicate_value", "A record with that unique value already exists.", {"field": "email"})
        raise
    return customer


async def delete_customer(id: str):
    if not is_valid_object_id(id):
        raise ApiError(400, "invalid_id", "A supplied identifier or value has the wrong format.", {"path": "id", "value": id})
    customer = await Customer.get(id)
    if not customer:
        raise ApiError(404, "customer_not_found", "Customer not found.", {"id": id})
    # Check if referenced by orders
    order_count = await Order.find({"customerId": str(customer.id)}).count()
    if order_count > 0:
        raise ApiError(409, "customer_in_use", "Customer cannot be deleted while referenced by orders.", None)
    await customer.delete()
    return customer
