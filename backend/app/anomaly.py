from datetime import datetime, timedelta
from typing import List, Dict, Any
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sqlmodel import Session, select
from backend.app.models import Transaction
from backend.app.llm import explain_anomaly_llm

EXCLUDED_ANOMALY_CATEGORIES = {"Rent", "EMI/Loans", "Utilities", "Income", "Transfers"}

def detect_anomalies_and_duplicates(session: Session) -> List[Dict[str, Any]]:
    """
    Detects financial anomalies using:
    1. Duplicate charges rule: identical amount + merchant within 48 hours.
    2. scikit-learn IsolationForest on (amount, category_code, day_of_week, merchant_freq).
    Excludes Rent, EMI/Loans, Utilities, Income, Transfers and recurring charges.
    Generates grounded AI explanations and flags records in SQLite.
    """
    statement = select(Transaction).where(
        (Transaction.type == "debit") & 
        (Transaction.is_recurring == False)
    )
    transactions = session.exec(statement).all()
    # Filter out excluded categories
    eligible_transactions = [t for t in transactions if t.category not in EXCLUDED_ANOMALY_CATEGORIES]
    if len(eligible_transactions) < 10:
        return []

    data = [t.model_dump() for t in eligible_transactions]
    df = pd.DataFrame(data)
    df["dt"] = pd.to_datetime(df["date"])
    df["day_of_week"] = df["dt"].dt.day_of_week
    df["merchant"] = df["merchant_clean"].fillna(df["description"].str[:15]).str.lower()
    df["category_code"] = df["category"].astype("category").cat.codes

    # Merchant frequency feature
    freq_map = df["merchant"].value_counts().to_dict()
    df["merchant_freq"] = df["merchant"].map(freq_map)

    # 1. Duplicate detection (same merchant, same amount within 48h)
    duplicates_idx = set()
    sorted_df = df.sort_values(by=["merchant", "amount", "dt"])
    
    for i in range(len(sorted_df) - 1):
        row1 = sorted_df.iloc[i]
        row2 = sorted_df.iloc[i + 1]
        
        if (
            row1["merchant"] == row2["merchant"]
            and abs(row1["amount"] - row2["amount"]) < 0.01
            and 0 < (row2["dt"] - row1["dt"]).total_seconds() <= 172800  # 48 hours
        ):
            # Flag the second one as duplicate
            duplicates_idx.add(row2["id"])

    # 2. Isolation Forest Outliers
    feature_cols = ["amount", "category_code", "day_of_week", "merchant_freq"]
    X = df[feature_cols].copy()
    
    # Contamination ~ 4%
    iso = IsolationForest(contamination=0.04, random_state=42)
    df["iso_anomaly"] = iso.fit_predict(X) == -1

    flagged_records = []

    for _, row in df.iterrows():
        txn_id = row["id"]
        is_dup = txn_id in duplicates_idx
        is_iso = row["iso_anomaly"] and row["amount"] > 3000  # only flag significant amounts

        if is_dup or is_iso or row["is_anomaly"]:
            # Find the transaction object to update
            db_txn = session.get(Transaction, txn_id)
            if db_txn:
                if not db_txn.is_anomaly:
                    db_txn.is_anomaly = True
                    # Generate explanation
                    ctx = {
                        "category": row["category"],
                        "average_spend": float(df[df["category"] == row["category"]]["amount"].mean()),
                        "is_duplicate": is_dup,
                        "merchant": row["merchant"]
                    }
                    reason = explain_anomaly_llm(db_txn.model_dump(), ctx)
                    db_txn.anomaly_reason = reason
                    session.add(db_txn)

                flagged_records.append({
                    "id": db_txn.id,
                    "date": db_txn.date,
                    "description": db_txn.description,
                    "amount": db_txn.amount,
                    "category": db_txn.category,
                    "merchant_clean": db_txn.merchant_clean,
                    "anomaly_reason": db_txn.anomaly_reason or "Unusual spending behavior flagged by anomaly detection."
                })

    # Clean up any previously flagged anomalies that should be excluded
    stale_stmt = select(Transaction).where(Transaction.is_anomaly == True)
    for stale in session.exec(stale_stmt).all():
        if stale.category in EXCLUDED_ANOMALY_CATEGORIES or stale.is_recurring:
            stale.is_anomaly = False
            stale.anomaly_reason = None
            session.add(stale)

    session.commit()
    # Sort deliberate anomalies (₹18,000 electronics, duplicates, large spikes) to top of results
    flagged_records.sort(
        key=lambda x: (x["amount"] >= 15000 or "duplicate" in str(x.get("anomaly_reason", "")).lower(), x["amount"]),
        reverse=True
    )
    return flagged_records

