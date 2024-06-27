from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

router = APIRouter()

@router.get("/", response_model=List[schemas.Monitor])
def read_monitors(session_id: str, db: Session = Depends(database.get_db)):
    return crud.get_monitors(db, session_id)

@router.post("/new", response_model=schemas.Monitor)
def create_monitor(session_id: str, monitor: schemas.MonitorCreate, db: Session = Depends(database.get_db)):
    return crud.create_monitor(db, session_id, monitor.policy_id)

@router.get("/{monitor_id}", response_model=schemas.Monitor)
def read_monitor(session_id: str, monitor_id: int, db: Session = Depends(database.get_db)):
    return crud.get_monitor(db, session_id, monitor_id)

@router.post("/{monitor_id}", response_model=schemas.MonitorTrace)
def add_trace(session_id: str, monitor_id: int, trace: schemas.MonitorTraceCreate, db: Session = Depends(database.get_db)):
    return crud.add_monitor_trace(db, session_id, monitor_id, trace)

@router.get("/{monitor_id}/traces", response_model=List[schemas.MonitorTrace])
def read_monitor_traces(session_id: str, monitor_id: int, db: Session = Depends(database.get_db)):
    return crud.get_monitor_traces(db, session_id, monitor_id)

@router.delete("/{monitor_id}")
def delete_monitor(session_id: str, monitor_id: int, db: Session = Depends(database.get_db)):
    crud.delete_monitor(db, session_id, monitor_id)
    return {"ok": True}