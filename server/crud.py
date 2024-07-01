from sqlalchemy.orm import Session
from . import models, schemas

def create_session(db: Session, session_id: str):
    """
    Create a new invariant session in the database.

    Args:
        db (Session): The database session.

    Returns:
        models.Session: The created session object.
    """
    db_session = models.Session()
    db_session.id = session_id
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def delete_session(db: Session, session_id: str):
    """
    Delete an existing session from the database.

    Args:
        db (Session): The database session.
        session_id (str): The ID of the session to delete.
    """
    db_session = db.query(models.Session).filter(models.Session.id == session_id).first()
    db.delete(db_session)
    db.commit()

def get_session(db: Session, session_id: str):
    """
    Retrieve details of a specific session.

    Args:
        db (Session): The database session.
        session_id (str): The ID of the session to retrieve.

    Returns:
        models.Session: The session object if found, otherwise None.
    """
    return db.query(models.Session).filter(models.Session.id == session_id).first()

def get_next_policy_id(db: Session, session_id: str):
    """
    Retrieve the next available policy ID for a given session.

    Args:
        db (Session): The database session.
        session_id (str): The ID of the session.

    Returns:
        int: The next available policy ID.
    """
    max_policy_id = db.query(models.Policy).filter(models.Policy.session_id == session_id).order_by(models.Policy.policy_id.desc()).first()
    if max_policy_id:
        return max_policy_id.policy_id + 1
    return 1

def create_policy(db: Session, session_id: str, policy: schemas.PolicyCreate):
    """
    Create a new policy for a given session.

    Args:
        db (Session): The database session.
        session_id (str): The ID of the session.
        policy (schemas.PolicyCreate): The policy data.

    Returns:
        models.Policy: The created policy object.
    """
    next_policy_id = get_next_policy_id(db, session_id)
    if not policy.name:
        policy.name = f"Policy #{next_policy_id}"
    db_policy = models.Policy(policy_id=next_policy_id, session_id=session_id, rule=policy.rule, name=policy.name)
    db.add(db_policy)
    db.commit()
    db.refresh(db_policy)
    return db_policy

def get_policies(db: Session, session_id: str):
    """
    Retrieve all policies for a given session.

    Args:
        db (Session): The database session.
        session_id (str): The ID of the session.

    Returns:
        List[models.Policy]: A list of policies.
    """
    return db.query(models.Policy).filter(models.Policy.session_id == session_id).all()

def get_policy(db: Session, session_id: str, policy_id: int):
    """
    Retrieve details of a specific policy.

    Args:
        db (Session): The database session.
        session_id (str): The ID of the session.
        policy_id (int): The ID of the policy to retrieve.

    Returns:
        models.Policy: The policy object if found, otherwise None.
    """
    return db.query(models.Policy).filter(models.Policy.session_id == session_id, models.Policy.policy_id == policy_id).first()

def delete_policy(db: Session, session_id: str, policy_id: int):
    """
    Delete a specific policy from the database.

    Args:
        db (Session): The database session.
        session_id (str): The ID of the session.
        policy_id (int): The ID of the policy to delete.
    """
    db_policy = db.query(models.Policy).filter(models.Policy.session_id == session_id, models.Policy.policy_id == policy_id).first()
    db.delete(db_policy)
    db.commit()

def update_policy(db: Session, session_id: str, policy_id: int, policy: schemas.PolicyCreate):
    """
    Update an existing policy.

    Args:
        db (Session): The database session.
        session_id (str): The ID of the session.
        policy_id (int): The ID of the policy to update.
        policy (schemas.PolicyCreate): The updated policy data.

    Returns:
        models.Policy: The updated policy object.
    """
    db_policy = db.query(models.Policy).filter(models.Policy.session_id == session_id, models.Policy.policy_id == policy_id).first()
    db_policy.rule = policy.rule
    db.commit()
    db.refresh(db_policy)
    return db_policy

def get_next_monitor_id(db: Session, session_id: str):
    """
    Retrieve the next available monitor ID for a given session.

    Args:
        db (Session): The database session.
        session_id (str): The ID of the session.

    Returns:
        int: The next available monitor ID.
    """
    max_monitor_id = db.query(models.Monitor).filter(models.Monitor.session_id == session_id).order_by(models.Monitor.monitor_id.desc()).first()
    if max_monitor_id:
        return max_monitor_id.monitor_id + 1
    return 1

def create_monitor(db: Session, session_id: str, monitor: schemas.MonitorCreate):
    """
    Create a new monitor for a given session.

    Args:
        db (Session): The database session.
        session_id (str): The ID of the session.
        monitor (schemas.MonitorCreate): The monitor data.

    Returns:
        models.Monitor: The created monitor object.
    """
    next_monitor_id = get_next_monitor_id(db, session_id)
    if not monitor.rule:
        policy = get_policy(db, session_id, monitor.policy_id)
        rule = policy.rule
    else:
        rule = monitor.rule
    if not monitor.name:
        monitor.name = f"Monitor #{next_monitor_id}"
    db_monitor = models.Monitor(monitor_id=next_monitor_id, session_id=session_id, rule = rule, name=monitor.name)
    db.add(db_monitor)
    db.commit()
    db.refresh(db_monitor)
    return db_monitor

def get_monitors(db: Session, session_id: str):
    """
    Retrieve all monitors for a given session.

    Args:
        db (Session): The database session.
        session_id (str): The ID of the session.

    Returns:
        List[models.Monitor]: A list of monitors.
    """
    return db.query(models.Monitor).filter(models.Monitor.session_id == session_id).all()

def get_monitor(db: Session, session_id: str, monitor_id: int):
    """
    Retrieve details of a specific monitor.

    Args:
        db (Session): The database session.
        session_id (str): The ID of the session.
        monitor_id (int): The ID of the monitor to retrieve.

    Returns:
        models.Monitor: The monitor object if found, otherwise None.
    """
    return db.query(models.Monitor).filter(models.Monitor.session_id == session_id, models.Monitor.monitor_id == monitor_id).first()

def delete_monitor(db: Session, session_id: str, monitor_id: int):
    """
    Delete a specific monitor from the database.

    Args:
        db (Session): The database session.
        session_id (str): The ID of the session.
        monitor_id (int): The ID of the monitor to delete.
    """
    db_monitor = db.query(models.Monitor).filter(models.Monitor.session_id == session_id, models.Monitor.monitor_id == monitor_id).first()
    db.delete(db_monitor)
    db.commit()