from pydantic import BaseModel, ConfigDict, model_validator, ValidationError
from typing import List, Dict, Optional

class SessionBase(BaseModel):
    id: str

class PolicyBase(BaseModel):
    rule: str
    name: str
    session_id: str

class PolicyCreate(BaseModel):
    rule: str
    name: Optional[str] = None

class PolicyAnalyze(BaseModel):
    trace: List[Dict]

class Policy(PolicyBase):
    model_config = ConfigDict(from_attributes=True)
    policy_id: int

class MonitorBase(BaseModel):
    policy_id: int
    session_id: str

class MonitorCreate(BaseModel):
    policy_id: Optional[int] = None
    name: Optional[str] = None
    rule: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def check_policy_id_or_rule(cls, values):
        policy_id, rule = values.get('policy_id'), values.get('rule')
        if (policy_id is None and rule is None):
            raise ValueError('You must provide either policy_id or rule.')
        if (policy_id is not None and rule is not None):
            raise ValueError('You must provide either policy_id or rule, but not both.')
        return values

class Monitor(MonitorBase):
    model_config = ConfigDict(from_attributes=True)
    monitor_id: int
    rule: str
    name: str