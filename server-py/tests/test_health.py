import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert data["environment"] == "test"


@pytest.mark.asyncio
async def test_api_root(client):
    response = await client.get("/api")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "CEDO API"
    assert data["version"] == "v1"


@pytest.mark.asyncio
async def test_unknown_route(client):
    response = await client.get("/api/v1/unknown")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "route_not_found"


@pytest.mark.asyncio
async def test_invalid_json(client):
    response = await client.post(
        "/api/v1/customers",
        content='{"name":',
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "invalid_json"
