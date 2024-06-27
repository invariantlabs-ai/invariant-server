import uuid
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

def test_policy_new():
    session_id = client.get("/session/new").json()["id"]
    response = client.post("/policy/new?session_id=" + session_id, json={"rule": "hello world"})
    assert response.status_code == 200
    response_json = response.json()
    assert "rule" in response_json
    assert response_json["rule"] == "hello world"
    assert "policy_id" in response_json
    assert response_json["policy_id"] == 1

def test_policy_view():
    session_id = client.get("/session/new").json()["id"]
    client.post("/policy/new?session_id=" + session_id, json={"rule": "rule 1"})
    client.post("/policy/new?session_id=" + session_id, json={"rule": "rule 2"})
    response = client.get("/policy/1?session_id=" + session_id)
    assert response.status_code == 200
    assert response.json()["rule"] == "rule 1" and response.json()["policy_id"] == 1
    response = client.get("/policy/2?session_id=" + session_id)
    assert response.status_code == 200
    assert response.json()["rule"] == "rule 2" and response.json()["policy_id"] == 2
    response = client.get("/policy?session_id=" + session_id)
    assert response.status_code == 200
    assert len(response.json()) == 2