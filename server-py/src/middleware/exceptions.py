from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from bson.errors import InvalidId

from ..utils.errors import ApiError


def format_validation_errors(exc):
    details = []
    for error in exc.errors():
        # Extract path
        loc = error.get("loc", ())
        # Skip 'body' or first element
        if len(loc) > 0 and loc[0] in ("body",):
            path_parts = loc[1:]
        elif len(loc) > 1:
            path_parts = loc[1:]
        else:
            path_parts = loc
        path = ".".join(str(p) for p in path_parts) if path_parts else "body"
        msg = error["msg"]
        # Handle our custom message
        if "items." in msg and "unique product" in msg:
            # Try to extract items.X.productId
            import re
            m = re.search(r'items\.(\d+)\.productId', msg)
            if m:
                path = f"items.{m.group(1)}.productId"
                msg = "Each order item must reference a unique product."
        details.append({
            "path": path,
            "message": msg.replace("Value error, ", ""),
            "code": "custom" if error.get("type") == "value_error" else error.get("type"),
        })
    return details


async def api_error_handler(request: Request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = format_validation_errors(exc)
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "message": "Request validation failed.",
                "details": details,
            }
        },
    )


async def invalid_id_handler(request: Request, exc: InvalidId):
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "invalid_id",
                "message": "A supplied identifier or value has the wrong format.",
                "details": {"path": "id", "value": str(exc)},
            }
        },
    )
