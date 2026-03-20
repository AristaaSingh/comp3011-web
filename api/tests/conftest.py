import os
import sys
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

TEST_DB_PATH = Path(tempfile.gettempdir()) / "comp3011_web_api_tests.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["JWT_SECRET_KEY"] = "test-secret-key"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import Base, engine  # noqa: E402
from app.dependencies import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app import usda  # noqa: E402

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def mock_usda(monkeypatch):
    async def fake_search_foods(query: str, page_size: int = 5):
        normalized = query.lower().strip()
        if "chicken" in normalized:
            return {
                "foods": [
                    {
                        "fdcId": 1001,
                        "description": "Chicken breast, cooked",
                        "dataType": "Foundation",
                        "foodCategory": "Poultry Products",
                    }
                ]
            }
        if "rice" in normalized:
            return {
                "foods": [
                    {
                        "fdcId": 1002,
                        "description": "Rice, cooked",
                        "dataType": "Foundation",
                        "foodCategory": "Cereal Grains and Pasta",
                    }
                ]
            }
        if "broccoli" in normalized:
            return {
                "foods": [
                    {
                        "fdcId": 1003,
                        "description": "Broccoli, steamed",
                        "dataType": "Foundation",
                        "foodCategory": "Vegetables and Vegetable Products",
                    }
                ]
            }
        return {"foods": []}

    async def fake_get_food_details(fdc_id: int):
        details_map = {
            1001: {
                "description": "Chicken breast, cooked",
                "mock_nutrients": {"calories": 165.0, "protein": 31.0, "fat": 3.6, "carbs": 0.0},
                "servingSize": 100.0,
                "servingSizeUnit": "g",
            },
            1002: {
                "description": "Rice, cooked",
                "mock_nutrients": {"calories": 130.0, "protein": 2.7, "fat": 0.3, "carbs": 28.0},
                "servingSize": 100.0,
                "servingSizeUnit": "g",
            },
            1003: {
                "description": "Broccoli, steamed",
                "mock_nutrients": {"calories": 35.0, "protein": 2.4, "fat": 0.4, "carbs": 7.2},
                "servingSize": 100.0,
                "servingSizeUnit": "g",
            },
        }
        return details_map[fdc_id]

    def fake_extract_key_nutrients(details):
        return details["mock_nutrients"]

    def fake_get_reference_grams(details):
        return details.get("servingSize", 100.0)

    monkeypatch.setattr(usda, "search_foods", fake_search_foods)
    monkeypatch.setattr(usda, "get_food_details", fake_get_food_details)
    monkeypatch.setattr(usda, "extract_key_nutrients", fake_extract_key_nutrients)
    monkeypatch.setattr(usda, "get_reference_grams", fake_get_reference_grams)


@pytest.fixture
def registered_user(client):
    payload = {"email": "user@example.com", "password": "securePass123"}
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def auth_headers(registered_user):
    return {"Authorization": f"Bearer {registered_user['access_token']}"}


@pytest.fixture
def second_user_headers(client):
    payload = {"email": "other@example.com", "password": "securePass123"}
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
