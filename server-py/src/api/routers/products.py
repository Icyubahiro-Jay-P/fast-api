from fastapi import APIRouter, Query
from typing import Optional

from ...schemas.product import ProductCreate, ProductUpdate, ProductQuery
from ...services import product_service
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
        # Remove _id
        if '_id' in d:
            d.pop('_id')
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
async def list_products(
    search: Optional[str] = Query(None, max_length=100),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    minPrice: Optional[float] = Query(None, ge=0),
    maxPrice: Optional[float] = Query(None, ge=0),
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=100),
    sort: Optional[str] = Query(None),
):
    try:
        if minPrice is not None and maxPrice is not None and minPrice > maxPrice:
            raise ApiError(422, "validation_error", "Request validation failed.", [{"path": "minPrice", "message": "minPrice must be <= maxPrice", "code": "custom"}])
        query = ProductQuery(
            search=search, category=category, status=status,
            minPrice=minPrice, maxPrice=maxPrice,
            page=page, pageSize=pageSize, sort=sort
        )
    except ApiError:
        raise
    except Exception:
        raise ApiError(422, "validation_error", "Request validation failed.", [])
    
    result = await product_service.list_products(
        search=query.search, category=query.category, status=query.status,
        min_price=query.minPrice, max_price=query.maxPrice,
        sort=query.sort, page=query.page, page_size=query.pageSize
    )
    return send_page(result["items"], result["total"], query.page, query.pageSize)


@router.get("/{id}")
async def get_product(id: str):
    product = await product_service.get_product(id)
    d = product.model_dump() if hasattr(product, 'model_dump') else dict(product)
    if hasattr(product, 'id') and product.id:
        d['id'] = str(product.id)
    d.pop('_id', None)
    return d


@router.post("", status_code=201)
@router.post("/", status_code=201)
async def create_product(product: ProductCreate):
    try:
        data = product.model_dump()
        created = await product_service.create_product(data)
        d = created.model_dump() if hasattr(created, 'model_dump') else dict(created)
        if hasattr(created, 'id') and created.id:
            d['id'] = str(created.id)
        d.pop('_id', None)
        return d
    except ApiError:
        raise


@router.patch("/{id}")
async def update_product(id: str, product: ProductUpdate):
    data = {k: v for k, v in product.model_dump().items() if v is not None}
    updated = await product_service.update_product(id, data)
    d = updated.model_dump() if hasattr(updated, 'model_dump') else dict(updated)
    if hasattr(updated, 'id') and updated.id:
        d['id'] = str(updated.id)
    d.pop('_id', None)
    return d


@router.delete("/{id}", status_code=204)
async def delete_product(id: str):
    await product_service.delete_product(id)
    return None
