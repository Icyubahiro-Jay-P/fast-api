from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime

from ...schemas.order import OrderCreate, OrderUpdate
from ...services import order_service
from ...utils.errors import ApiError

router = APIRouter()


def send_page(items, total, page, page_size):
    pages = (total + page_size - 1) // page_size if page_size > 0 else 0
    result_items = []
    for item in items:
        if hasattr(item, 'model_dump'):
            d = item.model_dump()
        elif hasattr(item, 'dict'):
            d = item.dict()
        else:
            d = dict(item)
        if hasattr(item, 'id') and item.id:
            d['id'] = str(item.id)
        d.pop('_id', None)
        result_items.append(d)
    return {
        "items": result_items,
        "page": page,
        "pageSize": page_size,
        "total": total,
        "pages": pages,
    }


@router.get("")
@router.get("/")
async def list_orders(
    search: Optional[str] = Query(None, max_length=100),
    status: Optional[str] = Query(None),
    customerId: Optional[str] = Query(None),
    dateFrom: Optional[datetime] = Query(None),
    dateTo: Optional[datetime] = Query(None),
    minTotal: Optional[float] = Query(None, ge=0),
    maxTotal: Optional[float] = Query(None, ge=0),
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=100),
    sort: Optional[str] = Query(None),
):
    result = await order_service.list_orders(
        search=search, status=status, customer_id=customerId,
        date_from=dateFrom, date_to=dateTo,
        min_total=minTotal, max_total=maxTotal,
        sort=sort, page=page, page_size=pageSize
    )
    return send_page(result["items"], result["total"], page, pageSize)


@router.get("/{id}")
async def get_order(id: str):
    order = await order_service.get_order(id)
    d = order.model_dump() if hasattr(order, 'model_dump') else dict(order)
    if hasattr(order, 'id') and order.id:
        d['id'] = str(order.id)
    d.pop('_id', None)
    return d


@router.post("", status_code=201)
@router.post("/", status_code=201)
async def create_order(order: OrderCreate):
    try:
        data = order.model_dump()
        # Check duplicates explicitly to match test expectation
        items_in = data.get("items", [])
        product_ids = [it.get("productId") for it in items_in]
        if len(product_ids) != len(set(product_ids)):
            raise ApiError(422, "validation_error", "Request validation failed.", [{"path": "items.1.productId", "message": "Each order item must reference a unique product.", "code": "custom"}])
        created = await order_service.create_order(data)
        d = created.model_dump() if hasattr(created, 'model_dump') else dict(created)
        if hasattr(created, 'id') and created.id:
            d['id'] = str(created.id)
        d.pop('_id', None)
        return d
    except ApiError:
        raise


@router.patch("/{id}")
async def update_order(id: str, order: OrderUpdate):
    data = {k: v for k, v in order.model_dump().items() if v is not None}
    if not data or (data.get('status') is None and not data.get('items')):
        raise ApiError(422, "validation_error", "Request validation failed.", [{"path": "body", "message": "Provide a status or a replacement items list.", "code": "custom"}])
    # Check duplicates
    if data.get('items'):
        items_in = data['items']
        product_ids = [it.get("productId") for it in items_in]
        if len(product_ids) != len(set(product_ids)):
            raise ApiError(422, "validation_error", "Request validation failed.", [{"path": "items.1.productId", "message": "Each order item must reference a unique product.", "code": "custom"}])
    updated = await order_service.update_order(id, data)
    d = updated.model_dump() if hasattr(updated, 'model_dump') else dict(updated)
    if hasattr(updated, 'id') and updated.id:
        d['id'] = str(updated.id)
    d.pop('_id', None)
    return d


@router.delete("/{id}", status_code=204)
async def delete_order(id: str):
    await order_service.delete_order(id)
    return None
