from fastapi import APIRouter, HTTPException
from server import schemas
from server.ipc.controller import IpcController

router = APIRouter()


@router.post("/check")
def monitor_check(data: schemas.MonitorCheck):
    ipc = IpcController()
    try:
        result = ipc.request(
            {
                "type": "monitor_check",
                "past_events": data.past_events,
                "pending_events": data.pending_events,
                "policy": data.policy,
            }
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
