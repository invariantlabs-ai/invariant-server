from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from server import crud, schemas, database
from server.ipc.controller import IpcController, get_ipc_controller
from server.utils import is_valid_uuid4, get_uuid4
from typing import Optional

router = APIRouter()


@router.get("/new", response_model=schemas.SessionBase)
def create_session(
    session_id: Optional[str] = Query(None, description="Optional session ID"),
    db: Session = Depends(database.get_db),
    ipc_controller: IpcController = Depends(get_ipc_controller),
):
    """
    Create a new session and start the associated process.

    This endpoint creates a new session in the database and starts a process
    for the session using the IPC controller.

    Args:
        db (Session): The database session dependency.
        ipc_controller (IpcController): The IPC controller dependency.

    Returns:
        schemas.SessionBase: The created session.
    """
    if session_id is None or not is_valid_uuid4(session_id):
        session_id = get_uuid4()

    session = crud.get_session(db, session_id)
    if session:
        return session

    session = crud.create_session(db, session_id)
    ipc_controller.start_process(session.id)
    return session


@router.delete("/")
def delete_session(
    session_id: str,
    db: Session = Depends(database.get_db),
    ipc_controller: IpcController = Depends(get_ipc_controller),
):
    """
    Delete an existing session and stop the associated process.

    This endpoint deletes a session from the database and stops the associated
    process using the IPC controller.

    Args:
        session_id (str): The ID of the session to delete.
        db (Session): The database session dependency.
        ipc_controller (IpcController): The IPC controller dependency.

    Returns:
        dict: A dictionary indicating the operation was successful.
    """
    crud.delete_session(db, session_id)
    ipc_controller.stop_process(session_id)
    return {"ok": True}


@router.get("/", response_model=schemas.SessionBase)
def read_session(session_id: str, db: Session = Depends(database.get_db)):
    """
    Retrieve details of an existing session.

    This endpoint fetches the details of a session from the database using
    the session ID.

    Args:
        session_id (str): The ID of the session to retrieve.
        db (Session): The database session dependency.

    Returns:
        schemas.SessionBase: The session details.
    """
    return crud.get_session(db, session_id)
