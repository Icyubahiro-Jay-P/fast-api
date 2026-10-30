from fastapi import APIRouter, Query
from typing import Optional

from ...schemas.customer import CustomerCreate, CustomerUpdate
from ...services import customer_service
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
        # Ensure phone is string
        if d.get('phone') is None:
            d['phone'] = ""
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
async def list_customers(
    search: Optional[str] = Query(None, max_length=100),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=100),
    sort: Optional[str] = Query(None),
):
    result = await customer_service.list_customers(
        search=search, status=status, sort=sort, page=page, page_size=pageSize
    )
    return send_page(result["items"], result["total"], page, pageSize)


@router.get("/{id}")
async def get_customer(id: str):
    customer = await customer_service.get_customer(id)
    d = customer.model_dump() if hasattr(customer, 'model_dump') else dict(customer)
    if hasattr(customer, 'id') and customer.id:
        d['id'] = str(customer.id)
    d.pop('_id', None)
    if d.get('phone') is None:
        d['phone'] = ""
    return d


@router.post("", status_code=201)
@router.post("/", status_code=201)
async def create_customer(customer: CustomerCreate):
    try:
        data = customer.model_dump()
        if data.get('phone') is None:
            data['phone'] = ""
        created = await customer_service.create_customer(data)
        d = created.model_dump() if hasattr(created, 'model_dump') else dict(created)
        if hasattr(created, 'id') and created.id:
            d['id'] = str(created.id)
        d.pop('_id', None)
        if d.get('phone') is None:
            d['phone'] = ""
        return d
    except ApiError:
        raise


@router.patch("/{id}")
async def update_customer(id: str, customer: CustomerUpdate):
    data = {k: v for k, v in customer.model_dump().items() if v is not None}
    updated = await customer_service.update_customer(id, data)
    d = updated.model_dump() if hasattr(updated, 'model_dump') else dict(updated)
    if hasattr(updated, 'id') and updated.id:
        d['id'] = str(updated.id)
    d.pop('_id', None)
    if d.get('phone') is None:
        d['phone'] = ""
    return d


@router.delete("/{id}", status_code=204)
async def delete_customer(id: str):
    await customer_service.delete_customer(id)
    return None
