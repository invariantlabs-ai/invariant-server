from fastapi import FastAPI
from server.ipc.controller import IpcController
from server.routers import policy, monitor
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")
    yield
    ipc = IpcController()
    ipc.close()


app = FastAPI(
    title="Invariant API",
    summary="REST API Server made to run Invariant policies remotely.",
    version="0.1.0",
)

app.include_router(policy.router, prefix="/api/policy", tags=["policy"])
app.include_router(monitor.router, prefix="/api/monitor", tags=["monitor"])

app.mount("/", StaticFiles(directory="playground/dist/", html=True), name="assets")
