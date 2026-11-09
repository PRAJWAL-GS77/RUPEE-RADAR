import sys
import os
from pathlib import Path

# Add project root to sys.path so 'backend.app' imports succeed
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import random
from datetime import datetime, timedelta, date
from sqlmodel import Session, select, delete
from backend.app.database import engine, init_db
from backend.app.models import Transaction, Goal, DailyChallenge, UserStreak, UserCorrection
from backend.app.rules import categorize_by_rule

def generate_seed_data(force: bool = False):
    init_db()
    
    with Session(engine) as session:
        if force:
            print("Force re-seed requested. Clearing existing records...")
            session.exec(delete(Transaction))
            session.exec(delete(Goal))
            session.exec(delete(DailyChallenge))
            session.exec(delete(UserStreak))
            session.exec(delete(UserCorrection))
            session.commit()
        else:
            # Check if already seeded
            existing = session.exec(select(Transaction)).first()
            if existing:
                print("Database already contains transactions. Skipping re-seed.")
                return

        print("Seeding 6 months of realistic Indian financial data (~300 transactions)...")

        # Use current date as reference, span back 180 days (6 months)
        today = date.today()
        start_date = today - timedelta(days=180)

        transactions = []

        # 1. Monthly Fixed Transactions across the 6 months (Months 0 to 5)
        # Generate month start dates
        month_starts = []
        cur_m = date(start_date.year, start_date.month, 1)
        while cur_m <= today:
            month_starts.append(cur_m)
            # advance one month
            next_month = cur_m.month + 1 if cur_m.month < 12 else 1
            next_year = cur_m.year if cur_m.month < 12 else cur_m.year + 1
            cur_m = date(next_year, next_month, 1)

        for m_start in month_starts:
            # Salary credit on the 1st
            if m_start <= today:
                transactions.append(Transaction(
                    date=m_start.strftime("%Y-%m-%d"),
                    description="SALARY CREDIT - INFOSYS TECHNOLOGIES LTD",
                    amount=65000.0,
                    type="credit",
                    category="Income",
                    category_source="rule",
                    confidence=0.98,
                    merchant_clean="Infosys Technologies",
                    is_reviewed=True
                ))

            # House rent on 5th
            rent_d = m_start + timedelta(days=4)
            if rent_d <= today:
                transactions.append(Transaction(
                    date=rent_d.strftime("%Y-%m-%d"),
                    description="RENT NOBROKER PAY BANGALORE",
                    amount=18000.0,
                    type="debit",
                    category="Rent",
                    category_source="rule",
                    confidence=0.95,
                    merchant_clean="NoBroker Rent",
                    is_reviewed=True,
                    is_recurring=True
                ))

            # HDFC Personal Loan / EMI on 10th
            emi_d = m_start + timedelta(days=9)
            if emi_d <= today:
                transactions.append(Transaction(
                    date=emi_d.strftime("%Y-%m-%d"),
                    description="HDFC EMI LOAN AUTO-DEBIT 4/24",
                    amount=6450.0,
                    type="debit",
                    category="EMI/Loans",
                    category_source="rule",
                    confidence=0.95,
                    merchant_clean="HDFC Bank Loan",
                    is_reviewed=True,
                    is_recurring=True
                ))

            # BESCOM electricity bill around 8th
            util_d = m_start + timedelta(days=7)
            if util_d <= today:
                transactions.append(Transaction(
                    date=util_d.strftime("%Y-%m-%d"),
                    description="BESCOM ELECTRICITY BILL BBMP",
                    amount=round(random.uniform(1450.0, 1950.0), 2),
                    type="debit",
                    category="Utilities",
                    category_source="rule",
                    confidence=0.95,
                    merchant_clean="Bescom Electricity",
                    is_reviewed=True,
                    is_recurring=True
                ))

            # Airtel broadband around 14th
            wifi_d = m_start + timedelta(days=13)
            if wifi_d <= today:
                transactions.append(Transaction(
                    date=wifi_d.strftime("%Y-%m-%d"),
                    description="AIRTEL BROADBAND FIBER 200MBPS",
                    amount=1179.0,
                    type="debit",
                    category="Utilities",
                    category_source="rule",
                    confidence=0.95,
                    merchant_clean="Airtel Fiber",
                    is_reviewed=True,
                    is_recurring=True
                ))

            # Netflix subscription on 18th
            nf_d = m_start + timedelta(days=17)
            if nf_d <= today:
                transactions.append(Transaction(
                    date=nf_d.strftime("%Y-%m-%d"),
                    description="NETFLIX.COM BANGALORE IN",
                    amount=649.0,
                    type="debit",
                    category="Subscriptions",
                    category_source="rule",
                    confidence=0.98,
                    merchant_clean="Netflix",
                    is_reviewed=True,
                    is_recurring=True
                ))

            # Spotify on 20th
            spot_d = m_start + timedelta(days=19)
            if spot_d <= today:
                transactions.append(Transaction(
                    date=spot_d.strftime("%Y-%m-%d"),
                    description="SPOTIFY INDIA RECURRING SUB",
                    amount=119.0,
                    type="debit",
                    category="Subscriptions",
                    category_source="rule",
                    confidence=0.98,
                    merchant_clean="Spotify",
                    is_reviewed=True,
                    is_recurring=True
                ))

            # UNUSED SUBSCRIPTION 1: Gym Fitpass ₹2,500/mo
            fit_d = m_start + timedelta(days=2)
            if fit_d <= today:
                transactions.append(Transaction(
                    date=fit_d.strftime("%Y-%m-%d"),
                    description="GYM MEMBERSHIP FITPASS PASS AUTO-PAY",
                    amount=2500.0,
                    type="debit",
                    category="Subscriptions",
                    category_source="rule",
                    confidence=0.95,
                    merchant_clean="Fitpass",
                    is_reviewed=True,
                    is_recurring=True
                ))

            # UNUSED SUBSCRIPTION 2: Magzter Digital Magazine ₹499/mo
            mag_d = m_start + timedelta(days=11)
            if mag_d <= today:
                transactions.append(Transaction(
                    date=mag_d.strftime("%Y-%m-%d"),
                    description="MAGZTER DIGITAL GOLD SUBSCRIPTION",
                    amount=499.0,
                    type="debit",
                    category="Subscriptions",
                    category_source="rule",
                    confidence=0.95,
                    merchant_clean="Magzter",
                    is_reviewed=True,
                    is_recurring=True
                ))

        # 2. Occasional Freelance Income (3-4 occurrences over 6 months)
        freelance_dates = [
            start_date + timedelta(days=25),
            start_date + timedelta(days=78),
            start_date + timedelta(days=132),
            start_date + timedelta(days=165)
        ]
        for f_date in freelance_dates:
            if f_date <= today:
                transactions.append(Transaction(
                    date=f_date.strftime("%Y-%m-%d"),
                    description="UPWORK ESCROW CLIENT PAYOUT TECH CONSULTING",
                    amount=random.choice([12500.0, 15000.0, 18000.0]),
                    type="credit",
                    category="Income",
                    category_source="rule",
                    confidence=0.95,
                    merchant_clean="Freelance Payout",
                    is_reviewed=True
                ))

        # 3. Discretionary Daily Transactions (Food, Groceries, Transport, Shopping, Fuel, etc.)
        # Realistic merchant pools
        food_pool = [
            ("SWIGGY*ORDER 4421", "Food Delivery", 0.95, "Swiggy", (280, 720)),
            ("UPI-ZOMATO-9912@ybl", "Food Delivery", 0.95, "Zomato", (320, 890)),
            ("SWIGGY*ORDER 8812 RESTAURANT", "Food Delivery", 0.95, "Swiggy", (450, 1100)),
            ("THIRD WAVE COFFEE ROASTERS INDIRANAGAR", "Dining Out", 0.90, "Third Wave Coffee", (290, 650)),
            ("TOIT BREWPUB BANGALORE", "Dining Out", 0.90, "Toit Brewpub", (1800, 3400)),
            ("STARBUCKS KORAMANGALA BLR", "Dining Out", 0.90, "Starbucks", (420, 850)),
        ]

        grocery_pool = [
            ("BLINKIT 10MIN GROCERY ORDER", "Groceries", 0.95, "Blinkit", (240, 950)),
            ("ZEPTO INSTANT GROCERY BLR", "Groceries", 0.95, "Zepto", (180, 850)),
            ("DMART SUPERMARKET WHITEFIELD", "Groceries", 0.92, "DMart Supermarket", (1800, 4200)),
            ("NATURES BASKET ORGANIC", "Groceries", 0.92, "Nature's Basket", (850, 2100)),
        ]

        transport_fuel_pool = [
            ("UBER INDIA BLR TRIP", "Transport", 0.95, "Uber", (160, 450)),
            ("RAPIDO BIKE TAXI AUTO", "Transport", 0.95, "Rapido", (55, 140)),
            ("NANDI METRO SMART CARD RECHARGE", "Transport", 0.95, "Bangalore Metro", (200, 500)),
            ("HPCL FUEL PUMP INDIRANAGAR", "Fuel", 0.95, "HPCL Fuel Station", (800, 2200)),
            ("SHELL PETROL STATION WHITEFIELD", "Fuel", 0.95, "Shell Fuel Station", (1200, 2500)),
        ]

        shopping_ent_pool = [
            ("AMZN PAY IN RETAIL ORDER", "Shopping", 0.95, "Amazon India", (499, 2899)),
            ("MYNTRA FASHION WEAR BLR", "Shopping", 0.92, "Myntra", (1299, 3999)),
            ("BOOKMYSHOW PVR GOLD IMAX", "Entertainment", 0.95, "BookMyShow", (750, 1600)),
            ("APOLLO PHARMACY INDIRANAGAR", "Health", 0.95, "Apollo Pharmacy", (250, 1150)),
            ("ATM WDL BLR HDFC CASH", "Cash Withdrawal", 0.95, "ATM Cash Withdrawal", (2000, 5000)),
        ]

        # Low confidence items intentionally crafted for Swipe Review (< 0.70 confidence)
        low_confidence_pool = [
            ("UPI/938210384721/PAYMENT", "Other", 0.45, "UPI Merchant", (180, 850)),
            ("MISC RETAIL STORE BLR", "Other", 0.40, "Local Store", (340, 1450)),
            ("QR-CODE SCAN SHOP 109", "Other", 0.42, "Small Business", (95, 450)),
            ("TXN-PAYTM-REF-992384", "Other", 0.38, "Paytm Merchant", (220, 1100)),
            ("RAZORPAY*SUB88231 BLR", "Other", 0.50, "Online Service", (499, 1200)),
            ("BILLDESK BILL PAYMENT VENDOR", "Utilities", 0.60, "Billdesk", (350, 1250)),
            ("KHATA APP PAYMENT 44", "Groceries", 0.55, "Neighborhood Kirana", (180, 750)),
            ("COFFEE CORNER KIOSK", "Dining Out", 0.65, "Street Kiosk", (80, 220)),
        ]

        # Distribute daily items across the 180 days (~1.2 transactions per day)
        current_day = start_date
        while current_day <= today:
            # 1 to 2 discretionary txns on weekdays, 2 to 4 on weekends
            is_weekend = current_day.weekday() >= 5
            count = random.randint(2, 4) if is_weekend else random.randint(0, 2)
            
            for _ in range(count):
                roll = random.random()
                if roll < 0.40:
                    desc, cat, conf, merch, (low_amt, high_amt) = random.choice(food_pool)
                elif roll < 0.65:
                    desc, cat, conf, merch, (low_amt, high_amt) = random.choice(grocery_pool)
                elif roll < 0.85:
                    desc, cat, conf, merch, (low_amt, high_amt) = random.choice(transport_fuel_pool)
                else:
                    desc, cat, conf, merch, (low_amt, high_amt) = random.choice(shopping_ent_pool)

                amt = round(random.uniform(low_amt, high_amt), 2)
                transactions.append(Transaction(
                    date=current_day.strftime("%Y-%m-%d"),
                    description=desc,
                    amount=amt,
                    type="debit",
                    category=cat,
                    category_source="rule",
                    confidence=conf,
                    merchant_clean=merch,
                    is_reviewed=True
                ))

            # Occasionally add a low confidence transaction for the swipe review queue (about 12 across 180 days, especially in recent weeks)
            if random.random() < 0.08:
                desc, cat, conf, merch, (low_amt, high_amt) = random.choice(low_confidence_pool)
                amt = round(random.uniform(low_amt, high_amt), 2)
                transactions.append(Transaction(
                    date=current_day.strftime("%Y-%m-%d"),
                    description=desc,
                    amount=amt,
                    type="debit",
                    category=cat,
                    category_source="ai",
                    confidence=conf,
                    merchant_clean=merch,
                    is_reviewed=False  # Low confidence items go to Swipe Review!
                ))

            current_day += timedelta(days=1)

        # 4. Deliberate Anomalies as requested by prompt:
        # Anomaly 1: A ₹18,000 electronics purchase (e.g. 45 days ago)
        anomaly_1_date = (today - timedelta(days=45)).strftime("%Y-%m-%d")
        transactions.append(Transaction(
            date=anomaly_1_date,
            description="CHROMA ELECTRONICS BANGALORE INDIRANAGAR",
            amount=18000.0,
            type="debit",
            category="Shopping",
            category_source="rule",
            confidence=0.92,
            merchant_clean="Croma Electronics",
            is_reviewed=True,
            is_anomaly=True,
            anomaly_reason="Unusually high discretionary purchase for electronics (4.8x category median)."
        ))

        # Anomaly 2: A duplicate charge within 48 hours (e.g. 20 days ago)
        dup_date_1 = (today - timedelta(days=20)).strftime("%Y-%m-%d")
        dup_date_2 = (today - timedelta(days=19)).strftime("%Y-%m-%d")
        transactions.append(Transaction(
            date=dup_date_1,
            description="AMZN PAY IN PRIME SHOPPING ORDER",
            amount=1499.0,
            type="debit",
            category="Shopping",
            category_source="rule",
            confidence=0.95,
            merchant_clean="Amazon India",
            is_reviewed=True,
            is_anomaly=False
        ))
        transactions.append(Transaction(
            date=dup_date_2,
            description="AMZN PAY IN PRIME SHOPPING ORDER",
            amount=1499.0,
            type="debit",
            category="Shopping",
            category_source="rule",
            confidence=0.95,
            merchant_clean="Amazon India",
            is_reviewed=True,
            is_anomaly=True,
            anomaly_reason="Potential duplicate charge: exact same amount ₹1,499.00 and merchant within 24 hours."
        ))

        # Anomaly 3: Spending spike in one weekend (e.g. 2 weeks ago)
        spike_sat = (today - timedelta(days=14)).strftime("%Y-%m-%d")
        spike_sun = (today - timedelta(days=13)).strftime("%Y-%m-%d")
        transactions.append(Transaction(
            date=spike_sat,
            description="TOIT BREWPUB CELEBRATION PARTY",
            amount=5400.0,
            type="debit",
            category="Dining Out",
            category_source="rule",
            confidence=0.90,
            merchant_clean="Toit Brewpub",
            is_reviewed=True,
            is_anomaly=True,
            anomaly_reason="Single dining expense exceeded typical dining threshold by 320%."
        ))
        transactions.append(Transaction(
            date=spike_sun,
            description="ZARA BRIGADE ROAD SHOPPING",
            amount=6200.0,
            type="debit",
            category="Shopping",
            category_source="rule",
            confidence=0.92,
            merchant_clean="Zara",
            is_reviewed=True,
            is_anomaly=True,
            anomaly_reason="Weekend spending spike: ₹11,600 spent within 48 hours."
        ))

        # Sort all transactions chronologically
        transactions.sort(key=lambda t: t.date)
        for t in transactions:
            session.add(t)

        # 5. Seed Goals
        laptop_goal = Goal(
            name="MacBook Pro M4 Fund",
            target_amount=120000.0,
            current_amount=45000.0,
            target_date=(today + timedelta(days=120)).strftime("%Y-%m-%d"),
            category_trims='[{"category": "Food Delivery", "monthly_cut": 2500}, {"category": "Dining Out", "monthly_cut": 2000}, {"category": "Subscriptions", "monthly_cut": 2999}]'
        )
        emergency_fund = Goal(
            name="3-Month Emergency Cushion",
            target_amount=150000.0,
            current_amount=85000.0,
            target_date=(today + timedelta(days=180)).strftime("%Y-%m-%d"),
            category_trims='[{"category": "Shopping", "monthly_cut": 3500}, {"category": "Subscriptions", "monthly_cut": 1500}]'
        )
        session.add(laptop_goal)
        session.add(emergency_fund)

        # 6. Seed Daily Challenge & User Streak
        challenge = DailyChallenge(
            date=today.strftime("%Y-%m-%d"),
            title="Cook at home today: Skip Swiggy & Zomato",
            potential_saving=450.0,
            completed=False
        )
        session.add(challenge)

        streak = UserStreak(
            current_streak=6,
            last_active_date=today.strftime("%Y-%m-%d"),
            streak_freeze_count=1
        )
        session.add(streak)

        # 7. Seed Initial Few-Shot User Corrections for AI learning
        session.add(UserCorrection(
            raw_description="UPI-994104052@paytm",
            merchant_clean="Third Wave Coffee",
            category="Dining Out"
        ))
        session.add(UserCorrection(
            raw_description="BILLDESK*BESCOM_BLR",
            merchant_clean="Bescom Electricity",
            category="Utilities"
        ))

        session.commit()
        print(f"Successfully seeded {len(transactions)} transactions, 2 goals, active streak, and challenge!")

if __name__ == "__main__":
    generate_seed_data()
