# Rupee Radar: Architecture Specification

Rupee Radar is designed around a decoupled, responsive modern client-server architecture with an explainable AI pipeline tailored to Indian financial workflows (UPI, EMIs, recurring subscriptions, and ₹ currency dynamics).

---

## 1. System Architecture

```mermaid
graph TD
    Client["Next.js App Router (TypeScript + Framer Motion + Tailwind)"]
    API["FastAPI Backend (Python)"]
    DB[("SQLite Database via SQLModel")]
    PandasEngine["pandas Analytics & Pacing Engine"]
    MLAnom["scikit-learn IsolationForest"]
    Rules["Pass 1: Deterministic Indian Merchant Rules"]
    Gemini["Pass 2: Google Gemini 1.5 Flash (LLM)"]
    MockAI["Deterministic Mock Mode Engine"]

    Client -->|REST & JSON API| API
    API --> DB
    API --> PandasEngine
    API --> MLAnom
    API --> Rules
    API --> Gemini
    API --> MockAI

    MLAnom -.->|Anomalies & Duplicates| DB
    Rules -.->|Clean Merchants & Categories| DB
    PandasEngine -.->|Metrics, Burn Rate & Money Score| API
```

---

## 2. Hybrid Categorization Pipeline

```mermaid
sequenceDiagram
    participant User as Client / SMS Ingestion
    participant Backend as FastAPI Router
    participant Rules as Pass 1 (Rules)
    participant Batcher as Pass 2 (Batcher)
    participant Gemini as Gemini LLM / Mock
    participant DB as SQLite DB
    participant Swipe as Swipe Review Queue

    User->>Backend: Post Transaction (e.g. SWIGGY*ORDER 4421)
    Backend->>Rules: Match Regex & Merchant Keywords
    alt Pattern Matched (High Confidence >= 0.90)
        Rules-->>Backend: Category: "Food Delivery", Conf: 0.95, Merch: "Swiggy"
        Backend->>DB: Save as Reviewed
    else Unmatched / Low Confidence
        Rules-->>Backend: Null / Other (Conf < 0.60)
        Backend->>Batcher: Enqueue in batch of 20
        Batcher->>DB: Fetch Few-Shot User Corrections
        Batcher->>Gemini: Batch Categorization Prompt
        Gemini-->>Batcher: Strict JSON Array with Categories & Confidences
        alt Confidence >= 0.70
            Batcher->>DB: Save as Auto-Reviewed
        else Confidence < 0.70
            Batcher->>Swipe: Route to Swipe Review Queue
        end
    end
```

---

## 3. "Ask Your Money" Natural Language Query Engine

```mermaid
flowchart LR
    Q["User Question: 'How much did I spend on food last month?'"] --> LLM1["Gemini Parser: Convert to Structured JSON Query Spec"]
    LLM1 --> Spec["Query Spec: { category: 'Food Delivery', time_frame: 'last_month', aggregation: 'sum' }"]
    Spec --> Engine["Python / SQLite Query Engine (Zero Math Hallucination)"]
    Engine --> Result["Computed Real Value: ₹4,200 (8 orders)"]
    Result --> LLM2["Gemini NLG Synthesizer: Phrase Natural Grounded Response"]
    LLM2 --> Final["Response in Chat with Explainability Badge"]
```

---

## 4. Database Schema (SQLModel / SQLite)

```mermaid
erDiagram
    TRANSACTION {
        int id PK
        string date
        string description
        float amount
        string type "debit | credit"
        string category
        string category_source "rule | ai | user"
        float confidence
        string merchant_clean
        boolean is_reviewed
        boolean is_anomaly
        string anomaly_reason
        boolean is_recurring
        string created_at
    }

    GOAL {
        int id PK
        string name
        float target_amount
        float current_amount
        string target_date
        string category_trims "JSON AI trims"
        string created_at
    }

    USER_CORRECTION {
        int id PK
        string raw_description
        string merchant_clean
        string category
        string created_at
    }

    DAILY_CHALLENGE {
        int id PK
        string date
        string title
        float potential_saving
        boolean completed
    }

    USER_STREAK {
        int id PK
        int current_streak
        string last_active_date
        int streak_freeze_count
    }

    USER_CORRECTION }|..|{ TRANSACTION : "Learned from user swipes"
```

---

## 5. Security & Privacy Safeguards
- **Zero Raw PII Exposure:** Bank account numbers, IFSC codes, mobile numbers, and personal identity strings are stripped before transmission to any external model.
- **Fail-Safe Offline Mode:** In the absence of an internet connection or Gemini API credentials, deterministic mock logic ensures 100% operational functionality without crashing.

