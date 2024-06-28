from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from .. import crud, schemas, database
from ..ipc.controller import IpcController

router = APIRouter()

@router.get("/", response_model=List[schemas.Monitor])
def read_monitors(session_id: str, db: Session = Depends(database.get_db)):
    return crud.get_monitors(db, session_id)

@router.post("/new", response_model=schemas.Monitor)
def create_monitor(session_id: str, monitor: schemas.MonitorCreate, db: Session = Depends(database.get_db)):
    monitor = crud.create_monitor(db, session_id, monitor)
    IpcController().call_function(session_id, "create_monitor", monitor.monitor_id, monitor.rule)
    return monitor

@router.get("/{monitor_id}", response_model=schemas.Monitor)
def read_monitor(session_id: str, monitor_id: int, db: Session = Depends(database.get_db)):
    monitor = crud.get_monitor(db, session_id, monitor_id)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return crud.get_monitor(db, session_id, monitor_id)

@router.post("/{monitor_id}/check")
def add_trace(session_id: str, monitor_id: int, trace: List[Dict], db: Session = Depends(database.get_db)):
    monitor = crud.get_monitor(db, session_id, monitor_id)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return crud.add_monitor_trace(db, session_id, monitor_id, trace)

@router.delete("/{monitor_id}")
def delete_monitor(session_id: str, monitor_id: int, db: Session = Depends(database.get_db)):
    monitor = crud.get_monitor(db, session_id, monitor_id)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    crud.delete_monitor(db, session_id, monitor_id)
    IpcController().call_function(session_id, "delete_monitor", monitor_id)
    return {"ok": True}