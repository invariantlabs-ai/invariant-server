from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from server.main import app
from server.database import get_db
from server.models import Base

# --- Begin boilerplate code ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)
# --- End boilerplate code ---


def test_monitor_new():
    session_id = client.get("/session/new").json()["id"]
    rule = """
raise "must not send emails to anyone but 'Peter' after seeing the inbox" if:
    (call: ToolCall) -> (call2: ToolCall)
    call is tool:get_inbox
    call2 is tool:send_email({
      to: "^(?!Peter$).*$"
    })
"""
    policy = client.post(
        "/policy/new?session_id=" + session_id, json={"rule": rule}
    ).json()
    response = client.post(
        "/monitor/new?session_id=" + session_id, json={"policy_id": policy["policy_id"]}
    )
    assert response.status_code == 200
    response_json = response.json()
    assert (
        "monitor_id" in response_json
        and response_json["monitor_id"] == 1
        and "rule" in response_json
        and response_json["rule"] == policy["rule"]
    )
    # cleanup
    response = client.delete("/session?session_id=" + session_id)
    assert response.status_code == 200


def test_monitor_view():
    session_id = client.get("/session/new").json()["id"]
    rule = """
raise "must not send emails to anyone but 'Peter' after seeing the inbox" if:
    (call: ToolCall) -> (call2: ToolCall)
    call is tool:get_inbox
    call2 is tool:send_email({
      to: "^(?!Peter$).*$"
    })
"""
    policy = client.post(
        "/policy/new?session_id=" + session_id, json={"rule": rule}
    ).json()
    client.post(
        "/monitor/new?session_id=" + session_id, json={"policy_id": policy["policy_id"]}
    )
    client.post(
        "/monitor/new?session_id=" + session_id, json={"policy_id": policy["policy_id"]}
    )
    response = client.get("/monitor/1?session_id=" + session_id)
    assert response.status_code == 200
    response_json = response.json()
    assert (
        "monitor_id" in response_json
        and response_json["monitor_id"] == 1
        and "rule" in response_json
        and response_json["rule"] == policy["rule"]
    )
    response = client.get("/monitor/2?session_id=" + session_id)
    assert response.status_code == 200
    response_json = response.json()
    assert (
        "monitor_id" in response_json
        and response_json["monitor_id"] == 2
        and "rule" in response_json
        and response_json["rule"] == policy["rule"]
    )
    response = client.get("/monitor?session_id=" + session_id)
    assert response.status_code == 200
    response_json = response.json()
    assert (
        len(response_json) == 2
        and response_json[0]["monitor_id"] == 1
        and response_json[0]["rule"] == policy["rule"]
        and response_json[1]["monitor_id"] == 2
        and response_json[1]["rule"] == policy["rule"]
    )
    # cleanup
    response = client.delete("/session?session_id=" + session_id)
    assert response.status_code == 200


def test_monitor_delete():
    session_id = client.get("/session/new").json()["id"]
    rule = """
raise "must not send emails to anyone but 'Peter' after seeing the inbox" if:
    (call: ToolCall) -> (call2: ToolCall)
    call is tool:get_inbox
    call2 is tool:send_email({
      to: "^(?!Peter$).*$"
    })
"""
    policy_id = client.post(
        "/policy/new?session_id=" + session_id, json={"rule": rule}
    ).json()["policy_id"]
    response = client.post(
        "/monitor/new?session_id=" + session_id, json={"policy_id": policy_id}
    )
    assert response.status_code == 200
    response = client.delete("/monitor/1?session_id=" + session_id)
    assert response.status_code == 200 and response.json() == {"ok": True}
    response = client.get("/monitor/1?session_id=" + session_id)
    assert response.status_code == 404
    # cleanup
    response = client.delete("/session?session_id=" + session_id)
    assert response.status_code == 200


def test_monitor_check():
    session_id = client.get("/session/new").json()["id"]
    rule = """
from invariant import Message, PolicyViolation

raise PolicyViolation("Cannot send assistant message:", msg) if:
    (msg: Message)
    msg.role == "assistant"
"""
    response = client.post("/monitor/new?session_id=" + session_id, json={"rule": rule})
    assert response.status_code == 200
    monitor_id = response.json()["monitor_id"]
    assert monitor_id == 1

    past_events = []

    input = [{"role": "user", "content": "Hello, world!"}]

    response = client.post(
        "/monitor/" + str(monitor_id) + "/check?session_id=" + session_id,
        json={"past_events": past_events, "pending_events": input},
    ).json()
    assert response == []
    past_events.extend(input)

    input = [{"role": "assistant", "content": "Hello, user 1"}]
    response = client.post(
        "/monitor/" + str(monitor_id) + "/check?session_id=" + session_id,
        json={"past_events": past_events, "pending_events": input},
    ).json()
    assert response == [
        "PolicyViolation(Cannot send assistant message: metadata={'trace_idx': 1} role='assistant' content='Hello, user 1' tool_calls=None)"
    ]
    past_events.extend(input)

    input = [{"role": "assistant", "content": "Hello, user 2"}]
    response = client.post(
        "/monitor/" + str(monitor_id) + "/check?session_id=" + session_id,
        json={"past_events": past_events, "pending_events": input},
    ).json()
    assert response == [
        "PolicyViolation(Cannot send assistant message: metadata={'trace_idx': 2} role='assistant' content='Hello, user 2' tool_calls=None)"
    ]
    past_events.extend(input)

    input = [{"role": "user", "content": "Hello, world!"}]
    response = client.post(
        "/monitor/" + str(monitor_id) + "/check?session_id=" + session_id,
        json={"past_events": past_events, "pending_events": input},
    ).json()
    assert response == []
    past_events.extend(input)

    # cleanup
    response = client.delete("/session?session_id=" + session_id)
    assert response.status_code == 200
