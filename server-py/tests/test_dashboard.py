import pytest


async def make_customer(client, **overrides):
    payload = {"name": "Morgan Rivera", "email": "morgan@example.com"}
    payload.update(overrides)
    response = await client.post("/api/v1/customers", json=payload)
    return response.json()


async def make_product(client, **overrides):
    payload = {"name": "Keyboard", "sku": "KEY-001", "category": "Accessories", "price": 79.49, "stock": 5}
    payload.update(overrides)
    response = await client.post("/api/v1/products", json=payload)
    return response.json()


@pytest.mark.asyncio
async def test_dashboard_summary_and_charts(client):
    customer = await make_customer(client)
    product = await make_product(client, price=50, stock=3)

    await client.post("/api/v1/orders", json={
        "customerId": customer["id"],
        "items": [{"productId": product["id"], "quantity": 2}],
        "status": "paid",
    })
    await client.post("/api/v1/orders", json={
        "customerId": customer["id"],
        "items": [{"productId": product["id"], "quantity": 1}],
        "status": "pending",
    })

    summary = await client.get("/api/v1/dashboard/summary")
    assert summary.status_code == 200
    summary_body = summary.json()
    assert summary_body["totalOrders"] == 2
    assert summary_body["revenueOrders"] == 1
    assert summary_body["totalRevenue"] == 100.0
    assert summary_body["averageOrderValue"] == 100.0
    assert summary_body["lowStockProducts"] == 1

    by_status = await client.get("/api/v1/dashboard/orders-by-status")
    assert by_status.status_code == 200
    assert len(by_status.json()) == 5

    by_category = await client.get("/api/v1/dashboard/products-by-category")
    assert by_category.status_code == 200
    assert by_category.json()[0]["category"] == "Accessories"

    monthly = await client.get("/api/v1/dashboard/monthly-revenue?months=6")
    assert monthly.status_code == 200
    assert len(monthly.json()) == 6

    top = await client.get("/api/v1/dashboard/top-products?limit=3")
    assert top.status_code == 200
    assert top.json()[0]["unitsSold"] == 2

    recent = await client.get("/api/v1/dashboard/recent-orders?limit=5")
    assert recent.status_code == 200
    assert len(recent.json()) == 2
