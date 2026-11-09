from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from backend.app.database import get_session
from backend.app.models import Transaction
from backend.app.anomaly import detect_anomalies_and_duplicates

router = APIRouter(prefix="/api/anomalies", tags=["anomalies"])

@router.get("")
def get_anomalies(session: Session = Depends(get_session)):
    """Runs IsolationForest & duplicate checks and returns flagged anomalies."""
    results = detect_anomalies_and_duplicates(session)
    return results

@router.post("/dismiss/{txn_id}")
def dismiss_anomaly(txn_id: int, session: Session = Depends(get_session)):
    """User acknowledges or dismisses an anomaly."""
    txn = session.get(Transaction, txn_id)
    if txn:
        txn.is_anomaly = False
        txn.anomaly_reason = None
        session.add(txn)
        session.commit()
    return {"status": "dismissed"}

