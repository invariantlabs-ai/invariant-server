import subprocess
import sys
import json
import os
from server.config import settings
import asyncio
import psutil
import time


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

    def exists(self):
        if not os.path.exists(self.socket_path):
            self.close()
            return False

        if settings.production:
            return True

        process = False
        for proc in psutil.process_iter():
            try:
                cmdline = proc.cmdline()
                for cmd in cmdline:
                    if "invariant-ipc.py" in cmd:
                        process = True
                        break
                if process:
                    break
            except (psutil.AccessDenied, psutil.ZombieProcess, psutil.NoSuchProcess):
                continue

        return process and os.path.exists(self.socket_path)

    async def request(self, message):
        if not self.exists():
            self.start_process()

        reader, writer = await asyncio.open_unix_connection(self.socket_path)
        writer.write(json.dumps(message).encode())
        writer.write_eof()
        await writer.drain()

        response = await reader.read(10 * 1024 * 1024)

        writer.close()
        try:
            await writer.wait_closed()
        except BrokenPipeError:
            pass

        return json.loads(response.decode())

    def start_process(self):
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

        while not os.path.exists(self.socket_path):
            time.sleep(0.1)

    def close(self):
        # Kill any existing process using the Unix socket
        for proc in psutil.process_iter():
            try:
                cmdline = proc.cmdline()
                for cmd in cmdline:
                    if "invariant-ipc.py" in cmd:
                        proc.kill()
                        break
            except (psutil.AccessDenied, psutil.ZombieProcess, psutil.NoSuchProcess):
                continue
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
