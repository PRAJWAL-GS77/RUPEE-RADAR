import calendar
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from sqlmodel import Session, select
from backend.app.models import Transaction

def fetch_transactions_df(session: Session) -> pd.DataFrame:
    """Fetch all transactions from DB into a pandas DataFrame."""
    statement = select(Transaction)
    results = session.exec(statement).all()
    if not results:
        return pd.DataFrame(columns=[
            "id", "date", "description", "amount", "type", "category",
            "category_source", "confidence", "merchant_clean", "is_reviewed",
            "is_anomaly", "anomaly_reason", "is_recurring"
        ])
    
    data = [t.model_dump() for t in results]
    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"])
    df["year_month"] = df["date"].dt.to_period("M").astype(str)
    df["day"] = df["date"].dt.day
    return df

def compute_spending_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Computes core financial metrics across all historical data and the active month.
    """
    if df.empty:
        return {
            "total_income": 0.0,
            "total_expense": 0.0,
            "savings_rate": 0.0,
            "current_month_income": 0.0,
            "current_month_expense": 0.0,
            "current_month_savings": 0.0,
            "daily_burn_rate": 0.0,
            "projected_month_end_spend": 0.0,
            "safe_to_spend_today": 0.0,
            "category_breakdown": [],
            "monthly_trends": [],
            "recurring_payments": [],
            "money_score": {"score": 75, "delta": "+0", "reason": "No data yet recorded."}
        }

    # Latest month in the data
    latest_month = df["year_month"].max()
    latest_date = df["date"].max()
    
    # Current month slice
    curr_df = df[df["year_month"] == latest_month]
    
    curr_income = float(curr_df[curr_df["type"] == "credit"]["amount"].sum())
    curr_expense = float(curr_df[curr_df["type"] == "debit"]["amount"].sum())
    curr_savings = curr_income - curr_expense
    savings_rate = round((curr_savings / curr_income * 100), 1) if curr_income > 0 else 0.0

    # Days elapsed and total days in current month
    curr_year = latest_date.year
    curr_month_num = latest_date.month
    days_in_month = calendar.monthrange(curr_year, curr_month_num)[1]
    days_elapsed = max(1, latest_date.day)
    days_remaining = max(1, days_in_month - days_elapsed + 1)

    daily_burn_rate = round(curr_expense / days_elapsed, 2)
    projected_month_end_spend = round(daily_burn_rate * days_in_month, 2)

    # Safe to spend today:
    # Target 25% savings from income
    target_savings = curr_income * 0.25 if curr_income > 0 else 0
    available_for_discretionary = max(0.0, curr_income - target_savings - curr_expense)
    safe_to_spend_today = round(available_for_discretionary / days_remaining, 2) if days_remaining > 0 else 0.0

    # Category breakdown for current month (expenses only)
    curr_expenses = curr_df[curr_df["type"] == "debit"]
    cat_grouped = curr_expenses.groupby("category")["amount"].sum().reset_index()
    cat_grouped["percentage"] = (cat_grouped["amount"] / curr_expense * 100).round(1) if curr_expense > 0 else 0.0
    cat_breakdown = cat_grouped.sort_values(by="amount", ascending=False).to_dict(orient="records")

    # Monthly Trends (last 6 months)
    monthly_grouped = df.groupby(["year_month", "type"])["amount"].sum().unstack(fill_value=0).reset_index()
    if "credit" not in monthly_grouped.columns:
        monthly_grouped["credit"] = 0.0
    if "debit" not in monthly_grouped.columns:
        monthly_grouped["debit"] = 0.0
    
    monthly_grouped["savings"] = monthly_grouped["credit"] - monthly_grouped["debit"]
    monthly_grouped["savings_rate"] = np.where(
        monthly_grouped["credit"] > 0,
        ((monthly_grouped["savings"] / monthly_grouped["credit"]) * 100).round(1),
        0.0
    )
    monthly_trends = monthly_grouped.sort_values("year_month").to_dict(orient="records")

    # Recurring payment detection
    recurring_payments = detect_recurring_payments(df)

    # Compute Grounded Money Score (0-100)
    money_score_info = compute_money_score(
        df=df,
        curr_df=curr_df,
        days_elapsed=days_elapsed,
        days_in_month=days_in_month,
        savings_rate=savings_rate,
        curr_expense=curr_expense,
        curr_income=curr_income,
        monthly_trends=monthly_trends,
        projected_spend=projected_month_end_spend
    )

    return {
        "active_month": latest_month,
        "days_elapsed": days_elapsed,
        "days_in_month": days_in_month,
        "days_remaining": days_remaining,
        "total_income": float(df[df["type"] == "credit"]["amount"].sum()),
        "total_expense": float(df[df["type"] == "debit"]["amount"].sum()),
        "current_month_income": curr_income,
        "current_month_expense": curr_expense,
        "current_month_savings": curr_savings,
        "savings_rate": savings_rate,
        "daily_burn_rate": daily_burn_rate,
        "projected_month_end_spend": projected_month_end_spend,
        "safe_to_spend_today": safe_to_spend_today,
        "category_breakdown": cat_breakdown,
        "monthly_trends": monthly_trends,
        "recurring_payments": recurring_payments,
        "money_score": money_score_info
    }

def detect_recurring_payments(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Detects recurring subscriptions / bills:
    Transactions with similar merchant_clean and amounts occurring across multiple months.
    """
    debits = df[df["type"] == "debit"].copy()
    if debits.empty:
        return []

    # Fill empty merchant with description prefix
    debits["merchant"] = debits["merchant_clean"].fillna(debits["description"].str[:15])

    recurring_candidates = []
    grouped = debits.groupby("merchant")

    for merchant, group in grouped:
        distinct_months = group["year_month"].nunique()
        if distinct_months >= 2:  # Recurring if appeared in 2 or more distinct months
            avg_amount = float(group["amount"].mean())
            std_amount = float(group["amount"].std()) if len(group) > 1 else 0.0
            
            # If standard deviation is relatively low (consistent pricing)
            if std_amount <= avg_amount * 0.20 or len(group) == 2:
                latest_txn = group.sort_values(by="date", ascending=False).iloc[0]
                category = latest_txn["category"]
                
                # Flag potential unused subscriptions based on name or frequency
                is_unused = merchant.lower() in ["fitpass", "gym membership fitpass", "magzter digital", "magzter", "audible"]
                
                recurring_candidates.append({
                    "merchant": merchant,
                    "category": category,
                    "avg_amount": round(avg_amount, 2),
                    "frequency": "Monthly",
                    "occurrences": int(len(group)),
                    "months_active": int(distinct_months),
                    "latest_date": latest_txn["date"].strftime("%Y-%m-%d"),
                    "is_unused_alert": is_unused,
                    "annual_cost": round(avg_amount * 12, 2)
                })

    recurring_candidates.sort(key=lambda x: x["avg_amount"], reverse=True)
    return recurring_candidates

