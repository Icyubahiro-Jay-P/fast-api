import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from bson.errors import InvalidId
from starlette.exceptions import HTTPException as StarletteHTTPException
import uvicorn

from .config.settings import settings
from . import db
from .api.routers import health, products, customers, orders, dashboard
from .middleware.exceptions import api_error_handler, validation_exception_handler, invalid_id_handler
from .utils.errors import ApiError


async def json_decode_exception_handler(request: Request, exc):
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "invalid_json",
                "message": "The request body contains invalid JSON.",
                "details": None,
            }
        },
    )


app = FastAPI(title="CEDO API", version="v1")

# CORS
origins = settings.cors_origins()
if origins == ["*"]:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Exception handlers
app.add_exception_handler(ApiError, api_error_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(InvalidId, invalid_id_handler)
try:
    from fastapi.exceptions import RequestValidationError as _RVE
    from fastapi.encoders import jsonable_encoder
    # JSON decode errors in newer FastAPI versions are handled differently
    pass
except Exception:
    pass

# Handle JSON decode errors
from fastapi import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware


@app.on_event("startup")
async def startup_event():
    await db.connect_db()


@app.on_event("shutdown")
async def shutdown_event():
    await db.disconnect_db()


@app.get("/api")
async def api_root():
    return {
        "name": "CEDO API",
        "version": "v1",
        "health": "/api/health",
        "baseUrl": "/api/v1",
    }


@app.get("/api/v1")
async def api_v1_root():
    return {
        "name": "CEDO API",
        "version": "v1",
        "resources": ["customers", "products", "orders", "dashboard"],
    }


# Mount routers
app.include_router(health.router, prefix="/api")
app.include_router(products.router, prefix="/api/v1/products")
app.include_router(customers.router, prefix="/api/v1/customers")
app.include_router(orders.router, prefix="/api/v1/orders")
app.include_router(dashboard.router, prefix="/api/v1/dashboard")


# 404 for unknown API routes
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    path = request.url.path
    if path.startswith("/api"):
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "route_not_found", "message": "Route not found.", "details": None}},
        )
    return JSONResponse(
        status_code=404,
        content={"error": {"code": "route_not_found", "message": "Route not found.", "details": None}},
    )


@app.get("/")
async def root():
    return {
        "name": "CEDO API",
        "message": "API is running. Start the React client with npm run dev.",
        "health": "/api/health",
    }


# Override exception handlers more directly
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Check if it's JSON decode
    if isinstance(exc, Exception):
        msg = str(exc).lower()
        if "json" in msg and ("decode" in msg or "expecting" in msg):
            return JSONResponse(
                status_code=400,
                content={"error": {"code": "invalid_json", "message": "The request body contains invalid JSON.", "details": None}},
            )
    raise exc


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)


from .middleware.json_middleware import JSONErrorMiddleware
app.add_middleware(JSONErrorMiddleware)

# Add middleware for JSON error at the end
