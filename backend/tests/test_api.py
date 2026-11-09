import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_transactions_endpoint():
    response = client.get("/api/transactions")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_analytics_summary_endpoint():
    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_income" in data
    assert "money_score" in data
    assert "safe_to_spend_today" in data

def test_review_queue_endpoint():
    response = client.get("/api/transactions/review-queue")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_recommendations_endpoint():
    response = client.get("/api/recommendations")
    assert response.status_code == 200
    data = response.json()
    assert "headline" in data
    assert "insights" in data

def test_chat_pipeline_endpoint():
    response = client.post("/api/chat", json={"message": "How much did I spend on food last month?"})
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "query_spec" in data
    assert "result" in data

def test_natural_language_parse_endpoint():
    response = client.post("/api/transactions/parse-nl", json={"text": "spent 450 on dinner with friends yesterday"})
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == 450.0
    assert "category" in data

