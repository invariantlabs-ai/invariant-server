from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import crud, schemas, database
from ..ipc.controller import IpcController, get_ipc_controller

router = APIRouter()

@router.get("/new", response_model=schemas.SessionBase)
def create_session(db: Session = Depends(database.get_db), ipc_controller: IpcController = Depends(get_ipc_controller)):
    session = crud.create_session(db)
    ipc_controller.start_process(session.id)
    return session

@router.delete("/")
def delete_session(session_id: str, db: Session = Depends(database.get_db), ipc_controller: IpcController = Depends(get_ipc_controller)):
    crud.delete_session(db, session_id)
    ipc_controller.stop_process(session_id)
    return {"ok": True}

@router.get("/", response_model=schemas.SessionBase)
def read_session(session_id: str, db: Session = Depends(database.get_db)):
    return crud.get_session(db, session_id)