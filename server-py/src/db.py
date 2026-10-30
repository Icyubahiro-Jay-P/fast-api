from beanie import init_beanie

from .config.settings import settings
from .models import Customer, Order, Product


client = None
database = None


async def connect_db(uri: str = None):
    global client, database
    mongo_uri = uri or settings.mongodb_uri
    from urllib.parse import urlparse
    parsed = urlparse(mongo_uri)
    db_name = parsed.path.strip("/") if parsed.path and parsed.path.strip("/") else None
    # Create fresh client
    import motor.motor_asyncio
    if client is not None:
        try:
            client.close()
        except Exception:
            pass
    client = motor.motor_asyncio.AsyncIOMotorClient(mongo_uri)
    if db_name:
        database = client[db_name]
    else:
        database = client.get_database()
    try:
        await init_beanie(database=database, document_models=[Customer, Product, Order])
    except Exception:
        await init_beanie(connection_string=mongo_uri, document_models=[Customer, Product, Order])
        if db_name:
            database = client[db_name]
        else:
            database = client.get_database()
    return database


async def disconnect_db():
    global client
    if client:
        try:
            client.close()
        except Exception:
            pass
    client = None


def database_state():
    if client is None or database is None:
        return "disconnected"
    return "connected"
