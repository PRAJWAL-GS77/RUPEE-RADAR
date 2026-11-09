# Rupee Radar: AI Usage & Explainability Audit

This document details every AI component built into **Rupee Radar**, adhering to academic rigor for an **AI for Finance** course. It explains the exact prompts, schemas, fallbacks, and design philosophies.

---

## Architectural Principles

1. **Deterministic Arithmetic Over LLM Math:**
   Large Language Models are notorious for arithmetic inaccuracies and hallucinations. Rupee Radar enforces a strict separation: **Code (pandas & Python) computes 100% of financial numbers** (burn rates, category sums, safe-to-spend allowances, savings rates). The LLM is used exclusively for linguistic reasoning, pattern translation, and empathetic framing.

2. **Zero-PII Transmission:**
   The LLM never receives raw bank account numbers, passwords, phone numbers, or user personal identifiers. It receives sanitized merchant tokens, category labels, and pre-computed statistical aggregates.

3. **Deterministic Mock Mode:**
   If no Gemini API key is configured or `MOCK_AI=true`, the system falls back to canned deterministic models ensuring 100% offline uptime during college grading and live demos.

---

## 1. Hybrid Transaction Categorization

### Overview
Bank SMS and UPI descriptions in India are notoriously noisy (e.g., `SWIGGY*ORDER 4421`, `BESCOM ELECTRICITY`, `UPI-ZOMATO-9912@ybl`). Running all transactions through an LLM is slow, expensive, and unnecessary.
Rupee Radar uses a two-pass hybrid pipeline:
- **Pass 1 (Rules):** High-speed regex pattern matching on over 50 prominent Indian merchants.
- **Pass 2 (Batched LLM):** Ambiguous or unmatched records are grouped in **batches of 20** to minimize API roundtrips and latency.

### Prompt Template
```
You are a transaction categorizer for an Indian personal finance app.
Categories: Food Delivery, Dining Out, Groceries, Transport, Fuel, Rent, Utilities, EMI/Loans, Subscriptions, Shopping, Entertainment, Health, Travel, Cash Withdrawal, Income, Transfers, Other.
For each transaction return: {"id": int, "category": str, "confidence": 0-1, "merchant_clean": str}.
Rules: output ONLY a JSON array. If unsure, use "Other" with confidence < 0.5. Never invent merchants.

Prior User Corrections (learn from these):
[{"raw_description": "UPI-994104052@paytm", "merchant": "Third Wave Coffee", "category": "Dining Out"}]

Transactions:
[
  {"id": 142, "description": "MISC RETAIL STORE BLR", "amount": 450.0}
]
```

### Few-Shot Learning Loop (The App "Learns")
When a transaction has confidence $< 0.70$, it is routed to the **Swipe Review** stack. When the user corrects a category, that mapping is committed to the `UserCorrection` database table and automatically injected into subsequent batch prompts as dynamic few-shot context.

---

## 2. Anomaly Detection & Grounded Explanations

### Overview
Rather than asking an LLM to guess what looks anomalous, Rupee Radar utilizes **scikit-learn's `IsolationForest`** trained on multidimensional features:
1. Transaction amount
2. Category label encoding
3. Day of week ($0-6$)
4. Historical merchant transaction frequency

In parallel, a deterministic 48-hour window detector identifies duplicate charges with identical amounts and merchants.

### LLM Role in Anomalies
The LLM is invoked only to produce a punchy, grounded **one-sentence natural-language explanation** for flagged anomalies:

```
Explain this flagged financial anomaly in 1 punchy, grounded sentence for an Indian user.
Transaction: {"amount": 18000.0, "category": "Shopping", "merchant": "Croma Electronics"}
Context: {"category_median": 1200.0, "deviation_ratio": 4.8}
Rule: Max 20 words. State the exact rupee amount and reason for flag.
```

**Example Output:**
> *"Large single expenditure of ₹18,000 on electronics, which is 4.8x above your average discretionary shopping."*

---

## 3. Grounded Financial Recommendations

### Overview
The AI Financial Coach never invents figures or gives risky speculative stock advice. It receives pre-computed metrics and identifies high-impact behavioral optimizations (e.g. unused subscriptions, weekend delivery spikes).

### Prompt Template
```
You are a friendly, practical financial coach for a young Indian professional.
Use ONLY the numbers in the JSON below. Do not invent figures. Do not give stock tips.
Return JSON: {"headline": str, "insights": [{"title": str, "detail": str, "monthly_saving_inr": int, "difficulty": "easy|medium|hard"}], "one_challenge": str}
Max 4 insights, each actionable and specific (name the category/merchant and the rupee amount).
Data: {
  "current_month_income": 65000,
  "current_month_expense": 34500,
  "savings_rate_pct": 46.9,
  "daily_burn_rate": 1150.0,
  "recurring_subscriptions": [{"merchant": "Fitpass", "avg_amount": 2500, "is_unused_alert": true}]
}
```

---

## 4. Goal Planner & Budget Trimming

### Overview
When a user sets a target (e.g. ₹1,20,000 for a laptop in 4 months), code calculates the exact monthly required savings:
$$\text{Required Monthly Saving} = \frac{\text{Target} - \text{Current}}{\text{Months Remaining}}$$

The LLM is given the user's active category burn rate and is tasked with proposing category cuts whose sum **strictly equals** the target savings figure:

```
A user needs to save ₹18,750 extra per month.
Their current category spending:
[{"category": "Food Delivery", "amount": 6200}, {"category": "Dining Out", "amount": 5400}, {"category": "Subscriptions", "amount": 3767}]

Suggest 3 specific categories to trim. The cuts must sum exactly to ₹18,750.
Return JSON list: [{"category": str, "monthly_cut": int, "action": str}]
```

---

## 5. "Ask Your Money" Natural Language Query Translation

### Overview
Users ask unstructured conversational questions like *"How much did I spend on food last month?"* or *"What was my biggest expense?"*.

### Flow
1. **Semantic Parsing:** The LLM converts the natural query into a rigid database filter specification:
   ```json
   {
     "category": "Food Delivery",
     "aggregation": "sum",
     "time_frame": "last_month",
     "type": "debit"
   }
   ```
2. **Deterministic Execution:** The Python query engine filters SQLite/pandas rows and computes the mathematical aggregate (e.g., `value: 4200.0, count: 8`).
3. **Conversational Synthesis:** The LLM receives the computed numbers and crafts a pleasant, natural response for the chat UI.
4. **Explainability Transparency:** The UI displays an expandable **"AI Query Spec"** badge directly under each chat bubble so examiners can inspect the underlying query JSON.

