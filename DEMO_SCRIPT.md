# Rupee Radar: 5-Minute College Presentation Walkthrough

Use this battle-tested script to deliver an engaging, high-scoring live demo of **Rupee Radar** for your "AI for Finance" course evaluation.

---

## ⏱️ Timeline Overview

| Minute | Screen / Feature | Key Talking Points |
| :---: | :--- | :--- |
| **0:00 - 1:00** | **Home ("Today")** | Problem statement (Indian UPI/EMI spending), Money Score ring, Safe-to-Spend pacing, Daily Streak |
| **1:00 - 2:00** | **Swipe Review** | Tinder-style card stack, Pass 1 Rules vs Pass 2 LLM, Few-Shot AI learning loop, Inbox Zero celebration |
| **2:00 - 3:00** | **Insights & Anomalies** | Interactive Recharts donut filter, IsolationForest outliers, 48h duplicate detection, Subscription audit |
| **3:00 - 4:00** | **Goals Planner** | Liquid-fill progress meter, milestone confetti, AI category trim optimizer summing to target |
| **4:00 - 4:45** | **"Ask Your Money" Chat** | Natural language to structured query spec, zero math hallucinations, explainability badge |
| **4:45 - 5:00** | **Natural Language Add** | Bottom sheet quick-parse ("spent 450 on dinner with friends yesterday") |

---

## 🎤 Minute-by-Minute Script

### Minute 0:00 - 1:00: Introduction & The "Today" Dashboard
> *"Good morning professors. Today we are presenting **Rupee Radar**, an AI personal finance management platform built specifically for Indian financial realities—characterized by high-frequency UPI micropayments, heavy food delivery, recurring digital subscriptions, and fixed monthly EMIs.*
>
> *(Point to the Home screen)*
> *Notice our core philosophy: **AI should be explainable, visible, and delightful**.
> At the center is our **Money Score (0-100)**. Unlike black-box credit scores, this is computed with pandas from four grounded factors: savings rate, daily burn rate pacing, subscription efficiency, and anomaly frequency.
> Right next to it is our **Safe-to-Spend Today** metric (₹1,420/day), calculated dynamically by projecting fixed commitments against current burn.
> Below, we have our **Daily AI Micro-Challenge**: 'Cook at home today: Skip Swiggy & save ~₹450'. Watch what happens when I mark it done..."*
> *(Click 'Mark Done' -> Confetti triggers!)*

---

### Minute 1:00 - 2:00: Hybrid Categorization & Swipe Review
> *"Now let's address the biggest pain point in Indian finance: messy UPI SMS descriptions like `SWIGGY*ORDER 4421` or `UPI-ZOMATO-9912@ybl`.*
>
> *We implemented a **Two-Pass Hybrid Architecture**:*
> 1. *Pass 1 uses fast regex rules for known merchants.*
> 2. *Pass 2 batches ambiguous transactions in chunks of 20 to Gemini 1.5 Flash.*
>
> *Notice this banner: **'8 Transactions in Swipe Review'**. Whenever the AI has confidence below 0.70, it doesn't guess—it presents a Tinder-style review stack.*
> *(Navigate to /review)*
> *Let's swipe right on this merchant to confirm... now watch: if I drag left, I can select a different category.*
> *Crucially: **the app learns from the user**. Every correction is saved to our SQLite `UserCorrection` table and injected as few-shot context into subsequent LLM prompts.*
> *(Swipe through the remaining cards to trigger 'Inbox Zero' celebration with confetti!)*"

---

### Minute 2:00 - 3:00: Deep Insights & Machine Learning Anomalies
> *(Navigate to /insights)*
> *"On the Insights screen, we bring together quantitative analytics and unsupervised machine learning.*
>
> *First, our **Category Breakdown Donut**: If I click on the 'Food Delivery' slice, observe how the transaction feed below immediately filters to only Swiggy and Zomato orders.*
>
> *Second, scroll to **Flagged Anomalies**. Here, we use **scikit-learn's IsolationForest** trained on transaction amount, category codes, day of week, and merchant frequency. Notice it caught a ₹18,000 Croma electronics purchase that deviated 4.8x from median shopping.*
> *In parallel, our 48-hour duplicate detector caught an accidental duplicate Amazon order of ₹1,499.*
> *Each flag receives a concise, grounded one-line AI explanation.*
>
> *Finally, our **Subscription Audit**: It flagged two zombie subscriptions—Fitpass Gym (₹2,500/month) and Magzter Digital (₹499/month) with zero activity. With one tap on 'Mark Cancelled', we free up ₹36,000 in annual savings."*

---

### Minute 3:00 - 4:00: Liquid-Fill Goals & AI Trimming
> *(Navigate to /goals)*
> *"Next is our Goal Planner. Let's look at our 'MacBook Pro M4 Fund'.*
> *Notice the animated **liquid-fill progress bar** and milestone flags at 25, 50, 75, and 100%.*
> *When we set this goal, the backend computed the required monthly saving of ₹18,750.*
> *We then passed only the category burn rates to Gemini, asking it to propose realistic category trims. Notice the three recommendations: trim Food Delivery by ₹2,500, Dining Out by ₹2,000, and Subscriptions by ₹2,999.*
> *The AI recommendations strictly sum to the required monthly target—zero hallucinated math.*
> *(Click '+ ₹5,000' to show optimistic progress update and celebration)*"

---

### Minute 4:00 - 5:00: "Ask Your Money" & Explainable Chat
> *(Navigate to /ask)*
> *"Our capstone feature is **'Ask Your Money'**.*
> *Many finance apps let LLMs compute answers, leading to hallucinations. In Rupee Radar, **the LLM is forbidden from doing arithmetic**.*
>
> *Let's click this chip: **'How much did I spend on food last month?'**.*
> *(Send the message and wait 1 second for response)*
> *Notice the answer: 'You spent ₹4,200 on Food Delivery during last month across 8 transactions.'*
>
> *Now, look at this badge below the bubble: **'AI Query Spec (Explainability)'**. If I expand it, you can see the exact JSON query specification generated by Gemini: `{ category: 'Food Delivery', time_frame: 'last_month', aggregation: 'sum' }`, followed by the exact database result returned by Python.*
> *This guarantees 100% mathematical accuracy with complete auditability.*
>
> *To conclude, let's open the **Add Transaction** modal from the header and type:*
> `'spent 450 on dinner with friends yesterday'*
> *(Click 'Parse' -> show pre-filled ₹450, Dining Out, yesterday's date, 90% confidence)*
>
> *Rupee Radar delivers grounded AI, delightful UX, and genuine financial empowerment for Indian users. Thank you, and we'd be glad to take your questions."*

