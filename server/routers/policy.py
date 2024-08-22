from fastapi import APIRouter, Depends, HTTPException, Request
from server import schemas
from server.ipc.controller import get_ipc_controller, IpcController
from server.logging import log_request
from datetime import datetime, timezone
import json
from cachetools import LRUCache
from asyncache import cached
from cachetools.keys import hashkey
from typing import List, Dict

router = APIRouter()


@cached(LRUCache(128), key=lambda body_hash, ipc, policy, trace: hashkey(body_hash))
async def cached_analyze(
    body_hash: str, ipc: IpcController, policy: str, trace: List[Dict]
):
    result = await ipc.request({"type": "analyze", "policy": policy, "trace": trace})
    return result


@router.post("/analyze")
async def analyze_policy(
    request: Request,
    data: schemas.PolicyAnalyze,
    ipc: IpcController = Depends(get_ipc_controller),
):
    timestart = datetime.now(timezone.utc).timestamp()
    status_code = 200
    result = {}
    try:
        result = await cached_analyze(
            request.state.body_hash, ipc, data.policy, data.trace
        )
        return result
    except Exception as e:
        status_code = 500
        result = {"detail": str(e)}
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        timeend = datetime.now(timezone.utc).timestamp()
        response = json.dumps(result)
        await log_request(
            "POST",
            "/api/policy/analyze",
            request.headers.get("x-forwarded-for") or request.client.host,
            request.headers.get("user-agent", "unknown"),
            timestart,
            timeend,
            request.state.body_hash,
            request.state.body_content,
            status_code,
            response,
        )