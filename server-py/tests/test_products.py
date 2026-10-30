import pytest


async def make_product(client, **overrides):
    payload = {
        "name": "Wireless Mouse",
        "sku": "MOU-001",
        "category": "Accessories",
        "price": 24.99,
        "stock": 50,
    }
    payload.update(overrides)
    response = await client.post("/api/v1/products", json=payload)
    return response.json()


async def make_customer(client, **overrides):
    payload = {
        "name": "Alex Johnson",
        "email": "alex@example.com",
    }
    payload.update(overrides)
    response = await client.post("/api/v1/customers", json=payload)
    return response.json()


async def make_order(client, customer, items):
    payload = {
        "customerId": customer["id"],
        "items": [{"productId": item["product"]["id"], "quantity": item["quantity"]} for item in items],
    }
    response = await client.post("/api/v1/orders", json=payload)
    return response.json()


@pytest.mark.asyncio
async def test_product_crud_and_listing(client):
    created = await make_product(client)
    assert created["id"]
    assert created["sku"] == "MOU-001"

    list_response = await client.get("/api/v1/products")
    assert list_response.status_code == 200
    body = list_response.json()
    assert body["page"] == 1
    assert body["pageSize"] == 10
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Wireless Mouse"


@pytest.mark.asyncio
async def test_rejects_duplicate_sku(client):
    await make_product(client, sku="dup-001")
    response = await client.post("/api/v1/products", json={
        "name": "Another",
        "sku": "dup-001",
        "category": "Testing",
        "price": 10,
    })
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "duplicate_value"
    assert response.json()["error"]["details"]["field"] == "sku"


@pytest.mark.asyncio
async def test_validates_price_stock_sku_format(client):
    response = await client.post("/api/v1/products", json={
        "name": "Bad Product",
        "sku": "bad sku!",
        "category": "Testing",
        "price": 0,
        "stock": -2,
    })
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


@pytest.mark.asyncio
async def test_filters_by_category_and_price_range(client):
    await make_product(client, sku="AUD-001", category="Audio", price=100)
    await make_product(client, sku="AUD-002", category="Audio", price=300)
    await make_product(client, sku="DIS-001", category="Displays", price=200)

    response = await client.get("/api/v1/products?category=audio&minPrice=150&maxPrice=350")
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["sku"] == "AUD-002"


@pytest.mark.asyncio
async def test_rejects_inverted_price_range(client):
    response = await client.get("/api/v1/products?minPrice=500&maxPrice=100")
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["path"] == "minPrice"


@pytest.mark.asyncio
async def test_retrieve_update_delete_product(client):
    product = await make_product(client, stock=2)
    fetched = await client.get(f"/api/v1/products/{product['id']}")
    assert fetched.status_code == 200

    updated = await client.patch(f"/api/v1/products/{product['id']}", json={"stock": 20, "status": "draft"})
    assert updated.status_code == 200
    assert updated.json()["stock"] == 20
    assert updated.json()["status"] == "draft"

    deleted = await client.delete(f"/api/v1/products/{product['id']}")
    assert deleted.status_code == 204

    missing = await client.get(f"/api/v1/products/{product['id']}")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "product_not_found"


@pytest.mark.asyncio
async def test_prevents_deleting_product_referenced_by_order(client):
    customer = await make_customer(client)
    product = await make_product(client)
    await make_order(client, customer, [{"product": product, "quantity": 1}])

    response = await client.delete(f"/api/v1/products/{product['id']}")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "product_in_use"
