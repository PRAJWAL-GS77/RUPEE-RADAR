import sys
import os
import shutil
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlmodel import create_engine, Session
from backend.app.main import app
from backend.app.database import get_session

def run_smoke_test():
    # Use isolated temporary database so test writes never leak into rupee_radar.db
    temp_dir = tempfile.mkdtemp()
    temp_db_path = Path(temp_dir) / "smoke_test.db"
    real_db_path = PROJECT_ROOT / "backend" / "rupee_radar.db"
    if not real_db_path.exists():
        real_db_path = PROJECT_ROOT / "rupee_radar.db"
    if real_db_path.exists():
        shutil.copyfile(real_db_path, temp_db_path)

    temp_engine = create_engine(f"sqlite:///{temp_db_path}", connect_args={"check_same_thread": False})

    def get_temp_session():
        with Session(temp_engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_temp_session
    client = TestClient(app)
    today = date.today()
    future_date = (today + timedelta(days=60)).strftime("%Y-%m-%d")

    tests = [
        ("GET", "/api/analytics/summary", None),
        ("GET", "/api/analytics/streak", None),
        ("GET", "/api/transactions", None),
        ("GET", "/api/transactions/review-queue", None),
        ("GET", "/api/anomalies", None),
        ("GET", "/api/recommendations", None),
        ("GET", "/api/recommendations/daily-challenge", None),
        ("GET", "/api/goals", None),
        ("POST", "/api/goals", {
            "name": "test",
            "target_amount": 10000,
            "current_amount": 2000,
            "target_date": future_date
        }),
        ("POST", "/api/transactions/parse-nl", {"text": "spent 110 on petrol"}),
        ("POST", "/api/chat", {"message": "how much did I spend on food last month"}),
        ("POST", "/api/chat", {"message": "hi"}),
    ]

    all_passed = True
    print("=" * 60)
    print("RUPEE RADAR FASTAPI SMOKE TEST (ISOLATED DB)")
    print("=" * 60)

    try:
        for method, path, payload in tests:
            try:
                if method == "GET":
                    resp = client.get(path)
                else:
                    resp = client.post(path, json=payload)
                
                status = resp.status_code
                if 200 <= status < 300:
                    print(f"[PASS] {method:<4} {path:<32} Status: {status}")
                else:
                    all_passed = False
                    err_snippet = resp.text[:150].replace("\n", " ")
                    print(f"[FAIL] {method:<4} {path:<32} Status: {status} Error: {err_snippet}")
            except Exception as ex:
                all_passed = False
                err_snippet = str(ex)[:150].replace("\n", " ")
                print(f"[FAIL] {method:<4} {path:<32} Exception: {err_snippet}")

        # Check transactions > 100 rows
        try:
            resp = client.get("/api/transactions")
            data = resp.json()
            count = len(data) if isinstance(data, list) else 0
            if count > 100:
                print(f"[PASS] Check /api/transactions > 100 rows ({count} rows found)")
            else:
                all_passed = False
                print(f"[FAIL] Check /api/transactions > 100 rows (only {count} rows found)")
        except Exception as ex:
            all_passed = False
            print(f"[FAIL] Check /api/transactions row count: {str(ex)[:150]}")

        # Check review queue is not empty
        try:
            resp = client.get("/api/transactions/review-queue")
            data = resp.json()
            count = len(data) if isinstance(data, list) else 0
            if count > 0:
                print(f"[PASS] Check /api/transactions/review-queue not empty ({count} items found)")
            else:
                all_passed = False
                print(f"[FAIL] Check /api/transactions/review-queue not empty (queue is EMPTY!)")
        except Exception as ex:
            all_passed = False
            print(f"[FAIL] Check /api/transactions/review-queue: {str(ex)[:150]}")

    finally:
        app.dependency_overrides.clear()
        temp_engine.dispose()
        shutil.rmtree(temp_dir, ignore_errors=True)

    print("=" * 60)
    if all_passed:
        print("ALL SMOKE TESTS PASSED!")
    else:
        print("SOME SMOKE TESTS FAILED!")
    print("=" * 60)
    return all_passed

if __name__ == "__main__":
    success = run_smoke_test()
    sys.exit(0 if success else 1)
