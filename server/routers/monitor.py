from cachetools import LRUCache
from asyncache import cached
from cachetools.keys import hashkey
from fastapi import APIRouter, Depends, HTTPException, Request
from server import schemas
from server.ipc.controller import IpcController, get_ipc_controller
from typing import List, Dict

router = APIRouter()


@cached(
    LRUCache(128),
    key=lambda body_hash, ipc, policy, past_events, pending_events: hashkey(body_hash),
)
async def cached_check(
    body_hash: str,
    ipc: IpcController,
    policy: str,
    past_events: List[Dict],
    pending_events: List[Dict],
):
    result = await ipc.request(
        {
            "type": "monitor_check",
            "past_events": past_events,
            "pending_events": pending_events,
            "policy": policy,
        }
    )
    return result


@router.post("/check")
async def monitor_check(
    request: Request,
    data: schemas.MonitorCheck,
    ipc: IpcController = Depends(get_ipc_controller),
):
    try:
        result = await cached_check(
            request.state.body_hash,
            ipc,
            data.policy,
            data.past_events,
            data.pending_events,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
