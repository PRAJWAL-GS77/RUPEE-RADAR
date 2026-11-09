import json
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from backend.app.database import get_session
from backend.app.models import Goal, GoalCreate
from backend.app.analytics import fetch_transactions_df, compute_spending_summary
from backend.app.llm import suggest_goal_trims_llm
from pydantic import BaseModel

router = APIRouter(prefix="/api/goals", tags=["goals"])

class GoalUpdateProgress(BaseModel):
    amount_to_add: float

@router.get("", response_model=List[Goal])
def list_goals(session: Session = Depends(get_session)):
    return session.exec(select(Goal)).all()

@router.post("", response_model=Goal)
def create_goal(goal_in: GoalCreate, session: Session = Depends(get_session)):
    # Calculate months until target date
    try:
        t_date = datetime.strptime(goal_in.target_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    today = date.today()
    days_left = max(1, (t_date - today).days)
    months_left = max(1.0, days_left / 30.0)

    remaining_amount = max(0.0, goal_in.target_amount - goal_in.current_amount)
    required_monthly = round(remaining_amount / months_left, 2)

    # Fetch current category spending to give grounded context to LLM
    df = fetch_transactions_df(session)
    summary = compute_spending_summary(df)
    categories = summary.get("category_breakdown", [])

    # Get AI recommendations for category trims
    trims = suggest_goal_trims_llm(required_monthly, categories)

    goal = Goal(
        name=goal_in.name,
        target_amount=goal_in.target_amount,
        current_amount=goal_in.current_amount,
        target_date=goal_in.target_date,
        category_trims=json.dumps(trims)
    )
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return goal

@router.post("/{goal_id}/add-funds")
def add_funds_to_goal(goal_id: int, payload: GoalUpdateProgress, session: Session = Depends(get_session)):
    goal = session.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.current_amount = min(goal.target_amount, goal.current_amount + payload.amount_to_add)
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return goal

@router.delete("/{goal_id}")
def delete_goal(goal_id: int, session: Session = Depends(get_session)):
    goal = session.get(Goal, goal_id)
    if goal:
        session.delete(goal)
        session.commit()
    return {"status": "deleted"}