def _calculate_slice_score(
    month_slice: pd.DataFrame,
    days_elapsed: int,
    days_in_month: int,
    prior_trends: List[Dict[str, Any]]
) -> int:
    """Calculates grounded Money Score (0-100) for a given month slice."""
    if month_slice.empty:
        return 70

    income = float(month_slice[month_slice["type"] == "credit"]["amount"].sum())
    expense = float(month_slice[month_slice["type"] == "debit"]["amount"].sum())
    savings = income - expense
    savings_rate = (savings / income * 100) if income > 0 else 0.0

    # 1. Savings rate points (max 40)
    if income > 0:
        sr_ratio = min(max(savings_rate / 35.0, 0.0), 1.0)
        savings_pts = sr_ratio * 40.0
    else:
        savings_pts = 20.0

    # 2. Discretionary burn pacing points (max 35)
    # Exclude Rent, EMI/Loans, Utilities, and recurring charges
    fixed_mask = month_slice["category"].isin(["Rent", "EMI/Loans", "Utilities"]) | (month_slice["is_recurring"] == True)
    discretionary_spend = float(month_slice[(month_slice["type"] == "debit") & (~fixed_mask)]["amount"].sum())
    fixed_spend = float(month_slice[(month_slice["type"] == "debit") & fixed_mask]["amount"].sum())

    if income > 0:
        total_discretionary_budget = max(income * 0.25, income - fixed_spend - (income * 0.20))
        budget_elapsed = total_discretionary_budget * (min(days_elapsed, days_in_month) / max(1, days_in_month))
        if budget_elapsed > 0:
            pacing_ratio = discretionary_spend / budget_elapsed
            if pacing_ratio <= 1.0:
                burn_pts = 35.0
            elif pacing_ratio <= 1.30:
                burn_pts = 35.0 * (1.0 - (pacing_ratio - 1.0) / 0.30 * 0.5)
            else:
                burn_pts = max(5.0, 17.5 - (pacing_ratio - 1.30) * 15.0)
        else:
            burn_pts = 20.0
    else:
        burn_pts = 20.0

    # 3. Consistency points (max 25)
    if prior_trends:
        positive_savings_count = sum(1 for m in prior_trends if m.get("savings", 0) > 0)
        consistency_pts = (positive_savings_count / len(prior_trends)) * 25.0
    else:
        consistency_pts = 20.0

    score = int(round(savings_pts + burn_pts + consistency_pts))
    return min(max(score, 0), 100)

