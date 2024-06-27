from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import crud, schemas, database

router = APIRouter()

@router.get("/new", response_model=schemas.SessionBase)
def create_session(db: Session = Depends(database.get_db)):
    return crud.create_session(db)

@router.get("/", response_model=schemas.SessionBase)
def read_session(session_id: str, db: Session = Depends(database.get_db)):
    return crud.get_session(db, session_id)