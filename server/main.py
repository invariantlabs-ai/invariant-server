from fastapi import FastAPI
# from server.ipc.controller import get_ipc_controller
from server.routers import policy, monitor
# from fastapi_utils.tasks import repeat_every
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="Invariant API",
    summary="REST API Server made to run Invariant policies remotely.",
    version="0.1.0",
)

app.include_router(policy.router, prefix="/api/policy", tags=["policy"])
app.include_router(monitor.router, prefix="/api/monitor", tags=["monitor"])

app.mount("/", StaticFiles(directory="playground/dist/", html=True), name="assets")


"""
@app.on_event("startup")
@repeat_every(seconds=60)  # 1 minute
def cleanup_old_ipc() -> None:
    ipc_controller = get_ipc_controller()
    ipc_controller.cleanup()
"""