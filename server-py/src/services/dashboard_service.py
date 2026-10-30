from datetime import datetime, timedelta

from ..models import Order, Product, Customer


REVENUE_STATUSES = {"paid", "shipped", "completed"}


async def summary():
    total_orders = await Order.find_all().count()
    total_customers = await Customer.find_all().count()
    total_products = await Product.find_all().count()

    orders = await Order.find_all().to_list()
    revenue_orders = 0
    total_revenue = 0.0
    for o in orders:
        if getattr(o, "status") in REVENUE_STATUSES:
            revenue_orders += 1
            total_revenue += float(getattr(o, "totalAmount") or 0.0)
    total_revenue = round(total_revenue, 2)
    average_order_value = round(total_revenue / revenue_orders, 2) if revenue_orders else 0.0

    low_stock_products = await Product.find({"stock": {"$lt": 10}}).count()

    return {
        "totalCustomers": total_customers,
        "totalProducts": total_products,
        "totalOrders": total_orders,
        "totalRevenue": total_revenue,
        "revenueOrders": revenue_orders,
        "averageOrderValue": average_order_value,
        "lowStockProducts": low_stock_products,
    }


async def orders_by_status():
    statuses = ["pending", "paid", "shipped", "completed", "cancelled"]
    result = []
    for s in statuses:
        count = await Order.find({"status": s}).count()
        result.append({"status": s, "count": count})
    return result


async def products_by_category():
    try:
        product_col = Product.get_pymongo_collection()
    except Exception:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            from .. import db
            product_col = db.database.get_collection("products") if db.database else None
        except Exception:
            product_col = None
    if product_col is None:
        # fallback
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1, "_id": 1}},
        ]
    else:
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1, "_id": 1}},
        ]
    try:
        agg = product_col.aggregate(pipeline)
        items = []
        async for doc in agg:
            items.append({"category": doc.get("_id"), "count": doc.get("count")})
        return items
    except Exception:
        # fallback to python
        products = await Product.find_all().to_list()
        from collections import Counter
        c = Counter([getattr(p, "category") for p in products])
        # sort by count desc, then category asc
        return [{"category": k, "count": v} for k, v in sorted(c.items(), key=lambda x: (-x[1], x[0]))]


async def monthly_revenue(months: int = 12):
    result_list = []
    # build last months in chronological order (UTC)
    current = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    months_list = []
    tmp = current
    for i in range(months):
        months_list.append(tmp)
        if tmp.month == 1:
            tmp = tmp.replace(year=tmp.year - 1, month=12)
        else:
            tmp = tmp.replace(month=tmp.month - 1)
    months_list = list(reversed(months_list))
    for m in months_list:
        key = m.strftime("%Y-%m")
        start = m
        if m.month == 12:
            end_month_start = m.replace(year=m.year + 1, month=1)
        else:
            end_month_start = m.replace(month=m.month + 1)
        end = end_month_start - timedelta(microseconds=1)
        try:
            order_col = Order.get_pymongo_collection()
            pipeline = [
                {"$match": {"status": {"$in": list(REVENUE_STATUSES)}}},
                {"$match": {"$or": [
                    {"createdAt": {"$gte": start, "$lte": end}},
                    {"created_at": {"$gte": start, "$lte": end}},
                ]}},
                {"$group": {"_id": None, "revenue": {"$sum": "$totalAmount"}, "orders": {"$sum": 1}}},
            ]
            agg = order_col.aggregate(pipeline)
            doc = None
            async for d in agg:
                doc = d
                break
            if doc:
                result_list.append({"month": key, "revenue": round(float(doc.get("revenue", 0)), 2), "orders": doc.get("orders", 0)})
            else:
                result_list.append({"month": key, "revenue": 0.0, "orders": 0})
        except Exception:
            # fallback
            try:
                orders = await Order.find_all().to_list()
                revenue = 0.0
                count = 0
                for o in orders:
                    if getattr(o, "status") not in REVENUE_STATUSES:
                        continue
                    created = getattr(o, "created_at", None) or getattr(o, "createdAt", None)
                    if created and start <= created <= end:
                        revenue += float(getattr(o, "totalAmount") or 0.0)
                        count += 1
                result_list.append({"month": key, "revenue": round(revenue, 2), "orders": count})
            except Exception:
                result_list.append({"month": key, "revenue": 0.0, "orders": 0})
    return result_list


async def top_products(limit: int = 5):
    try:
        order_col = Order.get_pymongo_collection()
        pipeline = [
            {"$match": {"status": {"$in": list(REVENUE_STATUSES)}}},
            {"$unwind": "$items"},
            {"$group": {
                "_id": "$items.productId",
                "productName": {"$first": "$items.productName"},
                "sku": {"$first": "$items.sku"},
                "unitsSold": {"$sum": "$items.quantity"},
                "revenue": {"$sum": "$items.lineTotal"},
            }},
            {"$sort": {"unitsSold": -1, "revenue": -1}},
            {"$limit": limit},
        ]
        agg = order_col.aggregate(pipeline)
        items = []
        async for doc in agg:
            items.append({
                "productId": doc.get("_id"),
                "productName": doc.get("productName"),
                "sku": doc.get("sku"),
                "unitsSold": doc.get("unitsSold"),
                "revenue": round(float(doc.get("revenue", 0)), 2),
            })
        return items
    except Exception:
        # fallback
        orders = await Order.find_all().to_list()
        from collections import defaultdict
        data = defaultdict(lambda: {"productName": "", "sku": "", "unitsSold": 0, "revenue": 0.0})
        for o in orders:
            if getattr(o, "status") not in REVENUE_STATUSES:
                continue
            for it in getattr(o, "items", []):
                pid = it.get("productId")
                data[pid]["productName"] = it.get("productName") or data[pid]["productName"]
                data[pid]["sku"] = it.get("sku") or data[pid]["sku"]
                data[pid]["unitsSold"] += int(it.get("quantity") or 0)
                data[pid]["revenue"] += float(it.get("lineTotal") or 0.0)
        items = [{"productId": k, **v} for k, v in data.items()]
        items.sort(key=lambda x: (-x["unitsSold"], -x["revenue"]))
        for it in items:
            it["revenue"] = round(float(it["revenue"]), 2)
        return items[:limit]


async def recent_orders(limit: int = 5):
    orders = []
    try:
        orders = await Order.find_all().sort(-Order.created_at).limit(limit).to_list()
    except Exception:
        try:
            orders = await Order.find_all().sort(-Order.updated_at).limit(limit).to_list()
        except Exception:
            try:
                orders = await Order.find_all().to_list()
                orders = sorted(orders, key=lambda x: getattr(x, "created_at", getattr(x, "updated_at", datetime.min)), reverse=True)[:limit]
            except Exception:
                orders = []
    result = []
    for order in orders:
        created = getattr(order, "created_at", None) or getattr(order, "createdAt", None)
        result.append({
            "id": str(order.id),
            "orderNumber": getattr(order, "orderNumber"),
            "customerName": getattr(order, "customerName"),
            "totalAmount": getattr(order, "totalAmount"),
            "status": getattr(order, "status"),
            "createdAt": created.isoformat() + "Z" if created else None,
        })
    return result
