import subprocess
import sys
import json
import os
from server.config import settings
import asyncio
import psutil


class IpcController:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(IpcController, cls).__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self):
        self.socket_path = "/tmp/sockets/invariant.sock"
        os.makedirs("/tmp/sockets", exist_ok=True)
        self.start_process()

    async def request(self, message):
        p = self.process.poll()
        if p is not None:
            self.start_process()

        reader, writer = await asyncio.open_unix_connection(self.socket_path)
        writer.write(json.dumps(message).encode())
        await writer.drain()

        response = await reader.read(10 * 1024 * 1024)

        writer.close()
        await writer.wait_closed()

        return json.loads(response.decode())

    def start_process(self):
        # Kill any existing process using the Unix socket
        for proc in psutil.process_iter():
            if "invariant-ipc.py" in proc.name():
                proc.kill()

        # Remove existing socket file if it exists
        if os.path.exists(self.socket_path):
            os.remove(self.socket_path)

        if settings.production:
            # This is only meant to be used in the production Docker container
            self.process = subprocess.Popen(
                [
                    "nsjail",
                    "-C",
                    "/home/app/server/nsjail.cfg",
                    "--",
                    "/home/app/.venv/bin/python3",
                    "/home/app/server/ipc/invariant-ipc.py",
                ]
            )
        else:
            self.process = subprocess.Popen(
                [sys.executable, os.path.abspath(__file__ + "/../invariant-ipc.py")]
            )

    def close(self):
        self.process.terminate()
        if os.path.exists(self.socket_path):
            os.remove(self.socket_path)


class IpcControllerSingleton:
    def __init__(self):
        self.controller = None

    def __call__(self):
        if not self.controller:
            self.controller = IpcController()
        return self.controller


get_ipc_controller = IpcControllerSingleton()
