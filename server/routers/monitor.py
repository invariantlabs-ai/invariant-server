from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from .. import crud, schemas, database
from ..ipc.controller import get_ipc_controller, IpcController

router = APIRouter()

@router.get("/", response_model=List[schemas.Monitor])
def read_monitors(session_id: str, db: Session = Depends(database.get_db)):
    """
    Retrieve a list of monitors for a given session.

    This endpoint fetches all monitors associated with a specified session 
    from the database.

    Args:
        session_id (str): The ID of the session.
        db (Session): The database session dependency.

    Returns:
        List[schemas.Monitor]: A list of monitors.
    """
    return crud.get_monitors(db, session_id)

@router.post("/new", response_model=schemas.Monitor)
def create_monitor(session_id: str, monitor: schemas.MonitorCreate, db: Session = Depends(database.get_db), ipc_controller: IpcController = Depends(get_ipc_controller)):
    """
    Create a new monitor for a given session.

    This endpoint creates a new monitor in the database for a specified session 
    and starts the monitor using the IPC controller.

    Args:
        session_id (str): The ID of the session.
        monitor (schemas.MonitorCreate): The monitor data.
        db (Session): The database session dependency.
        ipc_controller (IpcController): The IPC controller dependency.

    Returns:
        schemas.Monitor: The created monitor.
    """
    monitor = crud.create_monitor(db, session_id, monitor)
    ipc_controller.call_function(session_id, "create_monitor", monitor.monitor_id, monitor.rule)
    return monitor

@router.get("/{monitor_id}", response_model=schemas.Monitor)
def read_monitor(session_id: str, monitor_id: int, db: Session = Depends(database.get_db)):
    """
    Retrieve details of a specific monitor.

    This endpoint fetches the details of a specified monitor from the database.

    Args:
        session_id (str): The ID of the session.
        monitor_id (int): The ID of the monitor to retrieve.
        db (Session): The database session dependency.

    Returns:
        schemas.Monitor: The monitor details.
    """
    monitor = crud.get_monitor(db, session_id, monitor_id)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return crud.get_monitor(db, session_id, monitor_id)

@router.post("/{monitor_id}/check")
def monitor_check(session_id: str, monitor_id: int, data: schemas.MonitorCheck, db: Session = Depends(database.get_db), ipc_controller: IpcController = Depends(get_ipc_controller)):
    """
    Check a monitor with provided trace data.

    This endpoint runs a check on a specified monitor using the provided trace 
    data.

    Args:
        session_id (str): The ID of the session.
        monitor_id (int): The ID of the monitor to check.
        data (schemas.MonitorCheck): The check data.
        db (Session): The database session dependency.
        ipc_controller (IpcController): The IPC controller dependency.

    Returns:
        Any: The result of the monitor check.
    """
    monitor = crud.get_monitor(db, session_id, monitor_id)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    result = ipc_controller.call_function(session_id, "monitor_check", monitor_id, data.trace)
    return result

@router.delete("/{monitor_id}")
def delete_monitor(session_id: str, monitor_id: int, db: Session = Depends(database.get_db), ipc_controller: IpcController = Depends(get_ipc_controller)):
    """
    Delete a specific monitor.

    This endpoint deletes a specified monitor from the database and stops the 
    monitor using the IPC controller.

    Args:
        session_id (str): The ID of the session.
        monitor_id (int): The ID of the monitor to delete.
        db (Session): The database session dependency.
        ipc_controller (IpcController): The IPC controller dependency.

    Returns:
        dict: A dictionary indicating the operation was successful.
    """
    monitor = crud.get_monitor(db, session_id, monitor_id)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    crud.delete_monitor(db, session_id, monitor_id)
    ipc_controller.call_function(session_id, "delete_monitor", monitor_id)
    return {"ok": True}