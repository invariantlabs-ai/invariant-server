from sqlalchemy.orm import Session
from . import models, schemas

def create_session(db: Session):
    db_session = models.Session()
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_session(db: Session, session_id: str):
    return db.query(models.Session).filter(models.Session.id == session_id).first()

def get_next_policy_id(db: Session, session_id: str):
    max_policy_id = db.query(models.Policy).filter(models.Policy.session_id == session_id).order_by(models.Policy.policy_id.desc()).first()
    if max_policy_id:
        return max_policy_id.policy_id + 1
    return 1

def create_policy(db: Session, session_id: str, policy: schemas.PolicyCreate):
    next_policy_id = get_next_policy_id(db, session_id)
    db_policy = models.Policy(policy_id=next_policy_id, session_id=session_id, rule=policy.rule)
    db.add(db_policy)
    db.commit()
    db.refresh(db_policy)
    return db_policy

def get_policies(db: Session, session_id: str):
    return db.query(models.Policy).filter(models.Policy.session_id == session_id).all()

def get_policy(db: Session, session_id: str, policy_id: int):
    return db.query(models.Policy).filter(models.Policy.session_id == session_id, models.Policy.policy_id == policy_id).first()

def delete_policy(db: Session, session_id: str, policy_id: int):
    db_policy = db.query(models.Policy).filter(models.Policy.session_id == session_id, models.Policy.policy_id == policy_id).first()
    db.delete(db_policy)
    db.commit()

def update_policy(db: Session, session_id: str, policy_id: int, policy: schemas.PolicyCreate):
    db_policy = db.query(models.Policy).filter(models.Policy.session_id == session_id, models.Policy.policy_id == policy_id).first()
    db_policy.rule = policy.rule
    db.commit()
    db.refresh(db_policy)
    return db_policy

def get_next_monitor_id(db: Session, session_id: str):
    max_monitor_id = db.query(models.Monitor).filter(models.Monitor.session_id == session_id).order_by(models.Monitor.monitor_id.desc()).first()
    if max_monitor_id:
        return max_monitor_id.monitor_id + 1
    return 1

def create_monitor(db: Session, session_id: str, policy_id: int):
    next_monitor_id = get_next_monitor_id(db, session_id)
    db_monitor = models.Monitor(monitor_id=next_monitor_id, session_id=session_id, policy_id=policy_id)
    db.add(db_monitor)
    db.commit()
    db.refresh(db_monitor)
    return db_monitor

def get_monitors(db: Session, session_id: str):
    return db.query(models.Monitor).filter(models.Monitor.session_id == session_id).all()

def get_monitor(db: Session, session_id: str, monitor_id: int):
    return db.query(models.Monitor).filter(models.Monitor.session_id == session_id, models.Monitor.monitor_id == monitor_id).first()

def delete_monitor(db: Session, session_id: str, monitor_id: int):
    db_monitor = db.query(models.Monitor).filter(models.Monitor.session_id == session_id, models.Monitor.monitor_id == monitor_id).first()
    db.delete(db_monitor)
    db.commit()

def get_next_monitor_trace_id(db: Session, session_id: str, monitor_id: int):
    max_monitor_trace_id = db.query(models.MonitorTrace).filter(models.MonitorTrace.session_id == session_id, models.MonitorTrace.monitor_id == monitor_id).order_by(models.MonitorTrace.id.desc()).first()
    if max_monitor_trace_id:
        return max_monitor_trace_id.id + 1
    return 1

def add_monitor_trace(db: Session, session_id: str, monitor_id: int, trace: schemas.MonitorTraceCreate):
    next_monitor_trace_id = get_next_monitor_trace_id(db, session_id, monitor_id)
    db_trace = models.MonitorTrace(id=next_monitor_trace_id, monitor_id=monitor_id, session_id=session_id, trace=trace.trace)
    db.add(db_trace)
    db.commit()
    db.refresh(db_trace)
    return db_trace

def get_monitor_traces(db: Session, session_id: str, monitor_id: int):
    return db.query(models.MonitorTrace).filter(models.MonitorTrace.session_id == session_id, models.MonitorTrace.monitor_id == monitor_id).all()