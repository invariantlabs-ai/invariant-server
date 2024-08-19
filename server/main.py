from fastapi import FastAPI, Request
from server.routers import policy, monitor
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
import hashlib


class HashRequestBodyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        body = await request.body()
        # Calculate the hash of the request body
        body_hash = hashlib.blake2b(body).hexdigest()

        # Add the hash to the request state
        request.state.body_hash = body_hash

        # Proceed with the request
        response = await call_next(request)
        return response


app = FastAPI(
    title="Invariant API",
    summary="REST API Server made to run Invariant policies remotely.",
    version="0.1.0",
)

app.add_middleware(HashRequestBodyMiddleware)

app.include_router(policy.router, prefix="/api/policy", tags=["policy"])
app.include_router(monitor.router, prefix="/api/monitor", tags=["monitor"])

app.mount("/", StaticFiles(directory="playground/dist/", html=True), name="assets")
