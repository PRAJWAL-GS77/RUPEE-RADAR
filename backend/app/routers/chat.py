from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlmodel import Session
from backend.app.database import get_session
from backend.app.llm import parse_chat_query_to_spec_llm, phrase_chat_answer_llm
from backend.app.query_engine import execute_query_spec
from pydantic import BaseModel

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str
    query_spec: Dict[str, Any]
    result: Dict[str, Any]

@router.post("", response_model=ChatResponse)
def ask_your_money(chat_in: ChatMessage, session: Session = Depends(get_session)):
    """
    'Ask your money' conversational pipeline:
    1. LLM parses question into a structured DB query spec.
    2. Python / SQLite executes the exact calculation (LLM never does math).
    3. LLM phrases the final response grounded in real data.
    """
    user_query = chat_in.message.strip()

    # Step 1: LLM translates query to structured query spec
    spec = parse_chat_query_to_spec_llm(user_query)

    # Step 2: Code executes exact query spec on SQLite
    raw_result = execute_query_spec(spec, session)

    # Step 3: LLM phrases response grounded purely in raw_result
    final_answer = phrase_chat_answer_llm(user_query, spec, raw_result)

    return ChatResponse(
        answer=final_answer,
        query_spec=spec,
        result=raw_result
    )

