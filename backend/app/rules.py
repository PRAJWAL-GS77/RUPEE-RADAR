import re
from typing import Optional, Tuple

# Mapping of keywords / regex patterns to (Category, Default Merchant Name, Confidence)
RULE_PATTERNS = [
    # Income
    (r"(?i)\b(salary|salary credit|monthly payroll|acme corp|infosys payroll|tcs salary)\b", "Income", "Employer Payroll", 0.98),
    (r"(?i)\b(freelance|consulting fee|client payout|upwork|fiverr payout)\b", "Income", "Freelance Client", 0.95),
    (r"(?i)\b(dividend|interest credited|fd interest|cashback)\b", "Income", "Bank Interest / Return", 0.90),

    # Food Delivery
    (r"(?i)\b(swiggy|swiggy\*order|swiggy instamart food)\b", "Food Delivery", "Swiggy", 0.95),
    (r"(?i)\b(zomato|upi-zomato|zomato delivery)\b", "Food Delivery", "Zomato", 0.95),
    (r"(?i)\b(eatsure|faasos|behrouz|box8|dominos|pizza hut)\b", "Food Delivery", "Food Delivery Outlet", 0.92),

    # Dining Out
    (r"(?i)\b(cafe|bistro|brewery|bar & kitchen|toit|social|starbucks|third wave|costa coffee|restobar|restaurant)\b", "Dining Out", "Cafe & Dining", 0.90),

    # Groceries
    (r"(?i)\b(blinkit|zepto|instamart|bigbasket|bbdaily|dunzo daily)\b", "Groceries", "Quick Commerce Grocery", 0.95),
    (r"(?i)\b(dmart|more retail|reliance fresh|nature'?s basket|spencer'?s|kirana|supermarket|organic mandate)\b", "Groceries", "Supermarket & Grocery", 0.92),

    # Transport
    (r"(?i)\b(uber|uber india|uber trip)\b", "Transport", "Uber", 0.95),
    (r"(?i)\b(ola|ola cabs|ola auto)\b", "Transport", "Ola Cabs", 0.95),
    (r"(?i)\b(rapido|rapido bike|namma yatri)\b", "Transport", "Rapido / Namma Yatri", 0.95),
    (r"(?i)\b(metro|bmtc|delhi metro|dmrc|smart card recharge|nandi metro)\b", "Transport", "Public Transit / Metro", 0.95),

    # Fuel
    (r"(?i)\b(hpcl|bpcl|iocl|shell|petrol|fuel pump|bharat petroleum|hindustan petroleum|indian oil)\b", "Fuel", "Fuel Station", 0.95),

    # Rent
    (r"(?i)\b(rent|nobroker|mygate rent|house rent|landlord|society maintenance)\b", "Rent", "House Rent / Society", 0.95),

    # Utilities
    (r"(?i)\b(bescom|tata power|mahadiscom|electricity|power bill)\b", "Utilities", "Electricity Board", 0.95),
    (r"(?i)\b(airtel|airtel broadband|jio fiber|act fibernet|tata play|vodafone|vi recharge|water board|bwssb|gail gas|piped gas)\b", "Utilities", "Telecom & Utility", 0.95),

    # EMI & Loans
    (r"(?i)\b(emi|hdfc emi|bajaj finserv|sbi emi|cred emi|loan repay|zestmoney|home loan emi|car loan)\b", "EMI/Loans", "Loan & EMI", 0.95),

    # Subscriptions
    (r"(?i)\b(netflix|netflix\.com)\b", "Subscriptions", "Netflix", 0.98),
    (r"(?i)\b(spotify|spotify india)\b", "Subscriptions", "Spotify", 0.98),
    (r"(?i)\b(prime video|amazon prime|hotstar|disney\+ hotstar|youtube prem|apple\.com/bill|chatgpt|openai|icloud|magzter|fitpass)\b", "Subscriptions", "Digital Subscription", 0.95),

    # Shopping
    (r"(?i)\b(amzn|amazon|amazon\.in|amzn pay in)\b", "Shopping", "Amazon India", 0.95),
    (r"(?i)\b(flipkart|myntra|ajio|tata cliq|meesho|nykaa|zara|uniqlo|h&m|decathlon)\b", "Shopping", "E-Commerce / Fashion", 0.92),

    # Entertainment
    (r"(?i)\b(pvr|inox|cinepolis|bookmyshow|bms tickets|steam games|playstation network|nintendo)\b", "Entertainment", "Movies & Gaming", 0.95),

    # Health
    (r"(?i)\b(apollo|apollo pharmacy|1mg|tata 1mg|pharmeasy|medplus|practo|max healthcare|fortis|dr lal path)\b", "Health", "Healthcare & Pharmacy", 0.95),

    # Travel
    (r"(?i)\b(makemytrip|mmt|goibibo|cleartrip|yatra|irctc|indigo|air india|vistara|akasa air|staybook|airbnb)\b", "Travel", "Travel & Airlines", 0.95),

    # Cash Withdrawal
    (r"(?i)\b(atm wdl|atm cash|cash wdl|sbi atm|hdfc atm|axis atm|cash withdrawal)\b", "Cash Withdrawal", "ATM Cash Withdrawal", 0.98),

    # Transfers
    (r"(?i)\b(upi-p2p|p2p transfer|imps-p2a|neft transfer to|transfer to friend)\b", "Transfers", "Peer-to-Peer Transfer", 0.85),
]

def clean_merchant_from_description(desc: str) -> str:
    """Extract a friendly merchant name from messy UPI / Card strings."""
    # Strip common prefixes like UPI-, UPI/, POS-, TXN-
    cleaned = re.sub(r"^(UPI[-/]|POS[-/]|TXN[-/]|IMPS[-/]|BILLDESK\*|RAZORPAY\*)", "", desc.strip(), flags=re.IGNORECASE)
    # Strip trailing numbers, IDs, reference tags, @vpa
    cleaned = re.sub(r"@[a-zA-Z0-9]+", "", cleaned)  # remove @okhdfcbank, @ybl, etc.
    cleaned = re.sub(r"\*ORDER\s*\d+", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b\d{4,}\b", "", cleaned)  # remove standalone 4+ digit numbers
    cleaned = re.sub(r"[_\-*#/]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned.title() if cleaned else desc[:20].title()

def categorize_by_rule(description: str) -> Tuple[Optional[str], float, Optional[str]]:
    """
    Pass 1: Deterministic rule-based categorization.
    Returns: (category, confidence, merchant_clean) or (None, 0.0, None)
    """
    for pattern, category, default_merchant, confidence in RULE_PATTERNS:
        if re.search(pattern, description):
            # Try to get clean merchant
            extracted = clean_merchant_from_description(description)
            merchant = default_merchant if len(extracted) < 3 else extracted
            return category, confidence, merchant
            
    return None, 0.0, None

