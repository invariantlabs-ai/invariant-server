from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database
from ..ipc.controller import IpcController

router = APIRouter()


@router.get("/", response_model=List[schemas.Policy])
def read_policies(session_id: str, db: Session = Depends(database.get_db)):
    """
    Retrieve a list of policies for a given session.

    This endpoint fetches all policies associated with a specified session
    from the database.

    Args:
        session_id (str): The ID of the session.
        db (Session): The database session dependency.

    Returns:
        List[schemas.Policy]: A list of policies.
    """
    return crud.get_policies(db, session_id)


@router.get("/template")
def get_policy_template():
    """
    Retrieve policy template for a specific agent.

    Returns:
        str: An Invariant Policy Language template
    """

    # return general policy
    return """from invariant.detectors import semgrep, secrets, CodeIssue

raise "Disallow secrets in bash commands [risk=medium]" if:
    (call: ToolCall)
    call is tool:run
    any(secrets(call.function.arguments.command))

raise "Vulnerability in python code [risk=medium]" if:
    (call: ToolCall)
    call is tool:run_ipython
    semgrep_res := semgrep(call.function.arguments.code, lang="python")
    any(semgrep_res)

raise "Vulnerability in bash command [risk=medium]" if:
    (call: ToolCall)
    call is tool:run
    semgrep_res := semgrep(call.function.arguments.command, lang="bash")
    any(semgrep_res)
"""


@router.post("/new", response_model=schemas.Policy)
def create_policy(
    session_id: str,
    policy: schemas.PolicyCreate,
    db: Session = Depends(database.get_db),
):
    """
    Create a new policy for a given session.

    This endpoint creates a new policy in the database for a specified session.

    Args:
        session_id (str): The ID of the session.
        policy (schemas.PolicyCreate): The policy data.
        db (Session): The database session dependency.

    Returns:
        schemas.Policy: The created policy.
    """
    return crud.create_policy(db, session_id, policy)


@router.post("/{policy_id}/analyze")
def analyze_policy(
    session_id: str,
    policy_id: int,
    analyze: schemas.PolicyAnalyze,
    db: Session = Depends(database.get_db),
):
    """
    Analyze a policy with a given trace.

    This endpoint runs an analysis of a specified policy using provided trace
    data.

    Args:
        session_id (str): The ID of the session.
        policy_id (int): The ID of the policy to analyze.
        analyze (schemas.PolicyAnalyze): The analysis data.
        db (Session): The database session dependency.

    Returns:
        Any: The result of the analysis.
    """
    policy = crud.get_policy(db, session_id, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    ipc = IpcController()
    return ipc.call_function(session_id, "analyze", policy.rule, analyze.trace)


@router.get("/{policy_id}", response_model=schemas.Policy)
def read_policy(
    session_id: str, policy_id: int, db: Session = Depends(database.get_db)
):
    """
    Retrieve details of a specific policy.

    This endpoint fetches the details of a specified policy from the database.

    Args:
        session_id (str): The ID of the session.
        policy_id (int): The ID of the policy to retrieve.
        db (Session): The database session dependency.

    Returns:
        schemas.Policy: The policy details.
    """
    policy = crud.get_policy(db, session_id, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    return crud.get_policy(db, session_id, policy_id)


@router.put("/{policy_id}", response_model=schemas.Policy)
def update_policy(
    session_id: str,
    policy_id: int,
    policy_create: schemas.PolicyCreate,
    db: Session = Depends(database.get_db),
):
    """
    Update an existing policy.

    This endpoint updates the details of a specified policy in the database.

    Args:
        session_id (str): The ID of the session.
        policy_id (int): The ID of the policy to update.
        policy_create (schemas.PolicyCreate): The updated policy data.
        db (Session): The database session dependency.

    Returns:
        schemas.Policy: The updated policy.
    """
    policy = crud.get_policy(db, session_id, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    return crud.update_policy(db, session_id, policy_id, policy_create)


@router.delete("/{policy_id}")
def delete_policy(
    session_id: str, policy_id: int, db: Session = Depends(database.get_db)
):
    """
    Delete a specific policy.

    This endpoint deletes a specified policy from the database. Any monitors started from this policy will not be deleted.

    Args:
        session_id (str): The ID of the session.
        policy_id (int): The ID of the policy to delete.
        db (Session): The database session dependency.

    Returns:
        dict: A dictionary indicating the operation was successful.
    """
    policy = crud.get_policy(db, session_id, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    crud.delete_policy(db, session_id, policy_id)
    return {"ok": True}
