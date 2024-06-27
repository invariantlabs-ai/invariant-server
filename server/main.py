from fastapi import FastAPI
from .routers import session, policy, monitor
from .database import engine
from .models import Base

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(session.router, prefix="/session", tags=["session"])
app.include_router(policy.router, prefix="/policy", tags=["policy"])
app.include_router(monitor.router, prefix="/monitor", tags=["monitor"])