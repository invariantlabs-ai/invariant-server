from fastapi import Depends, FastAPI
from server.ipc.controller import IpcController, get_ipc_controller
from server.routers import session, policy, monitor
from server.database import engine
from server.models import Base
from fastapi_utils.tasks import repeat_every

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Invariant API",
    summary="REST API Server made to run Invariant policies remotely.",
    version="0.1.0",
)


@app.get("/")
def index():
    return {"ok": True}


app.include_router(session.router, prefix="/session", tags=["session"])
app.include_router(policy.router, prefix="/policy", tags=["policy"])
app.include_router(monitor.router, prefix="/monitor", tags=["monitor"])


@app.on_event("startup")
@repeat_every(seconds=60)  # 1 minute
def cleanup_old_ipc() -> None:
    ipc_controller = get_ipc_controller()
    ipc_controller.cleanup()
