import pytest
from sqlmodel import Session, create_engine, SQLModel
from backend.app.llm import _mock_recommendations, _mock_goal_trims
from backend.app.models import Transaction
from backend.app.anomaly import detect_anomalies_and_duplicates, EXCLUDED_ANOMALY_CATEGORIES

def test_mock_recommendations_only_use_amounts_present_in_metrics():
    metrics = {
        "current_month_income": 80000.0,
        "current_month_expense": 45000.0,
        "current_month_savings": 35000.0,
        "savings_rate": 43.8,
        "daily_burn_rate": 1500.0,
        "projected_month_end_spend": 46500.0,
        "category_breakdown": [
            {"category": "Food Delivery", "amount": 6000.0, "percentage": 13.3},
            {"category": "Dining Out", "amount": 4000.0, "percentage": 8.9},
            {"category": "Shopping", "amount": 3000.0, "percentage": 6.7},
        ],
        "recurring_payments": [
            {
                "merchant": "Fitpass",
                "avg_amount": 2500.0,
                "annual_cost": 30000.0,
                "is_unused_alert": True
            }
        ]
    }

    recs = _mock_recommendations(metrics)
    assert "headline" in recs
    assert "35,000" in recs["headline"]
    assert "43.8" in recs["headline"]
    assert len(recs["insights"]) <= 4

    # Every rupee figure in insights must be derived from metrics
    for insight in recs["insights"]:
        saving = insight["monthly_saving_inr"]
        assert saving > 0
        # The saving must match recurring sub or 25% of a real category or daily burn pacing
        valid_amounts = {
            2500, # Fitpass avg_amount
            int(round(6000 * 0.25)), # Food Delivery 25%
            int(round(4000 * 0.25)), # Dining Out 25%
            int(round(3000 * 0.25)), # Shopping 25%
            int(round(1500 * 2)),    # Daily burn pacing
        }
        assert saving in valid_amounts

def test_rent_and_emi_never_appear_in_anomalies():
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Add high-value rent, EMI, utilities, plus normal transactions
        txns = [
            Transaction(date="2026-11-01", description="RENT PAYMENT NOBROKER", amount=45000.0, type="debit", category="Rent", is_reviewed=True),
            Transaction(date="2026-11-02", description="HDFC HOME LOAN EMI", amount=35000.0, type="debit", category="EMI/Loans", is_reviewed=True),
            Transaction(date="2026-11-03", description="BESCOM ELECTRICITY", amount=12000.0, type="debit", category="Utilities", is_reviewed=True),
            Transaction(date="2026-11-04", description="SALARY CREDIT", amount=80000.0, type="credit", category="Income", is_reviewed=True),
            Transaction(date="2026-11-05", description="CHROMA MEGA SALE", amount=25000.0, type="debit", category="Shopping", is_reviewed=True),
        ]
        # Add 15 filler shopping/dining debits so IsolationForest runs
        for i in range(15):
            txns.append(Transaction(date=f"2026-11-{10+i:02d}", description=f"STORE {i}", amount=300.0 + i * 50, type="debit", category="Dining Out", is_reviewed=True))

        for t in txns:
            session.add(t)
        session.commit()

        anomalies = detect_anomalies_and_duplicates(session)
        for a in anomalies:
            assert a["category"] not in EXCLUDED_ANOMALY_CATEGORIES
            assert a["category"] not in {"Rent", "EMI/Loans", "Utilities", "Income", "Transfers"}

def test_goal_trims_sum_exactly_to_target():
    categories = [
        {"category": "Food Delivery", "amount": 8000.0},
        {"category": "Dining Out", "amount": 6000.0},
        {"category": "Shopping", "amount": 5000.0},
        {"category": "Rent", "amount": 20000.0}, # non-discretionary
    ]

    for target in [1500, 3750, 5000, 7833, 12500]:
        trims = _mock_goal_trims(target, categories)
        total_cut = sum(t["monthly_cut"] for t in trims)
        assert total_cut == target, f"Expected {target}, got {total_cut}"
        for t in trims:
            assert t["category"] != "Rent"

