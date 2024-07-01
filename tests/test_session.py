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

def test_session_new():
    response = client.get("/session/new")
    assert response.status_code == 200
    response_json = response.json()
    assert "id" in response_json
    id = uuid.UUID(response_json["id"])
    assert id.version == 4
    response = client.delete("/session?session_id=" + response_json["id"])
    assert response.status_code == 200

def test_session_with_sid():
    session_id = str(uuid.uuid4())
    response = client.get("/session/new?session_id=" + session_id)
    assert response.status_code == 200
    response_json = response.json()
    assert "id" in response_json and response_json["id"] == session_id