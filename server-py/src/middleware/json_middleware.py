from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import json


class JSONErrorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"] and request.headers.get("content-type", "").startswith("application/json"):
            body = await request.body()
            if body:
                try:
                    json.loads(body)
                except json.JSONDecodeError:
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
            request.scope["_body"] = body
        response = await call_next(request)
        return response
