import pytest
from backend.app.rules import categorize_by_rule, clean_merchant_from_description

def test_rule_categorizer_food_delivery():
    cat, conf, merch = categorize_by_rule("SWIGGY*ORDER 4421")
    assert cat == "Food Delivery"
    assert conf >= 0.90
    assert "Swiggy" in merch

    cat, conf, merch = categorize_by_rule("UPI-ZOMATO-9912@ybl")
    assert cat == "Food Delivery"
    assert conf >= 0.90

def test_rule_categorizer_utilities_rent():
    cat, conf, merch = categorize_by_rule("BESCOM ELECTRICITY")
    assert cat == "Utilities"
    assert conf >= 0.90

    cat, conf, merch = categorize_by_rule("RENT NOBROKER BANGALORE")
    assert cat == "Rent"
    assert conf >= 0.90

def test_rule_categorizer_subscriptions():
    cat, conf, merch = categorize_by_rule("NETFLIX.COM")
    assert cat == "Subscriptions"
    assert conf >= 0.95

    cat, conf, merch = categorize_by_rule("SPOTIFY INDIA")
    assert cat == "Subscriptions"

def test_rule_categorizer_income():
    cat, conf, merch = categorize_by_rule("SALARY CREDIT INFOSYS")
    assert cat == "Income"
    assert conf >= 0.95

def test_rule_unmatched_falls_back():
    cat, conf, merch = categorize_by_rule("UNKNOWN VENDOR XYZ 12345")
    assert cat is None
    assert conf == 0.0

def test_merchant_cleaning():
    clean = clean_merchant_from_description("UPI-ZOMATO-9912@ybl")
    assert "Zomato" in clean
    clean2 = clean_merchant_from_description("SWIGGY*ORDER 4421")
    assert "Swiggy" in clean2

