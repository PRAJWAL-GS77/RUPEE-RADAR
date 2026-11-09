from datetime import date, timedelta, datetime
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from backend.app.database import get_session
from backend.app.analytics import fetch_transactions_df, compute_spending_summary
from backend.app.models import UserStreak

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/summary")
def get_analytics_summary(session: Session = Depends(get_session)):
    """Computes monthly totals, category breakdown, burn rate, safe-to-spend, recurring subs, and Money Score."""
    df = fetch_transactions_df(session)
    summary = compute_spending_summary(df)
    return summary

@router.get("/streak")
def get_user_streak(session: Session = Depends(get_session)):
    """Returns the user's daily check-in streak and freeze status."""
    streak = session.exec(select(UserStreak)).first()
    if not streak:
        streak = UserStreak(
            current_streak=1,
            last_active_date=date.today().strftime("%Y-%m-%d"),
            streak_freeze_count=1
        )
        session.add(streak)
        session.commit()
        session.refresh(streak)
    return streak

@router.post("/streak/check-in")
def check_in_streak(session: Session = Depends(get_session)):
    """Advances user daily streak on completing swipe review or daily finance check."""
    streak = session.exec(select(UserStreak)).first()
    today_str = date.today().strftime("%Y-%m-%d")
    
    if not streak:
        streak = UserStreak(current_streak=1, last_active_date=today_str, streak_freeze_count=1)
        session.add(streak)
    else:
        last_date = datetime.strptime(streak.last_active_date, "%Y-%m-%d").date()
        diff = (date.today() - last_date).days
        if diff == 1:
            streak.current_streak += 1
            streak.last_active_date = today_str
        elif diff > 1:
            if streak.streak_freeze_count > 0:
                streak.streak_freeze_count -= 1
                streak.current_streak += 1
                streak.last_active_date = today_str
            else:
                streak.current_streak = 1
                streak.last_active_date = today_str
        # If diff == 0, already checked in today

    session.commit()
    session.refresh(streak)
    return streak
