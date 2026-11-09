from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional
import pandas as pd
from sqlmodel import Session, select
from backend.app.models import Transaction

def execute_query_spec(spec: Dict[str, Any], session: Session) -> Dict[str, Any]:
    """
    Executes a structured query spec deterministically against SQLite data.
    The LLM never performs arithmetic; this engine performs 100% of the computation.
    """
    # 0. Early return for conversational / off-topic intents
    intent = spec.get("intent")
    aggregation = str(spec.get("aggregation", "sum")).lower()
    if intent in ["greeting", "unrecognized"] or aggregation in ["greeting", "unrecognized"]:
        return {"value": 0.0, "count": 0, "items": []}

    statement = select(Transaction)
    results = session.exec(statement).all()
    if not results:
        return {"value": 0.0, "count": 0, "items": []}

    df = pd.DataFrame([t.model_dump() for t in results])
    df["dt"] = pd.to_datetime(df["date"])
    latest_month = df["dt"].dt.strftime("%Y-%m").max()

    # Special Intent: Balance / Money Left / Remaining / Savings
    if intent in ["balance", "remaining"] or aggregation in ["balance", "remaining"]:
        month_df = df[df["date"].str.startswith(latest_month)]
        inc = float(month_df[month_df["type"] == "credit"]["amount"].sum())
        exp = float(month_df[month_df["type"] == "debit"]["amount"].sum())
        rem = inc - exp
        return {
            "value": round(rem, 2),
            "income": round(inc, 2),
            "expense": round(exp, 2),
            "period": "this month",
            "count": int(len(month_df)),
            "items": []
        }

    # Special Intent: Latest / Last Expense
    if intent in ["latest_transaction", "latest"] or aggregation in ["latest", "last"]:
        debits = df[df["type"] == "debit"].sort_values(by=["date", "id"], ascending=[False, False])
        if debits.empty:
            return {"value": 0.0, "count": 0, "items": []}
        latest_row = debits.iloc[0].drop(labels=["dt"], errors="ignore").to_dict()
        return {
            "value": float(latest_row["amount"]),
            "count": 1,
            "top_item": latest_row,
            "items": [latest_row]
        }

    # 1. Filter by transaction type (debit / credit)
    txn_type = spec.get("type", "debit")
    if txn_type:
        df = df[df["type"] == txn_type]

    # 2. Filter by category
    category = spec.get("category")
    if category and category.lower() != "all":
        df = df[df["category"].str.lower() == category.lower()]

    # 3. Filter by merchant if specified
    merchant = spec.get("merchant")
    if merchant:
        df = df[df["description"].str.contains(merchant, case=False, na=False) |
                df["merchant_clean"].str.contains(merchant, case=False, na=False)]

    # 4. Filter by Time Frame
    time_frame = spec.get("time_frame", "current_month")
    now = datetime.now()
    
    if time_frame == "current_month":
        df = df[df["date"].str.startswith(latest_month)]
    elif time_frame == "last_month":
        first_of_this_month = date(now.year, now.month, 1)
        last_month_end = first_of_this_month - timedelta(days=1)
        last_year_month = last_month_end.strftime("%Y-%m")
        df = df[df["date"].str.startswith(last_year_month)]
    elif time_frame == "last_7_days":
        cutoff = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        df = df[df["date"] >= cutoff]

    # Drop temporary Timestamp column before serialization
    df = df.drop(columns=["dt"], errors="ignore")

    count = int(len(df))
    if count == 0:
        return {"value": 0.0, "count": 0, "items": []}

    if aggregation == "count":
        return {
            "value": count,
            "count": count,
            "items": df.sort_values(by="date", ascending=False).head(5).to_dict(orient="records")
        }
    elif aggregation in ["sum", "total"]:
        total_val = float(df["amount"].sum())
        return {
            "value": round(total_val, 2),
            "count": count,
            "items": df.sort_values(by="date", ascending=False).head(5).to_dict(orient="records")
        }
    elif aggregation in ["average", "avg", "mean"]:
        avg_val = float(df["amount"].mean())
        return {
            "value": round(avg_val, 2),
            "count": count,
            "items": df.sort_values(by="date", ascending=False).head(5).to_dict(orient="records")
        }
    elif aggregation in ["max", "highest", "biggest"]:
        top_row = df.sort_values(by="amount", ascending=False).iloc[0]
        return {
            "value": float(top_row["amount"]),
            "count": count,
            "top_item": top_row.to_dict(),
            "items": [top_row.to_dict()]
        }
    elif aggregation in ["min", "lowest", "smallest"]:
        low_row = df.sort_values(by="amount", ascending=True).iloc[0]
        return {
            "value": float(low_row["amount"]),
            "count": count,
            "top_item": low_row.to_dict(),
            "items": [low_row.to_dict()]
        }
    else:  # 'list' or fallback (capped to 5)
        total_val = float(df["amount"].sum())
        return {
            "value": round(total_val, 2),
            "count": count,
            "items": df.sort_values(by="date", ascending=False).head(5).to_dict(orient="records")
        }