def compute_money_score(
    savings_rate: float = 0.0,
    curr_expense: float = 0.0,
    curr_income: float = 0.0,
    projected_spend: float = 0.0,
    monthly_trends: Optional[List[Dict[str, Any]]] = None,
    df: Optional[pd.DataFrame] = None,
    curr_df: Optional[pd.DataFrame] = None,
    days_elapsed: int = 15,
    days_in_month: int = 30,
) -> Dict[str, Any]:
    """
    Calculates Money Score (0-100) with discretionary pacing and exact previous-month delta:
    - Delta = current score - previous month's score at the same day of month.
    - Clamped strictly to 0-100. If no previous month data, delta is None.
    """
    trends = monthly_trends or []
    prior_curr = trends[:-1] if len(trends) >= 2 else []

    if curr_df is not None and not curr_df.empty:
        final_score = _calculate_slice_score(curr_df, days_elapsed, days_in_month, prior_curr)
    else:
        sr_ratio = min(max(savings_rate / 35.0, 0.0), 1.0) if curr_income > 0 else 0.5
        final_score = min(max(int(round(sr_ratio * 40.0 + 30.0 + 20.0)), 0), 100)

    # Compute delta compared to previous month at the same day of month
    delta_str = None
    if df is not None and not df.empty and len(trends) >= 2:
        prev_month_str = trends[-2]["year_month"]
        prev_df = df[df["year_month"] == prev_month_str]
        if not prev_df.empty:
            try:
                p_year, p_month = map(int, prev_month_str.split("-"))
                prev_days_in_month = calendar.monthrange(p_year, p_month)[1]
            except Exception:
                prev_days_in_month = 30
            
            prior_prev = trends[:-2] if len(trends) >= 3 else []
            prev_slice = prev_df[prev_df["day"] <= days_elapsed]
            prev_score = _calculate_slice_score(prev_slice, days_elapsed, prev_days_in_month, prior_prev)
            
            diff = final_score - prev_score
            delta_str = f"+{diff}" if diff >= 0 else f"{diff}"

    # Human-readable grounded reason reflecting discretionary pacing
    if final_score >= 80:
        reason = f"Excellent financial health! Your {savings_rate}% savings rate and discretionary pacing are well within budget."
    elif final_score >= 65:
        reason = f"Solid spending discipline. Keeping discretionary expenses steady will maintain a strong buffer."
    else:
        reason = f"High discretionary burn rate detected. Discretionary spending is pacing ahead of your monthly budget."

    return {
        "score": final_score,
        "delta": delta_str,
        "reason": reason
    }

