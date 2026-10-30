from fastapi import APIRouter
from datetime import datetime
import time

from ...config.settings import settings
from ... import db

router = APIRouter()
start_time = time.time()


@router.get("/health")
async def health():
    database = db.database_state()
    healthy = database == "connected"
    return {
        "status": "ok" if healthy else "degraded",
        "database": database,
        "environment": settings.node_env,
        "uptimeSeconds": int(time.time() - start_time),
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
    }
