# ⚡ Rupee Radar: AI-Powered Personal Finance Manager (₹)

Rupee Radar is an AI-powered personal finance management web application designed for the Indian spending ecosystem (high-frequency UPI micropayments, recurring digital subscriptions, EMIs, and ₹ currency dynamics). Built as a flagship project for an **AI for Finance** course, every AI usage is visible, grounded, and demonstrable.

---

## 🌟 Key Features

1. **Two-Pass Hybrid Categorizer:**
   - **Pass 1:** Sub-millisecond deterministic keyword/regex matching on 50+ Indian merchants (Swiggy, Zomato, Blinkit, Zepto, BESCOM, etc.).
   - **Pass 2:** Batched LLM inference (chunks of 20) with strict JSON output schemas for ambiguous transactions.
   - **Few-Shot Learning Loop:** Transactions with confidence $< 0.70$ enter the **Swipe Review** queue. User corrections are saved to SQLite and automatically injected into subsequent LLM prompts.

2. **Grounded Spending Analytics (Code-Computed, Zero LLM Math):**
   - Total income, expenses, and savings rates calculated strictly via `pandas`.
   - **Safe-to-Spend Today:** Dynamic daily discretionary burn allowance factoring fixed commitments (Rent, EMI, utilities) and days remaining.
   - **Money Score (0-100):** Transparent health index evaluating savings rate, pacing, subscription efficiency, and anomaly discipline.

3. **Machine Learning Anomaly Detection:**
   - Unsupervised outlier detection using **scikit-learn's `IsolationForest`** on amount, category encoding, day of week, and merchant frequency.
   - Deterministic 48-hour window duplicate charge detector.
   - Each flag receives a crisp, grounded 1-sentence AI explanation.

4. **Tinder-Style Swipe Review:**
   - Card deck with smooth spring physics (`Framer Motion`).
   - Swipe right to confirm AI proposal; swipe left to pick another category.
   - "Inbox Zero" confetti celebration upon queue completion.

5. **Liquid-Fill Goal Planner:**
   - Goal progress with animated liquid fill and milestone triggers at 25%, 50%, 75%, and 100%.
   - AI category trim recommendations whose cuts strictly sum up to the required monthly target.

6. **"Ask Your Money" Explainable Chat:**
   - Natural language queries translated into structured database query specs.
   - Python executes the exact calculation on SQLite (LLM never does arithmetic).
   - Expandable **AI Query Spec** inspector pill directly under responses for complete transparency.

7. **Natural Language Transaction Entry:**
   - Modal with natural language quick-parse (e.g., *"spent 450 on dinner with friends yesterday"*), pre-filling amount, category, date, and merchant.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion, Recharts, Lucide Icons, canvas-confetti.
- **Backend:** FastAPI (Python), SQLite with SQLModel, pandas, scikit-learn.
- **LLM:** Google Gemini API (`gemini-2.5-flash`) via modern `google-genai` SDK.
- **Mock Mode:** 100% deterministic canned responses when `GEMINI_API_KEY` is not provided or `MOCK_AI=true`.

---

### Quick Launch (One-Click on Windows)
Simply double-click `start.bat` in the project root. It starts the FastAPI backend and Next.js frontend in separate terminal windows, waits 8 seconds, and automatically opens [http://localhost:3000](http://localhost:3000) in your browser.
To stop both servers cleanly, double-click `stop.bat` (kills processes on ports 8000 and 3000).

---

## 🚀 Manual Quickstart Guide

### 1. Clone & Setup Environment

Ensure Python 3.10+ and Node.js 18+ are installed.

```bash
# Backend virtual environment
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

### 2. Configure Environment Variables (Optional)

Create a `.env` file in the project root:

```env
# Optional: Set your Gemini API key. If omitted, app operates in deterministic Mock Mode!
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
MOCK_AI=false
```

*(Note: If no API key is provided, Rupee Radar runs in mock mode with realistic canned responses—the demo never breaks!)*

### 3. Seed Sample Data (~300 Transactions, 6 Months)

Generate 6 months of realistic Indian financial data (salary credit, Swiggy/Zomato, utilities, rent, deliberate anomalies, duplicate charges, and subscriptions):

```bash
# Run the seed script
python backend/seed.py
```

### 4. Run the Backend API

```bash
# Starts FastAPI server on http://127.0.0.1:8000
python -m uvicorn backend.app.main:app --reload --port 8000
```

API docs will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 5. Run the Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Unit & Integration Tests

The test suite covers the Pass 1 rule categorizer, pandas analytics, money score formulas, query engine translation, and FastAPI endpoints:

```bash
# Run pytest unit & integration test suite
python -m pytest -q

# Run end-to-end FastAPI endpoint smoke test
python backend/smoke_test.py
```

All 24 unit and integration tests and the full endpoint smoke test will execute and pass cleanly.

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── app/
│   │   ├── config.py           # Configuration & environment loader
│   │   ├── database.py         # SQLite engine & session management
│   │   ├── models.py           # SQLModel schemas (Transaction, Goal, etc.)
│   │   ├── rules.py            # Pass 1 deterministic merchant categorizer
│   │   ├── analytics.py        # pandas-based spend analysis & Money Score
│   │   ├── anomaly.py          # scikit-learn IsolationForest & duplicate checks
│   │   ├── llm.py              # Gemini client with deterministic mock fallback
│   │   ├── query_engine.py     # Deterministic query spec executor
│   │   ├── main.py             # FastAPI entrypoint & CORS
│   │   └── routers/            # transactions, analytics, anomalies, goals, chat
│   ├── seed.py                 # 6-month realistic Indian data generator
│   ├── requirements.txt        # Backend dependencies
│   └── tests/                  # Pytest unit and integration test suite
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx      # Theme provider, font, root layout
│   │   │   ├── page.tsx        # Home / "Today" (Score ring, Safe-to-Spend, Streak)
│   │   │   ├── review/         # Tinder-style Swipe Review card stack
│   │   │   ├── insights/       # Interactive charts, anomaly cards, sub audit
│   │   │   ├── goals/          # Liquid-fill goals & AI category trim recommendations
│   │   │   └── ask/            # "Ask Your Money" explainable conversational AI
│   │   ├── components/         # Reusable UI, Navbar, MoneyScoreRing, Modals
│   │   ├── lib/                # API client & Indian Rupee formatting helpers
│   │   └── types/              # Shared TypeScript interfaces
├── docs/
│   ├── AI_USAGE.md             # Complete audit of all AI prompts & design choices
│   └── ARCHITECTURE.md         # Mermaid system architecture & dataflow diagrams
├── DEMO_SCRIPT.md              # 5-minute college presentation walkthrough script
└── README.md                   # This document
```

---

## 🎓 Academic Documentation
- **[docs/AI_USAGE.md](docs/AI_USAGE.md):** In-depth audit of prompts, schemas, temperature settings, and the mathematical grounding philosophy.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md):** Mermaid diagrams detailing system components, request flows, and SQLite schemas.
- **[DEMO_SCRIPT.md](DEMO_SCRIPT.md):** 5-minute timed presentation script highlighting the core technical innovations.

