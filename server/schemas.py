from pydantic import BaseModel, UUID4
from typing import List, Dict

class SessionBase(BaseModel):
    id: str

class PolicyBase(BaseModel):
    rule: str
    session_id: str

class PolicyCreate(BaseModel):
    rule: str

class Policy(PolicyBase):
    policy_id: int

    class Config:
        from_attributes = True

class MonitorBase(BaseModel):
    policy_id: int
    session_id: str

class MonitorCreate(BaseModel):
    policy_id: int

class MonitorTraceBase(BaseModel):
    trace: List[Dict]

class MonitorTraceCreate(MonitorTraceBase):
    pass

class MonitorTrace(MonitorTraceBase):
    id: int

    class Config:
        from_attributes = True

class Monitor(MonitorBase):
    monitor_id: int
    policy_id: int
    traces: List[MonitorTrace] = []

    class Config:
        from_attributes = True