from fastapi import APIRouter, Depends, HTTPException, Request
from server import schemas
from server.ipc.controller import get_ipc_controller, IpcController
from cachetools import cached, LRUCache
from cachetools.keys import hashkey
from typing import List, Dict

router = APIRouter()


@cached(LRUCache(128), key=lambda body_hash, ipc, policy, trace: hashkey(body_hash))
def cached_analyze(body_hash: str, ipc: IpcController, policy: str, trace: List[Dict]):
    result = ipc.request({"type": "analyze", "policy": policy, "trace": trace})
    return result


@router.post("/analyze")
async def analyze_policy(
    request: Request,
    data: schemas.PolicyAnalyze,
    ipc: IpcController = Depends(get_ipc_controller),
):
    try:
        result = cached_analyze(request.state.body_hash, ipc, data.policy, data.trace)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
