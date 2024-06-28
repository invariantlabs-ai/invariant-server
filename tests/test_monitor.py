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
    policy = client.post("/policy/new?session_id=" + session_id, json={"rule": "rule 1"}).json()
    response = client.post("/monitor/new?session_id=" + session_id, json={"policy_id": policy["policy_id"]})
    assert response.status_code == 200
    response_json = response.json()
    assert "monitor_id" in response_json and response_json["monitor_id"] == 1 and "rule" in response_json and response_json["rule"] == policy["rule"]
    # cleanup
    response = client.delete("/session?session_id=" + session_id)
    assert response.status_code == 200

def test_monitor_view():
    session_id = client.get("/session/new").json()["id"]
    policy = client.post("/policy/new?session_id=" + session_id, json={"rule": "rule 1"}).json()
    client.post("/monitor/new?session_id=" + session_id, json={"policy_id": policy["policy_id"]})
    client.post("/monitor/new?session_id=" + session_id, json={"policy_id": policy["policy_id"]})
    response = client.get("/monitor/1?session_id=" + session_id)
    assert response.status_code == 200
    response_json = response.json()
    assert "monitor_id" in response_json and response_json["monitor_id"] == 1 and "rule" in response_json and response_json["rule"] == policy["rule"]
    response = client.get("/monitor/2?session_id=" + session_id)
    assert response.status_code == 200
    response_json = response.json()
    assert "monitor_id" in response_json and response_json["monitor_id"] == 2 and "rule" in response_json and response_json["rule"] == policy["rule"]
    response = client.get("/monitor?session_id=" + session_id)
    assert response.status_code == 200
    response_json = response.json()
    assert len(response_json) == 2 and response_json[0]["monitor_id"] == 1 and response_json[0]["rule"] == policy["rule"] and response_json[1]["monitor_id"] == 2 and response_json[1]["rule"] == policy["rule"]
    # cleanup
    response = client.delete("/session?session_id=" + session_id)
    assert response.status_code == 200

def test_monitor_delete():
    session_id = client.get("/session/new").json()["id"]
    policy_id = client.post("/policy/new?session_id=" + session_id, json={"rule": "rule 1"}).json()["policy_id"]
    response = client.post("/monitor/new?session_id=" + session_id, json={"policy_id": policy_id})
    assert response.status_code == 200
    response = client.delete("/monitor/1?session_id=" + session_id)
    assert response.status_code == 200 and response.json() == {"ok": True}
    response = client.get("/monitor/1?session_id=" + session_id)
    assert response.status_code == 404
    # cleanup
    response = client.delete("/session?session_id=" + session_id)
    assert response.status_code == 200