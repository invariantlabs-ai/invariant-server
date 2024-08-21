import socket
import json
import multiprocessing as mp
import subprocess
from invariant import Policy, Monitor
from invariant.stdlib.invariant.detectors import (
    prompt_injection,
    pii,
    moderated,
    semgrep,
)
from invariant.stdlib.invariant.nodes import Message

from invariant.runtime.utils.code import CodeIssue
from typing import List, Dict
import os


def analyze(policy: str, trace: List[Dict]):
    policy = Policy.from_string(policy)
    analysis_result = policy.analyze(trace)
    return {
        "errors": [repr(error) for error in analysis_result.errors],
        "handled_errors": [
            repr(handled_error) for handled_error in analysis_result.handled_errors
        ],
    }


def monitor_check(past_events: List[Dict], pending_events: List[Dict], policy: str):
    monitor = Monitor.from_string(policy)
    check_result = monitor.check(past_events, pending_events)
    return [repr(error) for error in check_result]


def handle_request(data):
    message = json.loads(data)
    if message["type"] == "analyze":
        result = analyze(message["policy"], message["trace"])
    elif message["type"] == "monitor_check":
        result = monitor_check(
            message["past_events"], message["pending_events"], message["policy"]
        )
    return json.dumps(result).encode()


def worker(client_socket):
    try:
        data = b""
        while True:
            chunk = client_socket.recv(4096)
            if not chunk:
                break
            data += chunk
        response = handle_request(data)
        client_socket.sendall(response)
    except Exception as e:
        client_socket.sendall(json.dumps(str(e)).encode())
    finally:
        client_socket.close()


def detect_all(self, code: str, lang: str):
    temp_file = self.write_to_temp_file(code, lang)
    if lang == "python":
        config = "./r/python.lang.security"
    elif lang == "bash":
        config = "./r/bash"
    else:
        raise ValueError(f"Unsupported language: {lang}")

    cmd = [
        "rye",
        "run",
        "semgrep",
        "scan",
        "--json",
        "--config",
        config,
        "--disable-version-check",
        "--metrics",
        "off",
        "--quiet",
        temp_file,
    ]
    try:
        out = subprocess.run(cmd, capture_output=True)
        semgrep_res = json.loads(out.stdout.decode("utf-8"))
    except Exception:
        out = subprocess.run(cmd[2:], capture_output=True)
        semgrep_res = json.loads(out.stdout.decode("utf-8"))
    issues = []
    for res in semgrep_res["results"]:
        severity = self.get_severity(res["extra"]["severity"])
        source = res["extra"]["metadata"]["source"]
        message = res["extra"]["message"]
        lines = res["extra"]["lines"]
        description = f"{message} (source: {source}, lines: {lines})"
        issues.append(CodeIssue(description=description, severity=severity))
    return issues


if __name__ == "__main__":
    mp.set_start_method("fork")
    server_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    socket_path = "/tmp/sockets/invariant.sock"

    nsjail = not not os.getenv("NSJAIL", False)

    if nsjail:
        from invariant.runtime.utils.code import SemgrepDetector

        SemgrepDetector.detect_all = detect_all

    # Ensure the socket does not already exist
    server_socket.bind(socket_path)
    server_socket.listen(1024)

    # pii([Message(role="user", content="test")])
    # cache invariant functions
    # prompt_injection([Message(role="user", content="test")])
    # moderated([Message(role="user", content="test")])
    # semgrep([Message(role="user", content="print(1)")], lang="python")

    while True:
        client_sock, _ = server_socket.accept()
        process = mp.Process(target=worker, args=(client_sock,))
        process.start()
        client_sock.close()
