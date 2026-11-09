import pytest
import pandas as pd
from backend.app.analytics import compute_spending_summary, detect_recurring_payments, compute_money_score

def test_empty_dataframe_summary():
    df = pd.DataFrame()
    summary = compute_spending_summary(df)
    assert summary["total_income"] == 0.0
    assert summary["total_expense"] == 0.0
    assert summary["savings_rate"] == 0.0

def test_spending_summary_calculations():
    data = [
        {"id": 1, "date": "2026-11-01", "description": "Salary", "amount": 65000.0, "type": "credit", "category": "Income", "merchant_clean": "Employer", "category_source": "rule", "confidence": 1.0, "is_reviewed": True, "is_anomaly": False, "anomaly_reason": None, "is_recurring": False},
        {"id": 2, "date": "2026-11-02", "description": "Rent", "amount": 18000.0, "type": "debit", "category": "Rent", "merchant_clean": "Landlord", "category_source": "rule", "confidence": 1.0, "is_reviewed": True, "is_anomaly": False, "anomaly_reason": None, "is_recurring": True},
        {"id": 3, "date": "2026-11-03", "description": "Groceries", "amount": 2000.0, "type": "debit", "category": "Groceries", "merchant_clean": "Zepto", "category_source": "rule", "confidence": 1.0, "is_reviewed": True, "is_anomaly": False, "anomaly_reason": None, "is_recurring": False},
    ]
    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"])
    df["year_month"] = df["date"].dt.to_period("M").astype(str)
    df["day"] = df["date"].dt.day

    summary = compute_spending_summary(df)
    assert summary["current_month_income"] == 65000.0
    assert summary["current_month_expense"] == 20000.0
    assert summary["current_month_savings"] == 45000.0
    assert summary["savings_rate"] > 60.0
    assert summary["daily_burn_rate"] > 0
    assert len(summary["category_breakdown"]) == 2

def test_money_score():
    score_info = compute_money_score(
        savings_rate=32.0,
        curr_expense=40000.0,
        curr_income=65000.0,
        projected_spend=45000.0,
        monthly_trends=[{"savings": 20000, "savings_rate": 30.0}, {"savings": 25000, "savings_rate": 32.0}]
    )
    assert 0 <= score_info["score"] <= 100
    assert score_info["score"] >= 70
    assert "delta" in score_info
    assert len(score_info["reason"]) > 10

def test_recurring_detection():
    data = [
        {"id": 1, "date": "2026-09-18", "description": "Netflix", "amount": 649.0, "type": "debit", "category": "Subscriptions", "merchant_clean": "Netflix", "year_month": "2026-09"},
        {"id": 2, "date": "2026-10-18", "description": "Netflix", "amount": 649.0, "type": "debit", "category": "Subscriptions", "merchant_clean": "Netflix", "year_month": "2026-10"},
        {"id": 3, "date": "2026-11-18", "description": "Netflix", "amount": 649.0, "type": "debit", "category": "Subscriptions", "merchant_clean": "Netflix", "year_month": "2026-11"},
    ]
    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"])
    recurring = detect_recurring_payments(df)
    assert len(recurring) == 1
    assert recurring[0]["merchant"] == "Netflix"
    assert recurring[0]["avg_amount"] == 649.0
    assert recurring[0]["months_active"] == 3

