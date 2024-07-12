import sys
import json
from invariant import Policy, Monitor
from typing import List, Dict, Optional

session_id = ""
monitors: Dict[id, Monitor] = {}


def analyze(policy: str, traces: List[Dict]):
    policy = Policy.from_string(policy)
    analysis_result = policy.analyze(traces)
    return {
        "errors": [repr(error) for error in analysis_result.errors],
        "handled_errors": [
            repr(handled_error) for handled_error in analysis_result.handled_errors
        ],
    }


def monitor_check(
    monitor_id: int,
    past_events: List[Dict],
    pending_events: List[Dict],
    policy: Optional[str] = None,
):
    global monitors
    if monitor_id not in monitors:
        if policy:
            monitors[monitor_id] = Monitor.from_string(policy)
        else:
            return "Monitor not found"
    monitor = monitors[monitor_id]
    check_result = monitor.check(past_events, pending_events)
    return [repr(error) for error in check_result]


def create_monitor(monitor_id: int, policy: str):
    global monitors
    if monitor_id in monitors:
        return "Monitor not found"

    monitors[monitor_id] = Monitor.from_string(policy)
    return monitor_id


def delete_monitor(monitor_id: int):
    global monitors
    if monitor_id in monitors:
        del monitors[monitor_id]  # hopefully python GC will take care of the rest
        return True
    return "Monitor not found."


def session():
    return session_id


# Map of function names to function objects
function_map = {
    "analyze": analyze,
    "session": session,
    "monitor_check": monitor_check,
    "create_monitor": create_monitor,
    "delete_monitor": delete_monitor,
}


def main():
    global session_id
    session_id = sys.argv[1]
    while True:
        try:
            line = sys.stdin.readline().strip()
            if not line:
                continue
            message = json.loads(line)
            func_name = message["func_name"]
            args = message["args"]
            kwargs = message["kwargs"]
            if func_name == "terminate":
                break
            if func_name in function_map:
                try:
                    result = function_map[func_name](*args, **kwargs)
                except Exception as e:
                    import traceback

                    tb = traceback.format_exc()
                    result = f"Invariant IPC Error: {e} traceback: {tb}"
            else:
                result = f"Function {func_name} not found."
            result = json.dumps(result)
            sys.stdout.write(result + "\n")
            sys.stdout.flush()
        except EOFError:
            break
        except Exception as e:
            sys.stdout.write(f"Error: {e}\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
