import sys
import json
from invariant import Policy
from typing import List, Dict

session_id = ''

def analyze(policy: str, traces: List[Dict]):
    policy = Policy.from_string(policy)
    analysis_result = policy.analyze(traces)
    return {"errors": [repr(error) for error in analysis_result.errors], "handled_errors": [repr(handled_error) for handled_error in analysis_result.handled_errors]}

def session():
    return session_id

# Map of function names to function objects
function_map = {
    'analyze': analyze,
    'session': session
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
                result = function_map[func_name](*args, **kwargs)
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