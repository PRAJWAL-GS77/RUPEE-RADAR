from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field

class TransactionBase(SQLModel):
    date: str  # YYYY-MM-DD
    description: str
    amount: float
    type: str = "debit"  # debit or credit
    category: str = "Other"
    category_source: str = "rule"  # rule, ai, user
    confidence: float = 1.0  # 0.0 - 1.0
    merchant_clean: Optional[str] = None
    is_reviewed: bool = True
    is_anomaly: bool = False
    anomaly_reason: Optional[str] = None
    is_recurring: bool = False

class Transaction(TransactionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(SQLModel):
    category: Optional[str] = None
    category_source: Optional[str] = None
    confidence: Optional[float] = None
    merchant_clean: Optional[str] = None
    is_reviewed: Optional[bool] = None

class GoalBase(SQLModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    target_date: str  # YYYY-MM-DD
    category_trims: Optional[str] = None  # JSON string of AI trim recommendations

class Goal(GoalBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class GoalCreate(SQLModel):
    name: str
    target_amount: float
    target_date: str
    current_amount: float = 0.0

class UserCorrection(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    raw_description: str
    merchant_clean: str
    category: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class DailyChallenge(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: str  # YYYY-MM-DD
    title: str
    potential_saving: float
    completed: bool = False

class UserStreak(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    current_streak: int = 1
    last_active_date: str
    streak_freeze_count: int = 1
