import pytest


async def make_customer(client, **overrides):
    payload = {
        "name": "Morgan Rivera",
        "email": "morgan@example.com",
        "phone": "+15551234567",
    }
    payload.update(overrides)
    response = await client.post("/api/v1/customers", json=payload)
    return response.json()


async def make_product(client, **overrides):
    payload = {
        "name": "Keyboard",
        "sku": "KEY-001",
        "category": "Accessories",
        "price": 79.49,
        "stock": 25,
    }
    payload.update(overrides)
    response = await client.post("/api/v1/products", json=payload)
    return response.json()


async def make_order(client, customer, items):
    payload = {
        "customerId": customer["id"],
        "items": [{"productId": item["product"]["id"], "quantity": item["quantity"]} for item in items],
    }
    response = await client.post("/api/v1/orders", json=payload)
    return response.json()


@pytest.mark.asyncio
async def test_customer_crud(client):
    created = await make_customer(client)
    assert created["id"]
    assert created["email"] == "morgan@example.com"

    list_response = await client.get("/api/v1/customers")
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1

    fetched = await client.get(f"/api/v1/customers/{created['id']}")
    assert fetched.status_code == 200

    updated = await client.patch(f"/api/v1/customers/{created['id']}", json={"status": "inactive"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "inactive"

    deleted = await client.delete(f"/api/v1/customers/{created['id']}")
    assert deleted.status_code == 204


@pytest.mark.asyncio
async def test_duplicate_email_rejected(client):
    await make_customer(client, email="dup@example.com")
    response = await client.post("/api/v1/customers", json={"name": "Other", "email": "dup@example.com"})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "duplicate_value"
    assert response.json()["error"]["details"]["field"] == "email"


@pytest.mark.asyncio
async def test_customer_search_and_status_filter(client):
    await make_customer(client, name="Taylor", email="taylor@example.com", status="active")
    await make_customer(client, name="Cameron", email="cameron@example.com", status="inactive")

    search = await client.get("/api/v1/customers?search=tay")
    assert search.status_code == 200
    assert len(search.json()["items"]) == 1

    status_filter = await client.get("/api/v1/customers?status=inactive")
    assert status_filter.status_code == 200
    assert len(status_filter.json()["items"]) == 1


@pytest.mark.asyncio
async def test_cannot_delete_customer_with_orders(client):
    customer = await make_customer(client)
    product = await make_product(client)
    await make_order(client, customer, [{"product": product, "quantity": 2}])

    response = await client.delete(f"/api/v1/customers/{customer['id']}")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "customer_in_use"
