import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory or root directory
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
# Mock mode is active if explicitly set to true OR if no API key is provided
MOCK_AI = os.getenv("MOCK_AI", "").lower() in ("true", "1", "yes") or not bool(GEMINI_API_KEY)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'rupee_radar.db'}")

CATEGORIES = [
    "Food Delivery",
    "Dining Out",
    "Groceries",
    "Transport",
    "Fuel",
    "Rent",
    "Utilities",
    "EMI/Loans",
    "Subscriptions",
    "Shopping",
    "Entertainment",
    "Health",
    "Travel",
    "Cash Withdrawal",
    "Income",
    "Transfers",
    "Other"
]

