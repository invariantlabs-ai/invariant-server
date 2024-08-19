from fastapi import APIRouter, HTTPException
from server import schemas
from server.ipc.controller import IpcController
from fastapi_cache.decorator import cache

router = APIRouter()


@router.post("/analyze")
@cache(expire=3600)
def analyze_policy(
    data: schemas.PolicyAnalyze,
):
    ipc = IpcController()
    try:
        result = ipc.request(
            {"type": "analyze", "policy": data.policy, "traces": data.trace}
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
