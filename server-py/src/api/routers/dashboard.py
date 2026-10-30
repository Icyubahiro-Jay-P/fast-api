from fastapi import APIRouter, Query

from ...services import dashboard_service
from ...schemas.order import MonthlyRevenueQuery, LimitQuery
from ...utils.errors import ApiError

router = APIRouter()


@router.get("/summary")
@router.get("summary")
async def get_summary():
    return await dashboard_service.summary()


@router.get("/orders-by-status")
@router.get("orders-by-status")
async def get_orders_by_status():
    return await dashboard_service.orders_by_status()


@router.get("/products-by-category")
@router.get("products-by-category")
async def get_products_by_category():
    return await dashboard_service.products_by_category()


@router.get("/monthly-revenue")
@router.get("monthly-revenue")
async def get_monthly_revenue(months: int = Query(12, ge=1, le=36)):
    try:
        query = MonthlyRevenueQuery(months=months)
    except Exception:
        raise ApiError(422, "validation_error", "Request validation failed.", [])
    return await dashboard_service.monthly_revenue(query.months)


@router.get("/top-products")
@router.get("top-products")
async def get_top_products(limit: int = Query(5, ge=1, le=20)):
    try:
        query = LimitQuery(limit=limit)
    except Exception:
        raise ApiError(422, "validation_error", "Request validation failed.", [])
    return await dashboard_service.top_products(query.limit)


@router.get("/recent-orders")
@router.get("recent-orders")
async def get_recent_orders(limit: int = Query(5, ge=1, le=20)):
    try:
        query = LimitQuery(limit=limit)
    except Exception:
        raise ApiError(422, "validation_error", "Request validation failed.", [])
    return await dashboard_service.recent_orders(query.limit)
