from fastapi import FastAPI, Request
from server.routers import policy, monitor
from server.ipc.controller import get_ipc_controller
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from prometheus_fastapi_instrumentator import Instrumentator, metrics
from prometheus_fastapi_instrumentator.metrics import Info
from prometheus_client import Gauge
from contextlib import asynccontextmanager
from server import logging
import psutil
import hashlib


class HashRequestBodyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        body = await request.body()
        # Calculate the hash of the request body
        body_hash = hashlib.blake2b(body).hexdigest()

        # Add the hash to the request state
        request.state.body_hash = body_hash
        request.state.body_content = body

        # Proceed with the request
        response = await call_next(request)
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    await logging.init()
    ipc = get_ipc_controller()
    yield
    ipc.close()


app = FastAPI(
    title="Invariant API",
    summary="REST API Server made to run Invariant policies remotely.",
    version="0.1.0",
    lifespan=lifespan,
)


def system_usage():
    SYSTEM_USAGE = Gauge(
        "invariant_server_system_usage",
        "Hold current system resource usage",
        ["resource_type"],
    )

    def instrumentation(_: Info) -> None:
        virtual_memory = psutil.virtual_memory()
        SYSTEM_USAGE.labels("CPU").set(psutil.cpu_percent())
        SYSTEM_USAGE.labels("Memory").set(virtual_memory.percent)

    return instrumentation


Instrumentator(excluded_handlers=["/metrics"]).add(
    metrics.default(
        metric_namespace="invariant",
        metric_subsystem="server",
    )
).add(
    metrics.request_size(
        metric_namespace="invariant",
        metric_subsystem="server",
        should_include_handler=True,
        should_include_method=False,
        should_include_status=True,
    )
).add(
    metrics.response_size(
        metric_namespace="invariant",
        metric_subsystem="server",
        should_include_handler=True,
        should_include_method=False,
        should_include_status=True,
    )
).add(system_usage()).instrument(app).expose(app)

app.add_middleware(HashRequestBodyMiddleware)

app.include_router(policy.router, prefix="/api/policy", tags=["policy"])
app.include_router(monitor.router, prefix="/api/monitor", tags=["monitor"])

app.mount("/", StaticFiles(directory="playground/dist/", html=True), name="assets")
