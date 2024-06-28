from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database
from ..ipc.controller import IpcController
import os

router = APIRouter()

@router.get("/", response_model=List[schemas.Policy])
def read_policies(session_id: str, db: Session = Depends(database.get_db)):
    return crud.get_policies(db, session_id)

@router.get("/templates")
def get_policy_templates():
    def build_json_structure(path):
        if os.path.isdir(path):
            return {item: build_json_structure(os.path.join(path, item)) for item in os.listdir(path)}
        else:
            with open(path, 'r', encoding='utf-8') as file:
                return file.read()
    return build_json_structure("server/templates")

@router.post("/new", response_model=schemas.Policy)
def create_policy(session_id:str, policy: schemas.PolicyCreate, db: Session = Depends(database.get_db)):
    return crud.create_policy(db, session_id, policy)

@router.post("/{policy_id}/analyze")
def analyze_policy(session_id: str, policy_id: int, analyze: schemas.PolicyAnalyze, db: Session = Depends(database.get_db)):
    policy = crud.get_policy(db, session_id, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    ipc = IpcController()
    return ipc.call_function(session_id, "analyze", policy.rule, analyze.trace)

@router.get("/{policy_id}", response_model=schemas.Policy)
def read_policy(session_id: str, policy_id: int, db: Session = Depends(database.get_db)):
    policy = crud.get_policy(db, session_id, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    return crud.get_policy(db, session_id, policy_id)

@router.put("/{policy_id}", response_model=schemas.Policy)
def update_policy(session_id: str, policy_id: int, policy_create: schemas.PolicyCreate, db: Session = Depends(database.get_db)):
    policy = crud.get_policy(db, session_id, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    return crud.update_policy(db, session_id, policy_id, policy_create)

@router.delete("/{policy_id}")
def delete_policy(session_id: str, policy_id: int, db: Session = Depends(database.get_db)):
    policy = crud.get_policy(db, session_id, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    crud.delete_policy(db, session_id, policy_id)
    return {"ok": True}