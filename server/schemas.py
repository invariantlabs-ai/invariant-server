from pydantic import BaseModel, ConfigDict
from typing import List, Dict

class SessionBase(BaseModel):
    id: str

class PolicyBase(BaseModel):
    rule: str
    session_id: str

class PolicyCreate(BaseModel):
    rule: str

class Policy(PolicyBase):
    model_config = ConfigDict(from_attributes=True)
    policy_id: int

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
    model_config = ConfigDict(from_attributes=True)
    id: int

class Monitor(MonitorBase):
    model_config = ConfigDict(from_attributes=True)
    monitor_id: int
    policy_id: int
    traces: List[MonitorTrace] = []