from typing import Optional
import re
from datetime import datetime

from pymongo.errors import DuplicateKeyError
from beanie import PydanticObjectId

from ..models import Product, Order
from ..utils.errors import ApiError
from ..utils.pagination import skip_for
from ..utils.sort import parse_sort
from ..utils.constants import PRODUCT_SORT_FIELDS
from ..utils.ids import is_valid_object_id


def escape_regex(text: str) -> str:
    if not text:
        return ""
    return re.escape(text)


def build_filter(search: Optional[str] = None, category: Optional[str] = None, status: Optional[str] = None,
                  min_price: Optional[float] = None, max_price: Optional[float] = None):
    and_conditions = []
    if search:
        and_conditions.append({
            "$or": [
                {"name": {"$regex": escape_regex(search.strip()), "$options": "i"}},
                {"sku": {"$regex": escape_regex(search.strip()), "$options": "i"}},
            ]
        })
    if category:
        # case-insensitive match as in tests
        and_conditions.append({"category": {"$regex": f"^{escape_regex(category.strip())}$", "$options": "i"}})
    if status:
        and_conditions.append({"status": status})
    if min_price is not None or max_price is not None:
        price_cond = {}
        if min_price is not None:
            price_cond["$gte"] = min_price
        if max_price is not None:
            price_cond["$lte"] = max_price
        and_conditions.append({"price": price_cond})
    if len(and_conditions) == 1:
        return and_conditions[0]
    elif and_conditions:
        return {"$and": and_conditions}
    return {}


async def list_products(search=None, category=None, status=None, min_price=None, max_price=None, sort=None, page=1, page_size=10):
    filter_query = build_filter(search, category, status, min_price, max_price)
    sort_spec = parse_sort(sort, PRODUCT_SORT_FIELDS)
    sort_list = [(field, direction) for field, direction in sort_spec]
    
    total = await Product.find(filter_query).count()
    items = await Product.find(filter_query).sort(*sort_list).skip(skip_for(page, page_size)).limit(page_size).to_list()
    return {"items": items, "total": total}


async def get_product(id: str):
    if not is_valid_object_id(id):
        raise ApiError(400, "invalid_id", "A supplied identifier or value has the wrong format.", {"path": "id", "value": id})
    product = await Product.get(id)
    if not product:
        raise ApiError(404, "product_not_found", "Product not found.", {"id": id})
    return product


async def create_product(data: dict):
    # Normalize SKU to uppercase like in Express
    if "sku" in data and isinstance(data["sku"], str):
        data["sku"] = data["sku"].strip().upper()
    try:
        product = Product(**data)
        await product.insert()
        return product
    except DuplicateKeyError as e:
        msg = str(e)
        field = None
        if "sku" in msg.lower() or "sku_1" in msg:
            field = "sku"
        raise ApiError(409, "duplicate_value", "A record with that unique value already exists.", {"field": field} if field else {"field": "sku"})
    except Exception as e:
        msg = str(e)
        if "E11000" in msg or "duplicate key" in msg.lower():
            field = None
            if "sku" in msg:
                field = "sku"
            raise ApiError(409, "duplicate_value", "A record with that unique value already exists.", {"field": field} if field else {"field": "sku"})
        raise


async def update_product(id: str, data: dict):
    if not is_valid_object_id(id):
        raise ApiError(400, "invalid_id", "A supplied identifier or value has the wrong format.", {"path": "id", "value": id})
    product = await Product.get(id)
    if not product:
        raise ApiError(404, "product_not_found", "Product not found.", {"id": id})
    if "sku" in data and isinstance(data["sku"], str):
        data["sku"] = data["sku"].strip().upper()
    for k, v in data.items():
        setattr(product, k, v)
    product.updated_at = datetime.utcnow()
    try:
        await product.save()
    except DuplicateKeyError:
        raise ApiError(409, "duplicate_value", "A record with that unique value already exists.", {"field": "sku"})
    except Exception as e:
        msg = str(e)
        if "E11000" in msg or "duplicate key" in msg.lower():
            raise ApiError(409, "duplicate_value", "A record with that unique value already exists.", {"field": "sku"})
        raise
    return product


async def delete_product(id: str):
    if not is_valid_object_id(id):
        raise ApiError(400, "invalid_id", "A supplied identifier or value has the wrong format.", {"path": "id", "value": id})
    product = await Product.get(id)
    if not product:
        raise ApiError(404, "product_not_found", "Product not found.", {"id": id})
    # Check if referenced by orders
    order_count = await Order.find({"items.productId": str(product.id)}).count()
    if order_count > 0:
        raise ApiError(409, "product_in_use", "Product cannot be deleted while referenced by orders.", None)
    await product.delete()
    return product
