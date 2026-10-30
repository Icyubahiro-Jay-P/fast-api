import pytest


async def make_customer(client, **overrides):
    payload = {"name": "Jordan Ellis", "email": "jordan@example.com"}
    payload.update(overrides)
    response = await client.post("/api/v1/customers", json=payload)
    return response.json()


async def make_product(client, **overrides):
    payload = {"name": "Headphones", "sku": "HD-001", "category": "Audio", "price": 149.99, "stock": 10}
    payload.update(overrides)
    response = await client.post("/api/v1/products", json=payload)
    return response.json()


@pytest.mark.asyncio
async def test_create_order_snapshots_product_details(client):
    customer = await make_customer(client)
    product = await make_product(client, price=49.5, stock=20)

    response = await client.post("/api/v1/orders", json={
        "customerId": customer["id"],
        "items": [{"productId": product["id"], "quantity": 2}],
    })
    assert response.status_code == 201
    body = response.json()
    assert body["orderNumber"].startswith("ORD-")
    assert body["customerId"] == customer["id"]
    assert body["customerName"] == customer["name"]
    assert body["status"] == "pending"
    assert body["items"][0]["productName"] == product["name"]
    assert body["items"][0]["sku"] == product["sku"]
    assert body["items"][0]["unitPrice"] == 49.5
    assert body["items"][0]["lineTotal"] == 99.0
    assert body["totalAmount"] == 99.0


@pytest.mark.asyncio
async def test_order_validation_and_not_found_cases(client):
    customer = await make_customer(client)
    product = await make_product(client)

    bad_customer = await client.post("/api/v1/orders", json={
        "customerId": "000000000000000000000000",
        "items": [{"productId": product["id"], "quantity": 1}],
    })
    assert bad_customer.status_code == 404
    assert bad_customer.json()["error"]["code"] == "customer_not_found"

    bad_product = await client.post("/api/v1/orders", json={
        "customerId": customer["id"],
        "items": [{"productId": "000000000000000000000000", "quantity": 1}],
    })
    assert bad_product.status_code == 404
    assert bad_product.json()["error"]["code"] == "product_not_found"

    duplicate_items = await client.post("/api/v1/orders", json={
        "customerId": customer["id"],
        "items": [
            {"productId": product["id"], "quantity": 1},
            {"productId": product["id"], "quantity": 2},
        ],
    })
    assert duplicate_items.status_code == 422
    assert duplicate_items.json()["error"]["details"][0]["path"] == "items.1.productId"


@pytest.mark.asyncio
async def test_order_listing_filters_and_update(client):
    customer = await make_customer(client, name="Casey")
    product = await make_product(client, price=49.5)

    created = await client.post("/api/v1/orders", json={
        "customerId": customer["id"],
        "items": [{"productId": product["id"], "quantity": 3}],
    })
    order = created.json()

    list_response = await client.get("/api/v1/orders", params={"search": "CASEY", "status": "pending"})
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1

    updated = await client.patch(f"/api/v1/orders/{order['id']}", json={"status": "paid"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "paid"

    with_items = await client.patch(f"/api/v1/orders/{order['id']}", json={
        "items": [{"productId": product["id"], "quantity": 1}],
    })
    assert with_items.status_code == 200
    assert with_items.json()["totalAmount"] == 49.5

    empty_patch = await client.patch(f"/api/v1/orders/{order['id']}", json={})
    assert empty_patch.status_code == 422
