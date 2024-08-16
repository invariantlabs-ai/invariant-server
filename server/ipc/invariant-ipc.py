import socket
import json
import os
import multiprocessing as mp
from invariant import Policy, Monitor
from invariant.stdlib.invariant.detectors import prompt_injection, pii, moderated, semgrep
from invariant.stdlib.invariant.nodes import Message
from typing import List, Dict

def analyze(policy: str, traces: List[Dict]):
    policy = Policy.from_string(policy)
    analysis_result = policy.analyze(traces)
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
    if message['type'] == 'analyze':
        result = analyze(message['policy'], message['traces'])
    elif message['type'] == 'monitor_check':
        result = monitor_check(message['past_events'], message['pending_events'], message['policy'])
    return json.dumps(result).encode()

def worker(client_socket):
    try:
        data = client_socket.recv(10*1024*1024)
        response = handle_request(data)
        client_socket.sendall(response)
    finally:
        client_socket.close()

if __name__ == "__main__":
    mp.set_start_method("fork")
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.bind(('0.0.0.0', 9999))
    server_socket.listen(1024)

    pii([Message(role="user", content="test")])
    # cache invariant functions
    #prompt_injection([Message(role="user", content="test")])
    #moderated([Message(role="user", content="test")])
    #semgrep([Message(role="user", content="print(1)")], lang="python")

    while True:
        client_sock, _ = server_socket.accept()
        process = mp.Process(target=worker, args=(client_sock,))
        process.start()
        client_sock.close()