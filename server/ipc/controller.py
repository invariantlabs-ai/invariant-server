import subprocess
import sys
import json
import os
from server.config import settings
import socket


class IpcController:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(IpcController, cls).__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self):
        self.socket_path = "/tmp/invariant_worker.sock"
        self.start_process()

    def request(self, message):
        p = self.process.poll()
        if p is not None:
            self.start_process()

        client_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        client_socket.connect(self.socket_path)
        
        client_socket.send(json.dumps(message).encode())
        
        response = client_socket.recv(10*1024*1024)
        client_socket.close()
        
        return json.loads(response.decode())

    def start_process(self):
        if settings.production:
            # This is only meant to be used in the production Docker container
            self.process = subprocess.Popen(
                [
                    "nsjail",
                    "-C",
                    "/home/app/server/nsjail.cfg",
                    "--",
                    "/home/app/.venv/bin/python3",
                    "/home/app/server/ipc/invariant-ipc.py"
                ]
            )
        else:
            self.process = subprocess.Popen(
                [
                    sys.executable,
                    os.path.abspath(__file__ + "/../invariant-ipc.py")
                ]
            )

    def close(self):
        self.process.terminate()


class IpcControllerSingleton:
    def __init__(self):
        self.controller = None

    def __call__(self):
        if not self.controller:
            self.controller = IpcController()
        return self.controller


get_ipc_controller = IpcControllerSingleton()
