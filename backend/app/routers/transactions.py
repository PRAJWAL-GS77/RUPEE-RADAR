from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from backend.app.database import get_session
from backend.app.models import (
    Transaction, TransactionCreate, TransactionUpdate, UserCorrection
)
from backend.app.rules import categorize_by_rule
from backend.app.llm import (
    batch_categorize_llm, parse_natural_language_transaction_llm
)
from pydantic import BaseModel

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

class NaturalLanguageInput(BaseModel):
    text: str

class ReviewFeedback(BaseModel):
    category: str
    merchant_clean: Optional[str] = None
    confirmed: bool = True

@router.get("", response_model=List[Transaction])
def list_transactions(
    category: Optional[str] = None,
    unreviewed_only: bool = False,
    limit: int = 500,
    offset: int = 0,
    session: Session = Depends(get_session)
):
    stmt = select(Transaction)
    if unreviewed_only:
        stmt = stmt.where(Transaction.is_reviewed == False)
    if category:
        stmt = stmt.where(Transaction.category == category)
    stmt = stmt.order_by(Transaction.date.desc()).offset(offset).limit(limit)
    return session.exec(stmt).all()

@router.post("/reset-demo")
def reset_demo():
    """Resets the database with fresh seed data for demo presentation."""
    from backend.seed import generate_seed_data
    generate_seed_data(force=True)
    return {"status": "success", "message": "Demo data reset successfully"}

@router.get("/review-queue", response_model=List[Transaction])
def get_review_queue(session: Session = Depends(get_session)):
    """Fetch transactions for the Swipe Review card stack (unreviewed or confidence < 0.70)."""
    stmt = select(Transaction).where(
        (Transaction.is_reviewed == False) | (Transaction.confidence < 0.70)
    ).order_by(Transaction.date.desc()).limit(20)
    return session.exec(stmt).all()

@router.post("", response_model=Transaction)
def create_transaction(
    txn_in: TransactionCreate, 
    session: Session = Depends(get_session)
):
    # If category not set or default, try Pass 1 rule
    category = txn_in.category
    confidence = txn_in.confidence
    merchant = txn_in.merchant_clean
    source = txn_in.category_source

    if not category or category == "Other":
        rule_cat, rule_conf, rule_merch = categorize_by_rule(txn_in.description)
        if rule_cat:
            category = rule_cat
            confidence = rule_conf
            merchant = rule_merch or merchant
            source = "rule"

    txn = Transaction(
        date=txn_in.date,
        description=txn_in.description,
        amount=txn_in.amount,
        type=txn_in.type,
        category=category,
        category_source=source,
        confidence=confidence,
        merchant_clean=merchant,
        is_reviewed=txn_in.is_reviewed,
        is_anomaly=txn_in.is_anomaly,
        is_recurring=txn_in.is_recurring
    )
    session.add(txn)
    session.commit()
    session.refresh(txn)
    return txn

@router.post("/parse-nl")
def parse_natural_language(input_data: NaturalLanguageInput):
    """Parses plain natural language text like 'spent 450 on dinner with friends yesterday'."""
    parsed = parse_natural_language_transaction_llm(input_data.text)
    return parsed

@router.post("/{txn_id}/review")
def review_transaction(
    txn_id: int, 
    feedback: ReviewFeedback, 
    session: Session = Depends(get_session)
):
    """
    Submits user review / swipe feedback.
    If the user corrected the category, save to UserCorrection so future AI prompts
    use it as few-shot learning.
    """
    txn = session.get(Transaction, txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    old_category = txn.category
    txn.is_reviewed = True
    txn.category = feedback.category
    txn.confidence = 1.0
    txn.category_source = "user"
    if feedback.merchant_clean:
        txn.merchant_clean = feedback.merchant_clean

    # If category changed, save to few-shot corrections database
    if old_category != feedback.category:
        correction = UserCorrection(
            raw_description=txn.description,
            merchant_clean=txn.merchant_clean or txn.description[:20],
            category=feedback.category
        )
        session.add(correction)

    session.add(txn)
    session.commit()
    session.refresh(txn)
    return {"status": "success", "transaction": txn}

@router.post("/batch-categorize")
def run_batch_categorization(session: Session = Depends(get_session)):
    """
    Finds unreviewed or Other category items, batches them in chunks of 20,
    and calls Pass 2 LLM categorization with few-shot user corrections.
    """
    # Fetch few-shot user corrections
    corrections = session.exec(select(UserCorrection).limit(10)).all()
    few_shot = [{"raw_description": c.raw_description, "merchant": c.merchant_clean, "category": c.category} for c in corrections]

    # Find unclassified items
    stmt = select(Transaction).where(
        (Transaction.category == "Other") | (Transaction.confidence < 0.6)
    ).limit(40)
    txns = session.exec(stmt).all()
    if not txns:
        return {"message": "No transactions require batch categorization", "updated": 0}

    # Process in batches of 20
    updated_count = 0
    batch_size = 20
    for i in range(0, len(txns), batch_size):
        chunk = txns[i:i + batch_size]
        payload = [{"id": t.id, "description": t.description, "amount": t.amount} for t in chunk]
        llm_results = batch_categorize_llm(payload, few_shot_examples=few_shot)

        # Map results back
        result_map = {r.get("id"): r for r in llm_results if "id" in r}
        for t in chunk:
            if t.id in result_map:
                res = result_map[t.id]
                t.category = res.get("category", t.category)
                t.confidence = float(res.get("confidence", 0.7))
                t.merchant_clean = res.get("merchant_clean", t.merchant_clean)
                t.category_source = "ai"
                # If confidence >= 0.7, auto mark reviewed
                if t.confidence >= 0.70:
                    t.is_reviewed = True
                session.add(t)
                updated_count += 1

    session.commit()
    return {"status": "success", "updated": updated_count}

