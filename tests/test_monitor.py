from fastapi.testclient import TestClient
from server.main import app


def test_monitor_check():
    with TestClient(app) as client:
        policy = """
from invariant import Message, PolicyViolation

raise PolicyViolation("Cannot send assistant message:", msg) if:
    (msg: Message)
    msg.role == "assistant"
    """
        events = [
            {"role": "user", "content": "Hello, world!"},
            {"role": "assistant", "content": "Hello, user 1"},
            {"role": "assistant", "content": "Hello, user 2"},
            {"role": "user", "content": "Hello, world!"},
        ]
        past_events = []

        responses = [
            [],
            [
                "PolicyViolation(Cannot send assistant message: metadata={'trace_idx': 1} role='assistant' content='Hello, user 1' tool_calls=None)"
            ],
            [
                "PolicyViolation(Cannot send assistant message: metadata={'trace_idx': 2} role='assistant' content='Hello, user 2' tool_calls=None)"
            ],
            [],
        ]

        for i, event in enumerate(events):
            response = client.post(
                "/api/monitor/check",
                json={
                    "policy": policy,
                    "past_events": past_events,
                    "pending_events": [event],
                },
            )
            assert response.status_code == 200
            assert response.json() == responses[i]
            past_events.append(event)
