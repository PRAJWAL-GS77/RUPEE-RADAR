import pytest
from sqlmodel import Session, SQLModel, create_engine
from backend.app.models import Transaction
from backend.app.query_engine import execute_query_spec

@pytest.fixture
def test_db_session():
    test_engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        # Seed test data
        txns = [
            Transaction(date="2026-11-01", description="SWIGGY ORDER", amount=500.0, type="debit", category="Food Delivery", merchant_clean="Swiggy"),
            Transaction(date="2026-11-02", description="SWIGGY ORDER 2", amount=700.0, type="debit", category="Food Delivery", merchant_clean="Swiggy"),
            Transaction(date="2026-11-03", description="UBER TRIP", amount=300.0, type="debit", category="Transport", merchant_clean="Uber"),
            Transaction(date="2026-11-01", description="SALARY CREDIT", amount=65000.0, type="credit", category="Income", merchant_clean="Employer"),
        ]
        for t in txns:
            session.add(t)
        session.commit()
        yield session

def test_query_engine_sum(test_db_session):
    spec = {"category": "Food Delivery", "aggregation": "sum", "time_frame": "all_time", "type": "debit"}
    res = execute_query_spec(spec, test_db_session)
    assert res["value"] == 1200.0
    assert res["count"] == 2

def test_query_engine_count(test_db_session):
    spec = {"category": "Food Delivery", "aggregation": "count", "time_frame": "all_time", "type": "debit"}
    res = execute_query_spec(spec, test_db_session)
    assert res["value"] == 2
    assert res["count"] == 2

def test_query_engine_max(test_db_session):
    spec = {"category": "Food Delivery", "aggregation": "max", "time_frame": "all_time", "type": "debit"}
    res = execute_query_spec(spec, test_db_session)
    assert res["value"] == 700.0

def test_query_engine_merchant_filter(test_db_session):
    spec = {"merchant": "Uber", "aggregation": "sum", "time_frame": "all_time", "type": "debit"}
    res = execute_query_spec(spec, test_db_session)
    assert res["value"] == 300.0
    assert res["count"] == 1

