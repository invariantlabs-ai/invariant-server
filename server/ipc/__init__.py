from invariant import Policy
from typing import List, Dict

def analyze(policy: str, traces: List[Dict]):
    policy = Policy.from_string(policy)
    analysis_result = policy.analyze(traces)
    return {"errors": [repr(error) for error in analysis_result.errors], "handled_errors": [repr(handled_error) for handled_error in analysis_result.handled_errors]}