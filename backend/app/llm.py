import json
import re
from typing import List, Dict, Any, Optional
from backend.app.config import GEMINI_API_KEY, GEMINI_MODEL, MOCK_AI, CATEGORIES

NON_DISCRETIONARY_CATEGORIES = {"Rent", "EMI/Loans", "Utilities", "Income", "Transfers"}

# ----------------- Fallback / Mock Implementations -----------------

def _mock_batch_categorize(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Deterministic canned response for batch categorization."""
    results = []
    for item in items:
        desc = item.get("description", "").upper()
        item_id = item.get("id", 0)
        
        if "SWIGGY" in desc or "ZOMATO" in desc:
            cat, conf, merch = "Food Delivery", 0.95, "Swiggy / Zomato"
        elif "BLINKIT" in desc or "ZEPTO" in desc or "GROCERY" in desc or "DMART" in desc:
            cat, conf, merch = "Groceries", 0.95, "Quick Groceries"
        elif "UBER" in desc or "OLA" in desc or "RAPIDO" in desc or "METRO" in desc:
            cat, conf, merch = "Transport", 0.95, "Cab / Transit"
        elif "NETFLIX" in desc or "SPOTIFY" in desc or "PRIME" in desc:
            cat, conf, merch = "Subscriptions", 0.98, "Streaming Media"
        elif "BESCOM" in desc or "ELECTRICITY" in desc or "AIRTEL" in desc:
            cat, conf, merch = "Utilities", 0.95, "Utilities Bill"
        elif "CHROMA" in desc or "AMAZON" in desc or "ZARA" in desc or "RETAIL" in desc:
            cat, conf, merch = "Shopping", 0.90, "Retail Merchant"
        elif "TOIT" in desc or "COFFEE" in desc or "CAFE" in desc or "BAR" in desc:
            cat, conf, merch = "Dining Out", 0.90, "Cafe / Pub"
        elif "UPI/" in desc or "QR-CODE" in desc or "PAYTM" in desc:
            cat, conf, merch = "Other", 0.45, "Local Merchant"
        else:
            cat, conf, merch = "Other", 0.40, desc[:20].title()

        results.append({
            "id": item_id,
            "category": cat,
            "confidence": conf,
            "merchant_clean": merch
        })
    return results

def _mock_recommendations(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministic grounded financial coach recommendations.
    Built strictly from the real metrics dict. Max 4 insights.
    Every rupee figure is derived directly from the computed metrics.
    """
    savings = int(round(metrics.get("current_month_savings", 0)))
    savings_rate = metrics.get("savings_rate", 0.0)
    recurring = metrics.get("recurring_payments", [])
    breakdown = metrics.get("category_breakdown", [])
    projected = int(round(metrics.get("projected_month_end_spend", 0)))
    daily_burn = int(round(metrics.get("daily_burn_rate", 0)))

    headline = (
        f"Strong ₹{savings:,} savings run this month ({savings_rate}% savings rate)."
        if savings >= 0
        else f"Monthly spend exceeds income by ₹{abs(savings):,} ({savings_rate}% savings rate)."
    )

    insights: List[Dict[str, Any]] = []

    # 1. Unused or active recurring subscription insight
    unused_sub = next((r for r in recurring if r.get("is_unused_alert")), None)
    if unused_sub:
        avg_amt = int(round(unused_sub.get("avg_amount", 0)))
        ann_cost = int(round(unused_sub.get("annual_cost", avg_amt * 12)))
        insights.append({
            "title": f"Audit Unused {unused_sub.get('merchant', 'Subscription')} Subscription",
            "detail": f"{unused_sub.get('merchant', 'Service')} has recurring charges of ₹{avg_amt:,}/mo with no recent activity. Cancelling frees ₹{ann_cost:,} annually.",
            "monthly_saving_inr": avg_amt,
            "difficulty": "easy"
        })
    elif recurring:
        top_sub = recurring[0]
        avg_amt = int(round(top_sub.get("avg_amount", 0)))
        insights.append({
            "title": f"Review {top_sub.get('merchant', 'Recurring')} Membership",
            "detail": f"Active subscription at ₹{avg_amt:,}/mo. Review whether plan sharing or annual tiers offer savings.",
            "monthly_saving_inr": max(100, int(round(avg_amt * 0.2))),
            "difficulty": "easy"
        })

    # 2 & 3. Top discretionary category insights
    discretionary = [
        c for c in breakdown if c.get("category") not in NON_DISCRETIONARY_CATEGORIES and c.get("amount", 0) > 0
    ]

    for cat_item in discretionary[:2]:
        if len(insights) >= 4:
            break
        c_name = cat_item.get("category", "Discretionary")
        c_amt = int(round(cat_item.get("amount", 0)))
        c_pct = cat_item.get("percentage", 0.0)
        saving = max(150, int(round(c_amt * 0.25)))
        diff = "easy" if saving < 800 else "medium"
        insights.append({
            "title": f"Optimize {c_name} Spending",
            "detail": f"You spent ₹{c_amt:,} on {c_name} ({c_pct}% of monthly expenses). Trimming non-essential orders preserves ~₹{saving:,}/mo.",
            "monthly_saving_inr": saving,
            "difficulty": diff
        })

    # 4. Burn rate pacing insight if needed
    if len(insights) < 4 and daily_burn > 0:
        pace_saving = max(300, int(round(daily_burn * 2)))
        insights.append({
            "title": "Daily Burn Rate Target",
            "detail": f"Your current burn is ₹{daily_burn:,}/day with a projected month-end spend of ₹{projected:,}. Pacing discretionary spend frees up ₹{pace_saving:,}/mo.",
            "monthly_saving_inr": pace_saving,
            "difficulty": "medium"
        })

    # One challenge derived from top discretionary category
    if discretionary:
        top_c = discretionary[0]
        top_c_name = top_c.get("category")
        challenge_amt = max(100, int(round(top_c.get("amount", 500) / 10)))
        one_challenge = f"Cut back on {top_c_name} today: Save ~₹{challenge_amt:,} towards your monthly savings goal."
    else:
        one_challenge = "Review your discretionary subscriptions today to protect your savings rate."

    return {
        "headline": headline,
        "insights": insights[:4],
        "one_challenge": one_challenge
    }

def _mock_anomaly_explanation(txn: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> str:
    """
    Builds a grounded 1-sentence anomaly explanation using the transaction's own
    amount, category, merchant, and typical category amount.
    Format: "₹3,082 is 3.1x your usual Cash Withdrawal (₹980)."
    Does not repeat the category when merchant == category.
    """
    amount = float(txn.get("amount", 0))
    category = txn.get("category", "Discretionary")
    merchant = txn.get("merchant_clean") or txn.get("description", "Merchant")
    avg_amt = float(context.get("average_spend", 0)) if context else 0.0
    is_dup = bool(context.get("is_duplicate", False)) if context else False

    if is_dup or "duplicate" in str(txn.get("anomaly_reason", "")).lower():
        return f"Potential duplicate charge: ₹{amount:,.0f} at {merchant} within 48 hours of an identical transaction."

    # Avoid repeating category when merchant matches category
    m_clean = merchant.strip().lower()
    c_clean = category.strip().lower()
    if m_clean == c_clean or c_clean in m_clean:
        entity = merchant
    else:
        entity = f"{merchant} in {category}"

    if avg_amt > 0:
        ratio = round(amount / avg_amt, 1)
        return f"₹{amount:,.0f} is {ratio}x your usual {entity} (₹{avg_amt:,.0f})."

    return f"₹{amount:,.0f} at {entity} is an unusual spend for your account."

def _mock_goal_trims(target_monthly: float, categories: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Calculates category trims using real top discretionary categories.
    Each cut is capped at 60% of that category's spend.
    The sum of trims strictly equals round(target_monthly).
    """
    target = max(100, int(round(target_monthly)))
    
    # Filter real discretionary categories
    disc = []
    if categories:
        disc = [
            c for c in categories 
            if c.get("category") not in NON_DISCRETIONARY_CATEGORIES and c.get("amount", 0) > 0
        ]
        disc.sort(key=lambda x: x.get("amount", 0), reverse=True)

    # Fallback categories if none supplied
    if not disc:
        disc = [
            {"category": "Food Delivery", "amount": max(3000, round(target * 1.5))},
            {"category": "Dining Out", "amount": max(2500, round(target * 1.2))},
            {"category": "Shopping", "amount": max(2000, round(target * 1.0))},
        ]

    top3 = disc[:3]
    total_spend = sum(c.get("amount", 0) for c in top3)
    if total_spend <= 0:
        total_spend = 1.0

    raw_cuts = []
    for c in top3:
        spend = c.get("amount", 0)
        # Proportional share
        share = spend / total_spend
        cut = round(target * share)
        # Cap at 60% of category spend
        max_cut = round(spend * 0.60)
        cut = min(cut, max_cut)
        raw_cuts.append({
            "category": c.get("category"),
            "monthly_cut": int(max(10, cut)),
            "action": f"Reduce non-essential {c.get('category')} purchases"
        })

    # Adjust remainder on largest cut so sum strictly equals target
    current_sum = sum(item["monthly_cut"] for item in raw_cuts)
    diff = target - current_sum
    if raw_cuts:
        largest_idx = max(range(len(raw_cuts)), key=lambda i: raw_cuts[i]["monthly_cut"])
        raw_cuts[largest_idx]["monthly_cut"] += diff

    return raw_cuts

# ----------------- Lazy Gemini LLM Engine with Retry Helper -----------------

def call_gemini_json(prompt: str, schema_validator=None) -> Optional[Any]:
    """
    Calls Gemini API using google-genai.
    Parses JSON, validates against schema_validator, retries once with 'Return ONLY valid JSON',
    else returns None so caller can safely fall back.
    Imported lazily so mock mode never needs the package.
    """
    if MOCK_AI or not GEMINI_API_KEY:
        return None

    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as ex:
        print(f"[LLM] Error initializing google-genai: {ex}")
        return None

    for attempt in range(2):
        try:
            current_prompt = (
                prompt
                if attempt == 0
                else f"{prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown fences, no explanatory text."
            )
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=current_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )
            raw_text = response.text or ""
            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text.strip())
            raw_text = re.sub(r"\s*```$", "", raw_text.strip())
            parsed = json.loads(raw_text)
            if schema_validator:
                if schema_validator(parsed):
                    return parsed
            else:
                return parsed
        except Exception as e:
            if attempt == 1:
                print(f"[LLM] Error in call_gemini_json attempt {attempt + 1}: {e}")

    return None

def batch_categorize_llm(
    items: List[Dict[str, Any]], 
    few_shot_examples: Optional[List[Dict[str, str]]] = None
) -> List[Dict[str, Any]]:
    """
    Pass 2: Categorizes transactions in batches of 20 with strict JSON schema.
    """
    few_shot_str = ""
    if few_shot_examples:
        few_shot_str = "Prior User Corrections (learn from these):\n" + json.dumps(few_shot_examples, indent=2) + "\n\n"

    minimal_items = [{"id": it["id"], "description": it["description"], "amount": it.get("amount")} for it in items]
    batch_json = json.dumps(minimal_items, indent=2)

    prompt = f"""You are a transaction categorizer for an Indian personal finance app.
Categories: {', '.join(CATEGORIES)}.
For each transaction return: {{"id": int, "category": str, "confidence": 0-1, "merchant_clean": str}}.
Rules: output ONLY a JSON array. If unsure, use "Other" with confidence < 0.5. Never invent merchants.

{few_shot_str}Transactions:
{batch_json}
"""
    result = call_gemini_json(
        prompt, 
        schema_validator=lambda d: isinstance(d, list) or (isinstance(d, dict) and "transactions" in d)
    )
    if isinstance(result, list):
        return result
    if isinstance(result, dict) and "transactions" in result:
        return result["transactions"]

    return _mock_batch_categorize(items)

def generate_recommendations_llm(metrics_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Grounded financial coach recommendations.
    Receives ONLY computed numbers, never raw transactions or PII.
    """
    sanitized = {
        "current_month_income": metrics_json.get("current_month_income"),
        "current_month_expense": metrics_json.get("current_month_expense"),
        "current_month_savings": metrics_json.get("current_month_savings"),
        "savings_rate_pct": metrics_json.get("savings_rate"),
        "daily_burn_rate": metrics_json.get("daily_burn_rate"),
        "projected_month_end_spend": metrics_json.get("projected_month_end_spend"),
        "category_breakdown": metrics_json.get("category_breakdown", [])[:6],
        "recurring_subscriptions": metrics_json.get("recurring_payments", [])[:5]
    }

    prompt = f"""You are a friendly, practical financial coach for a young Indian professional.
Use ONLY the numbers in the JSON below. Do not invent figures. Do not give stock tips.
Return JSON: {{"headline": str, "insights": [{{"title": str, "detail": str, "monthly_saving_inr": int, "difficulty": "easy|medium|hard"}}], "one_challenge": str}}
Max 4 insights, each actionable and specific (name the category/merchant and the rupee amount).
Data: {json.dumps(sanitized, indent=2)}
"""
    result = call_gemini_json(
        prompt,
        schema_validator=lambda d: isinstance(d, dict) and "headline" in d and "insights" in d
    )
    if result:
        return result

    return _mock_recommendations(metrics_json)

def explain_anomaly_llm(txn: Dict[str, Any], context: Dict[str, Any]) -> str:
    """Generate a crisp 1-line explanation for a detected anomaly."""
    prompt = f"""Explain this flagged financial anomaly in 1 punchy, grounded sentence for an Indian user.
Transaction: {json.dumps(txn)}
Context: {json.dumps(context)}
Rule: Max 20 words. State the exact rupee amount and reason for flag (e.g., duplicate, spike, category outlier).
"""
    parsed = call_gemini_json(prompt)
    if isinstance(parsed, dict) and "explanation" in parsed:
        return parsed["explanation"]
    if isinstance(parsed, str):
        return parsed.strip().replace('"', '')

    return _mock_anomaly_explanation(txn, context)

def suggest_goal_trims_llm(target_monthly: float, categories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Proposes category budget trims that realistically sum up to target_monthly."""
    prompt = f"""A user needs to save ₹{target_monthly:,.0f} extra per month.
Their current category spending:
{json.dumps(categories, indent=2)}

Suggest 3 specific categories to trim. The cuts must sum exactly to ₹{target_monthly:,.0f}.
Return JSON list: [{{"category": str, "monthly_cut": int, "action": str}}]
"""
    result = call_gemini_json(prompt, schema_validator=lambda d: isinstance(d, list))
    if isinstance(result, list) and len(result) > 0:
        # Scale and fix remainder so sum strictly equals target_monthly
        target = int(round(target_monthly))
        curr_sum = sum(int(item.get("monthly_cut", 0)) for item in result)
        if curr_sum > 0:
            for item in result:
                item["monthly_cut"] = round(item.get("monthly_cut", 0) * (target / curr_sum))
            diff = target - sum(item["monthly_cut"] for item in result)
            result[0]["monthly_cut"] += diff
            return result

    return _mock_goal_trims(target_monthly, categories)

def parse_natural_language_transaction_llm(user_input: str) -> Dict[str, Any]:
    """
    Parses natural language like 'spent 450 on dinner with friends yesterday'
    into structured transaction fields.
    """
    from datetime import date, timedelta
    today_str = date.today().strftime("%Y-%m-%d")

    prompt = f"""Parse this natural language financial transaction into strict JSON.
User input: "{user_input}"
Today's date is: {today_str}
Valid categories: {', '.join(CATEGORIES)}.
Return JSON:
{{
  "date": "YYYY-MM-DD",
  "description": str,
  "amount": float,
  "type": "debit" | "credit",
  "category": str,
  "merchant_clean": str,
  "confidence": float
}}
"""
    result = call_gemini_json(prompt, schema_validator=lambda d: isinstance(d, dict) and "amount" in d)
    if result:
        result["category_source"] = "ai"
        return result

    # Smart regex fallback
    yesterday_str = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")
    amt_match = re.search(r"(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)", user_input, re.IGNORECASE)
    amount = float(amt_match.group(1).replace(",", "")) if amt_match else 250.0
    
    lowered = user_input.lower()
    tx_date = yesterday_str if "yesterday" in lowered else today_str

    if any(w in lowered for w in ["shoes", "clothes", "shirt", "pants", "dress", "shopping", "amazon", "flipkart", "myntra"]):
        category = "Shopping"
        merchant = "Shopping Retail"
        confidence = 0.90
    elif any(w in lowered for w in ["petrol", "diesel", "fuel", "hpcl", "bpcl", "shell"]):
        category = "Fuel"
        merchant = "Fuel Station"
        confidence = 0.90
    elif any(w in lowered for w in ["movie", "netflix", "prime", "hotstar", "game", "gaming", "pvr", "cinema"]):
        category = "Entertainment"
        merchant = "Entertainment"
        confidence = 0.90
    elif any(w in lowered for w in ["medicine", "doctor", "pharmacy", "apollo", "clinic", "hospital", "pharmeasy"]):
        category = "Health"
        merchant = "Health & Pharmacy"
        confidence = 0.85
    elif any(w in lowered for w in ["rent", "house rent", "flat rent"]):
        category = "Rent"
        merchant = "House Rent"
        confidence = 0.95
    elif any(w in lowered for w in ["train", "flight", "bus", "irctc", "indigo", "air india", "ticket"]):
        category = "Travel"
        merchant = "Travel Booking"
        confidence = 0.90
    elif any(w in lowered for w in ["dinner", "lunch", "coffee", "restaurant", "cafe", "food", "eat", "swiggy", "zomato"]):
        category = "Dining Out" if any(w in lowered for w in ["dinner", "lunch", "restaurant", "cafe", "coffee"]) else "Food Delivery"
        merchant = "Dining Outlet"
        confidence = 0.85
    elif any(w in lowered for w in ["uber", "cab", "auto", "metro", "rapido", "ola"]):
        category = "Transport"
        merchant = "City Transport"
        confidence = 0.85
    elif any(w in lowered for w in ["grocery", "milk", "vegetables", "blinkit", "zepto", "dmart"]):
        category = "Groceries"
        merchant = "Grocery Store"
        confidence = 0.85
    else:
        category = "Other"
        merchant = "Merchant"
        confidence = 0.50

    return {
        "date": tx_date,
        "description": user_input[:40].title(),
        "amount": amount,
        "type": "debit",
        "category": category,
        "merchant_clean": merchant,
        "confidence": confidence,
        "category_source": "ai"
    }

def parse_chat_query_to_spec_llm(user_query: str) -> Dict[str, Any]:
    """
    Translates natural language questions into a structured database query spec.
    Handles greetings, specific intents (balance, latest transaction), and unrecognized queries.
    """
    q = user_query.strip().lower()
    
    # Check for greetings or non-spending conversational questions
    greetings = {"hi", "hello", "hey", "namaste", "what can you do", "help", "who are you", "thanks", "thank you"}
    if q in greetings or any(q.startswith(g) for g in ["hi ", "hello ", "hey "]):
        return {
            "intent": "greeting",
            "category": None,
            "aggregation": "greeting",
            "time_frame": "all_time",
            "type": "debit"
        }

    # Off-topic / generic investment queries that are not in user transaction data
    off_topic_words = ["investing", "invest", "stocks", "stock", "mutual fund", "mutual funds", "crypto", "bitcoin", "shares", "trading", "sip"]
    if any(w in q for w in off_topic_words):
        return {
            "intent": "unrecognized",
            "category": None,
            "aggregation": "unrecognized",
            "time_frame": "all_time",
            "type": "debit"
        }

    # Balance / Remaining / Left / Savings Intent
    balance_words = ["left with", "left", "remaining", "balance", "money i have", "how much money left", "savings this month"]
    if any(w in q for w in balance_words):
        return {
            "intent": "balance",
            "category": None,
            "aggregation": "balance",
            "time_frame": "current_month",
            "type": None
        }

    # Latest / Last expense transaction intent
    latest_words = ["last expense", "latest expense", "last transaction", "latest transaction", "recent transaction", "recent expense", "last debit", "latest debit"]
    if any(w in q for w in latest_words):
        return {
            "intent": "latest_transaction",
            "category": None,
            "aggregation": "latest",
            "time_frame": "all_time",
            "type": "debit"
        }

    prompt = f"""Convert this user financial question into a structured DB query spec.
Question: "{user_query}"
Categories: {', '.join(CATEGORIES)}.
Aggregations: "sum", "average", "count", "max", "min", "list".
Time frames: "current_month", "last_month", "last_7_days", "all_time".

Return JSON:
{{
  "category": str | null,
  "merchant": str | null,
  "aggregation": "sum" | "average" | "count" | "max" | "min" | "list",
  "time_frame": "current_month" | "last_month" | "last_7_days" | "all_time",
  "type": "debit" | "credit"
}}
"""
    result = call_gemini_json(prompt, schema_validator=lambda d: isinstance(d, dict) and ("aggregation" in d or "time_frame" in d))
    if result:
        return result

    # Deterministic keyword rule parser fallback
    category = None
    for cat in CATEGORIES:
        if cat.lower() in q:
            category = cat
            break
    if not category:
        if "food" in q or "zomato" in q or "swiggy" in q:
            category = "Food Delivery"
        elif "grocer" in q or "zepto" in q or "blinkit" in q:
            category = "Groceries"
        elif "transport" in q or "uber" in q or "cab" in q:
            category = "Transport"
        elif "subscription" in q or "netflix" in q:
            category = "Subscriptions"
        elif "shopping" in q or "amazon" in q or "shoes" in q or "clothes" in q:
            category = "Shopping"
        elif "petrol" in q or "fuel" in q:
            category = "Fuel"
        elif "rent" in q:
            category = "Rent"

    # If no category or recognized financial inquiry found, mark as unrecognized (do not return fallback total)
    financial_keywords = ["spend", "spent", "cost", "paid", "buy", "bought", "expense", "expenses", "transactions", "orders", "how much", "how many", "highest", "average", "total"]
    if not category and not any(w in q for w in financial_keywords):
        return {
            "intent": "unrecognized",
            "category": None,
            "aggregation": "unrecognized",
            "time_frame": "all_time",
            "type": "debit"
        }

    aggregation = "sum"
    if "how many" in q or "count" in q:
        aggregation = "count"
    elif "average" in q or "avg" in q:
        aggregation = "average"
    elif "highest" in q or "max" in q or "biggest" in q:
        aggregation = "max"
    elif "list" in q or "show" in q or "what did" in q:
        aggregation = "list"

    # Default period to current_month unless user said "all time" / "total"
    if any(w in q for w in ["all time", "all-time", "total", "ever", "in total", "overall"]):
        time_frame = "all_time"
    elif "last month" in q:
        time_frame = "last_month"
    elif "last week" in q or "last 7 days" in q or "past week" in q:
        time_frame = "last_7_days"
    else:
        time_frame = "current_month"

    return {
        "category": category,
        "aggregation": aggregation,
        "time_frame": time_frame,
        "type": "debit" if "salary" not in q and "income" not in q else "credit"
    }

def phrase_chat_answer_llm(user_query: str, query_spec: Dict[str, Any], result: Dict[str, Any]) -> str:
    """
    Phrases the calculated database result into a natural, conversational response.
    Handles greetings, specific intents (balance, latest transaction), unrecognized queries, and empty results plainly.
    """
    intent = query_spec.get("intent")
    agg = query_spec.get("aggregation", "sum")

    if intent == "greeting" or agg == "greeting":
        return (
            "Hello! I'm Rupee Radar's AI financial copilot. Ask me questions about your spending patterns, like:\n"
            "• 'How much did I spend on food this month?'\n"
            "• 'What was my highest shopping expense?'\n"
            "• 'How much money do I have left this month?'"
        )

    if intent == "unrecognized" or agg == "unrecognized":
        return (
            "I can only answer questions about your own transactions, for example:\n"
            "• 'How much did I spend on food this month?'\n"
            "• 'What was my highest shopping expense?'\n"
            "• 'How much money do I have left this month?'"
        )

    if intent == "balance" or agg == "balance":
        val = result.get("value", 0.0)
        inc = result.get("income", 0.0)
        exp = result.get("expense", 0.0)
        period = result.get("period", "this month")
        return f"For {period}, you have **₹{val:,.2f}** remaining (income of **₹{inc:,.2f}** minus expenses of **₹{exp:,.2f}**)."

    if intent == "latest_transaction" or agg == "latest":
        item = result.get("top_item", {})
        val = result.get("value", 0.0)
        merch = item.get("merchant_clean") or item.get("description", "Unknown merchant")
        cat = item.get("category", "Expense")
        dt = item.get("date", "recently")
        return f"Your latest expense was **₹{val:,.2f}** for **{merch}** ({cat}) on {dt}."

    count = result.get("count", 0)
    cat = query_spec.get("category")
    raw_tf = query_spec.get("time_frame", "current_month")
    tf_text = "this month" if raw_tf == "current_month" else ("all time" if raw_tf == "all time" else raw_tf.replace("_", " "))
    val = result.get("value", 0.0)

    # Empty result handling
    if count == 0:
        if cat:
            return f"You had no recorded transactions for **{cat}** during {tf_text}."
        return "I couldn't find any matching transactions for that question. Try asking about categories like Food Delivery, Dining Out, Groceries, or Subscriptions."

    # Prompt Gemini if available
    prompt = f"""You are Rupee Radar's AI financial assistant.
User asked: "{user_query}"
Query executed: {json.dumps(query_spec)}
Real database result: {json.dumps(result)}

State the computed answer directly in 1-2 friendly sentences. Use ₹ for currency. Do not invent any numbers.
"""
    parsed = call_gemini_json(prompt)
    if isinstance(parsed, dict) and "answer" in parsed:
        return parsed["answer"]
    if isinstance(parsed, str) and len(parsed.strip()) > 5:
        return parsed.strip()

    # Deterministic formatting
    display_cat = cat or "all categories"
    if agg == "count":
        return f"You had **{val}** transactions in **{display_cat}** during {tf_text}."
    elif agg in ["sum", "total"]:
        return f"You spent **₹{val:,.2f}** on **{display_cat}** during {tf_text} across {count} transactions."
    elif agg in ["average", "avg"]:
        return f"Your average spend for **{display_cat}** during {tf_text} was **₹{val:,.2f}** per transaction."
    elif agg == "max":
        item = result.get("top_item", {})
        return f"Your highest transaction in **{display_cat}** was **₹{val:,.2f}** ({item.get('description', 'Unknown')}) on {item.get('date')}."
    elif agg == "list":
        items = result.get("items", [])
        items_str = ", ".join([f"₹{it.get('amount', 0):,.0f} at {it.get('description', '')[:15]}" for it in items[:4]])
        return f"Here are your recent {display_cat} transactions ({tf_text}): {items_str}."
    
    return f"Based on your transaction records for {tf_text}, the {agg} for {display_cat} is **₹{val:,.2f}**."
