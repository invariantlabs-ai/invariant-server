from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

router = APIRouter()

@router.get("/", response_model=List[schemas.Policy])
def read_policies(session_id: str, db: Session = Depends(database.get_db)):
    return crud.get_policies(db, session_id)

@router.post("/new", response_model=schemas.Policy)
def create_policy(policy: schemas.PolicyCreate, db: Session = Depends(database.get_db)):
    return crud.create_policy(db, policy)

@router.get("/{policy_id}", response_model=schemas.Policy)
def read_policy(session_id: str, policy_id: int, db: Session = Depends(database.get_db)):
    return crud.get_policy(db, session_id, policy_id)

@router.put("/{policy_id}", response_model=schemas.Policy)
def update_policy(session_id: str, policy_id: int, policy: schemas.PolicyCreate, db: Session = Depends(database.get_db)):
    return crud.update_policy(db, session_id, policy_id, policy)

@router.delete("/{policy_id}")
def delete_policy(session_id: str, policy_id: int, db: Session = Depends(database.get_db)):
    crud.delete_policy(db, session_id, policy_id)
    return {"ok": True}