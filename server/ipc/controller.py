import subprocess
import sys
import json
import os

class IpcController:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(IpcController, cls).__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self):
        self.process_map = {}
        self.rpc_map = {}

    def _execute_function(self, session_id, func_name, *args, **kwargs):
        if session_id not in self.rpc_map:
            return f"Session {session_id} does not exist."

        rpc_info = self.rpc_map[session_id]
        message = json.dumps({
            "func_name": func_name,
            "args": args,
            "kwargs": kwargs
        })
        rpc_info["stdin"].write(message + "\n")
        rpc_info["stdin"].flush()
        result = rpc_info["stdout"].readline().strip()
        result = json.loads(result)
        return result

    def start_process(self, session_id):
        process = subprocess.Popen([sys.executable, os.path.abspath(__file__ + '/../invariant-ipc.py')],
                                   stdin=subprocess.PIPE,
                                   stdout=subprocess.PIPE,
                                   text=True)
        self.process_map[session_id] = process
        self.rpc_map[session_id] = {
            "stdin": process.stdin,
            "stdout": process.stdout
        }

    def call_function(self, session_id, func_name, *args, **kwargs):
        if session_id not in self.rpc_map:
            raise ValueError(f"No process with session_id {session_id}")
        return self._execute_function(session_id, func_name, *args, **kwargs)

    def stop_process(self, session_id):
        if session_id in self.rpc_map:
            self.call_function(session_id, "terminate")
            self.rpc_map[session_id]["stdin"].close()
            self.rpc_map[session_id]["stdout"].close()
            process = self.process_map.pop(session_id, None)
            if process:
                process.terminate()

# Usage example
if __name__ == "__main__":
    ipc = IpcController()
    ipc.start_process('session1')
    result = ipc.call_function('session1', 'some_function', 1, 2, kwarg1='value')
    print(result)
    ipc.stop_process('session1')