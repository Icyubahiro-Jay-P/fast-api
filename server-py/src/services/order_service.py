from typing import Optional
import re
from datetime import datetime
import random
import string

from ..models import Order, Product, Customer
from ..utils.errors import ApiError
from ..utils.pagination import skip_for
from ..utils.sort import parse_sort
from ..utils.constants import ORDER_SORT_FIELDS
from ..utils.ids import is_valid_object_id


def escape_regex(text: str) -> str:
    if not text:
        return ""
    return re.escape(text)


def build_filter(search: Optional[str] = None, status: Optional[str] = None, customer_id: Optional[str] = None,
                  date_from: Optional[datetime] = None, date_to: Optional[datetime] = None,
                  min_total: Optional[float] = None, max_total: Optional[float] = None):
    and_conditions = []
    if search:
        and_conditions.append({
            "$or": [
                {"orderNumber": {"$regex": escape_regex(search.strip()), "$options": "i"}},
                {"customerName": {"$regex": escape_regex(search.strip()), "$options": "i"}},
            ]
        })
    if status:
        and_conditions.append({"status": status})
    if customer_id:
        and_conditions.append({"customerId": customer_id})
    if date_from or date_to:
        date_cond = {}
        if date_from:
            date_cond["$gte"] = date_from
        if date_to:
            date_cond["$lte"] = date_to
        and_conditions.append({"createdAt": date_cond})
    if min_total is not None or max_total is not None:
        total_cond = {}
        if min_total is not None:
            total_cond["$gte"] = min_total
        if max_total is not None:
            total_cond["$lte"] = max_total
        and_conditions.append({"totalAmount": total_cond})
    if len(and_conditions) == 1:
        return and_conditions[0]
    elif and_conditions:
        return {"$and": and_conditions}
    return {}


async def list_orders(search=None, status=None, customer_id=None, date_from=None, date_to=None,
                     min_total=None, max_total=None, sort=None, page=1, page_size=10):
    filter_query = build_filter(search, status, customer_id, date_from, date_to, min_total, max_total)
    sort_spec = parse_sort(sort, ORDER_SORT_FIELDS)
    sort_list = [(field, direction) for field, direction in sort_spec]
    total = await Order.find(filter_query).count()
    items = await Order.find(filter_query).sort(*sort_list).skip(skip_for(page, page_size)).limit(page_size).to_list()
    return {"items": items, "total": total}


async def generate_order_number():
    for _ in range(3):
        year = datetime.utcnow().year
        rand = ''.join(random.choices(string.digits, k=6))
        order_num = f"ORD-{year}-{rand}"
        existing = await Order.find_one({"orderNumber": order_num})
        if not existing:
            return order_num
    raise ApiError(409, "order_number_error", "Failed to generate a unique order number.", None)


async def get_order(id: str):
    if not is_valid_object_id(id):
        raise ApiError(400, "invalid_id", "A supplied identifier or value has the wrong format.", {"path": "id", "value": id})
    order = await Order.get(id)
    if not order:
        raise ApiError(404, "order_not_found", "Order not found.", {"id": id})
    return order


async def create_order(data: dict):
    customer_id = data.get("customerId")
    if not is_valid_object_id(customer_id):
        raise ApiError(400, "invalid_id", "A supplied identifier or value has the wrong format.", {"path": "customerId", "value": customer_id})
    
    customer = await Customer.get(customer_id)
    if not customer:
        raise ApiError(404, "customer_not_found", "Customer not found.", {"id": customer_id})
    
    items_in = data.get("items", [])
    product_ids = [it.get("productId") for it in items_in]
    if len(product_ids) != len(set(product_ids)):
        raise ApiError(422, "validation_error", "Request validation failed.", [{"path": "items.1.productId", "message": "Each order item must reference a unique product.", "code": "custom"}])
    
    order_items = []
    for it in items_in:
        pid = it.get("productId")
        if not is_valid_object_id(pid):
            raise ApiError(400, "invalid_id", "A supplied identifier or value has the wrong format.", {"path": "items.*.productId", "value": pid})
        product = await Product.get(pid)
        if not product:
            raise ApiError(404, "product_not_found", "Product not found.", {"id": pid})
        quantity = int(it.get("quantity", 0))
        if quantity < 1:
            raise ApiError(422, "validation_error", "Request validation failed.", [])
        unit_price = float(product.price)
        line_total = round(unit_price * quantity, 2)
        order_items.append({
            "productId": str(product.id),
            "productName": product.name,
            "sku": product.sku,
            "quantity": quantity,
            "unitPrice": unit_price,
            "lineTotal": line_total,
        })
    
    total_amount = round(sum(i["lineTotal"] for i in order_items), 2)
    order_number = await generate_order_number()
    
    order = Order(
        orderNumber=order_number,
        customerId=str(customer.id),
        customerName=customer.name,
        status=data.get("status", "pending"),
        items=order_items,
        totalAmount=total_amount,
    )
    try:
        await order.insert()
    except Exception as e:
        msg = str(e)
        if "duplicate" in msg.lower() or "E11000" in msg:
            order.orderNumber = await generate_order_number()
            await order.insert()
        else:
            raise
    return order


async def update_order(id: str, data: dict):
    if not is_valid_object_id(id):
        raise ApiError(400, "invalid_id", "A supplied identifier or value has the wrong format.", {"path": "id", "value": id})
    order = await Order.get(id)
    if not order:
        raise ApiError(404, "order_not_found", "Order not found.", {"id": id})
    
    if "items" in data and data["items"]:
        items_in = data["items"]
        product_ids = [it.get("productId") for it in items_in]
        if len(product_ids) != len(set(product_ids)):
            raise ApiError(422, "validation_error", "Request validation failed.", [{"path": "items.1.productId", "message": "Each order item must reference a unique product.", "code": "custom"}])
        order_items = []
        for it in items_in:
            pid = it.get("productId")
            if not is_valid_object_id(pid):
                raise ApiError(400, "invalid_id", "A supplied identifier or value has the wrong format.", {"path": "items.*.productId", "value": pid})
            product = await Product.get(pid)
            if not product:
                raise ApiError(404, "product_not_found", "Product not found.", {"id": pid})
            quantity = int(it.get("quantity", 0))
            unit_price = float(product.price)
            line_total = round(unit_price * quantity, 2)
            order_items.append({
                "productId": str(product.id),
                "productName": product.name,
                "sku": product.sku,
                "quantity": quantity,
                "unitPrice": unit_price,
                "lineTotal": line_total,
            })
        order.items = order_items
        order.totalAmount = round(sum(i["lineTotal"] for i in order_items), 2)
    
    if "status" in data:
        order.status = data["status"]
    
    order.updated_at = datetime.utcnow()
    await order.save()
    return order


async def delete_order(id: str):
    if not is_valid_object_id(id):
        raise ApiError(400, "invalid_id", "A supplied identifier or value has the wrong format.", {"path": "id", "value": id})
    order = await Order.get(id)
    if not order:
        raise ApiError(404, "order_not_found", "Order not found.", {"id": id})
    await order.delete()
    return order
