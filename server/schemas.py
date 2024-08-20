from pydantic import BaseModel
from typing import List, Dict


class PolicyAnalyze(BaseModel):
    trace: List[Dict]
    policy: str


class MonitorCheck(BaseModel):
    past_events: List[Dict]
    pending_events: List[Dict]
    policy: str
