from fastapi import FastAPI
from server.routers import policy, monitor
from fastapi.staticfiles import StaticFiles


app = FastAPI(
    title="Invariant API",
    summary="REST API Server made to run Invariant policies remotely.",
    version="0.1.0",
)

app.include_router(policy.router, prefix="/api/policy", tags=["policy"])
app.include_router(monitor.router, prefix="/api/monitor", tags=["monitor"])

app.mount("/", StaticFiles(directory="playground/dist/", html=True), name="assets")