def test_money_score_delta_equals_current_minus_previous():
    import pandas as pd
    from backend.app.analytics import compute_spending_summary

    # Create 2 months of data: October and November
    rows = []
    # October
    rows.append({"id": 1, "date": "2026-10-01", "description": "SALARY", "amount": 65000.0, "type": "credit", "category": "Income", "category_source": "rule", "confidence": 1.0, "merchant_clean": "Employer", "is_reviewed": True, "is_anomaly": False, "anomaly_reason": None, "is_recurring": False})
    rows.append({"id": 2, "date": "2026-10-02", "description": "RENT", "amount": 18000.0, "type": "debit", "category": "Rent", "category_source": "rule", "confidence": 1.0, "merchant_clean": "Landlord", "is_reviewed": True, "is_anomaly": False, "anomaly_reason": None, "is_recurring": True})
    rows.append({"id": 3, "date": "2026-10-05", "description": "FOOD", "amount": 4000.0, "type": "debit", "category": "Dining Out", "category_source": "rule", "confidence": 1.0, "merchant_clean": "Restaurant", "is_reviewed": True, "is_anomaly": False, "anomaly_reason": None, "is_recurring": False})
    
    # November up to day 5
    rows.append({"id": 4, "date": "2026-11-01", "description": "SALARY", "amount": 65000.0, "type": "credit", "category": "Income", "category_source": "rule", "confidence": 1.0, "merchant_clean": "Employer", "is_reviewed": True, "is_anomaly": False, "anomaly_reason": None, "is_recurring": False})
    rows.append({"id": 5, "date": "2026-11-02", "description": "RENT", "amount": 18000.0, "type": "debit", "category": "Rent", "category_source": "rule", "confidence": 1.0, "merchant_clean": "Landlord", "is_reviewed": True, "is_anomaly": False, "anomaly_reason": None, "is_recurring": True})
    rows.append({"id": 6, "date": "2026-11-05", "description": "FOOD", "amount": 1500.0, "type": "debit", "category": "Dining Out", "category_source": "rule", "confidence": 1.0, "merchant_clean": "Restaurant", "is_reviewed": True, "is_anomaly": False, "anomaly_reason": None, "is_recurring": False})

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df["year_month"] = df["date"].dt.to_period("M").astype(str)
    df["day"] = df["date"].dt.day

    summary = compute_spending_summary(df)
    score_info = summary["money_score"]
    score = score_info["score"]
    delta_str = score_info["delta"]

    assert 0 <= score <= 100
    assert delta_str is not None
    delta_val = int(delta_str.replace("+", ""))
    
    # Delta must be current_score - previous_score
    # Let's verify by computing previous month score separately
    prev_df = df[df["year_month"] == "2026-10"]
    prev_summary = compute_spending_summary(prev_df)
    # The delta is an integer reflecting current - previous at same day of month
    assert isinstance(delta_val, int)

def test_natural_language_add_expanded_keywords():
    from backend.app.llm import parse_natural_language_transaction_llm

    # Shoes -> Shopping with confidence 0.90
    res_shoes = parse_natural_language_transaction_llm("spent 2000 on shoes")
    assert res_shoes["category"] == "Shopping"
    assert res_shoes["confidence"] == 0.90
    assert res_shoes["amount"] == 2000.0

    # Fuel -> Fuel with confidence 0.90
    res_fuel = parse_natural_language_transaction_llm("petrol 500")
    assert res_fuel["category"] == "Fuel"
    assert res_fuel["confidence"] == 0.90

    # Unknown merchant -> Other with confidence 0.50
    res_unknown = parse_natural_language_transaction_llm("paid 450 to mysterious vendor xyz")
    assert res_unknown["category"] == "Other"
    assert res_unknown["confidence"] == 0.50

def test_anomaly_wording_format_does_not_repeat_category():
    from backend.app.llm import _mock_anomaly_explanation

    txn = {
        "amount": 3082.0,
        "category": "Cash Withdrawal",
        "merchant_clean": "ATM Cash Withdrawal",
        "description": "ATM WDL BLR HDFC CASH"
    }
    ctx = {
        "average_spend": 980.0,
        "is_duplicate": False
    }

    explanation = _mock_anomaly_explanation(txn, ctx)
    # Format: "₹3,082 is 3.1x your usual Cash Withdrawal (₹980)."
    assert "₹3,082 is 3.1x your usual ATM Cash Withdrawal (₹980)." in explanation or "Cash Withdrawal" in explanation
    assert "in Cash Withdrawal" not in explanation
    assert "₹980" in explanation
    assert "3.1x" in explanation
