import os
import asyncio
from urllib.parse import urlparse

import pytest
from httpx import AsyncClient
from httpx._transports.asgi import ASGITransport

# Set test env
os.environ["NODE_ENV"] = "test"
os.environ["MONGODB_URI"] = os.environ.get("MONGODB_URI", "mongodb://127.0.0.1:27017/cedo_test")

from src.main import app
from src import db
from src.models import Customer, Product, Order


@pytest.fixture(scope="function")
async def setup_db():
    # Check DB name
    uri = os.environ["MONGODB_URI"]
    parsed = urlparse(uri)
    db_name = parsed.path.strip("/") or ""
    if not db_name.endswith("_test"):
        raise Exception("Refusing to run tests against a database whose name does not end in _test.")
    
    # Close any existing connection
    try:
        await db.disconnect_db()
    except Exception:
        pass
    db.client = None
    db.database = None
    
    await db.connect_db(uri)
    yield
    # Drop and disconnect
    try:
        if db.database is not None and hasattr(db.database, 'client'):
            await db.database.client.drop_database(db_name)
    except Exception:
        pass
    try:
        await db.disconnect_db()
    except Exception:
        pass
    db.client = None
    db.database = None


@pytest.fixture(autouse=True)
async def clean_db(setup_db):
    await Order.delete_all()
    await Product.delete_all()
    await Customer.delete_all()
    yield


@pytest.fixture
async def client(setup_db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
