from cachetools import LRUCache
from asyncache import cached
from cachetools.keys import hashkey
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from server.logging import log_request
from datetime import datetime, timezone
import json
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
    cache_control: str | None = Header(None),
):
    timestart = datetime.now(timezone.utc).timestamp()
    status_code = 200
    result = {}
    try:
        if cache_control == "no-cache":
            result = await ipc.request(
                {
                    "type": "monitor_check",
                    "past_events": data.past_events,
                    "pending_events": data.pending_events,
                    "policy": data.policy,
                }
            )
        else:
            result = await cached_check(
                request.state.body_hash,
                ipc,
                data.policy,
                data.past_events,
                data.pending_events,
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
            "/api/monitor/check",
            request.headers.get("x-forwarded-for") or request.client.host,
            request.headers.get("user-agent", "unknown"),
            timestart,
            timeend,
            request.state.body_hash,
            request.state.body_content,
            status_code,
            response,
        )
