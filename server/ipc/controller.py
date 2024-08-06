import subprocess
import sys
import json
import os
from server.config import settings
import time


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
        message = json.dumps({"func_name": func_name, "args": args, "kwargs": kwargs})
        try:
            rpc_info["timestamp"] = time.time()
            rpc_info["stdin"].write(message + "\n")
            rpc_info["stdin"].flush()
            result = rpc_info["stdout"].readline().strip()
            rpc_info["timestamp"] = time.time()
        except BrokenPipeError as e:
            result = f"Invariant Controller IPC Error: {e}"
            self.start_process(session_id)
            return result
        try:
            result = json.loads(result)
        except json.JSONDecodeError as e:
            result = f"Invariant Controller IPC Error: {e} with result {result}"
        return result

    def start_process(self, session_id):
        if settings.production:
            # This is only meant to be used in the production Docker container
            process = subprocess.Popen(
                [
                    "nsjail",
                    "-C",
                    "/home/app/server/nsjail.cfg",
                    "--",
                    "/home/app/.venv/bin/python3",
                    "/home/app/server/ipc/invariant-ipc.py",
                    session_id,
                ],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                text=True,
            )
        else:
            process = subprocess.Popen(
                [
                    sys.executable,
                    os.path.abspath(__file__ + "/../invariant-ipc.py"),
                    session_id,
                ],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                text=True,
            )
        self.process_map[session_id] = process
        self.rpc_map[session_id] = {
            "stdin": process.stdin,
            "stdout": process.stdout,
            "timestamp": time.time(),
        }

    def call_function(self, session_id, func_name, *args, **kwargs):
        if session_id not in self.rpc_map:
            self.start_process(session_id)
        return self._execute_function(session_id, func_name, *args, **kwargs)

    def stop_process(self, session_id):
        if session_id in self.rpc_map:
            self.call_function(session_id, "terminate")
            self.rpc_map[session_id]["stdin"].close()
            self.rpc_map[session_id]["stdout"].close()
            process = self.process_map.pop(session_id, None)
            del self.rpc_map[session_id]
            if process:
                process.terminate()

    def cleanup(self):
        for session_id in list(self.rpc_map.keys()):
            if (
                session_id in self.rpc_map
                and time.time() - self.rpc_map[session_id]["timestamp"]
                > settings.idle_timeout
            ):
                self.stop_process(session_id)


class IpcControllerSingleton:
    def __init__(self):
        self.controller = None

    def __call__(self):
        if not self.controller:
            self.controller = IpcController()
        return self.controller


get_ipc_controller = IpcControllerSingleton()
