import unittest
import asyncio
import sqlite3
import os
from database import init_db, get_db, DB_PATH
import services
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

class TestCurrencyBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        with get_db() as db:
            db.execute("DELETE FROM user_favorites;")
            db.execute("DELETE FROM conversion_history;")
            db.commit()

    def test_01_wal_mode_active(self):
        with get_db() as db:
            journal_mode = db.execute("PRAGMA journal_mode;").fetchone()[0]
            print(f"SQLite journal_mode: {journal_mode}")
            self.assertEqual(journal_mode.lower(), "wal")

    def test_02_currencies_endpoint(self):
        res = client.get("/api/currencies")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertTrue(any(c["code"] == "USD" for c in data))
        self.assertTrue(any(c["code"] == "EUR" for c in data))

    def test_03_convert_endpoint(self):
        res = client.get("/api/convert?from=USD&to=EUR&amount=100")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["source"], "USD")
        self.assertEqual(data["target"], "EUR")
        self.assertEqual(data["amount"], 100.0)
        self.assertGreater(data["rate"], 0)
        self.assertGreater(data["converted"], 0)
        print(f"Convert 100 USD -> EUR: {data['converted']} (rate {data['rate']})")

    def test_04_cache_populated(self):
        with get_db() as db:
            row = db.execute(
                "SELECT * FROM exchange_rate_cache WHERE base_currency = 'USD' AND target_currency = 'EUR'"
            ).fetchone()
            self.assertIsNotNone(row)
            self.assertGreater(row["rate"], 0)

    def test_05_historical_endpoint(self):
        res = client.get("/api/historical?from=USD&to=EUR&days=30")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 15)
        self.assertIn("date", data[0])
        self.assertIn("rate", data[0])
        print(f"Historical points fetched: {len(data)}")

    def test_06_travel_budget_mode(self):
        res = client.get("/api/budget?base=USD&amount=1500")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["base"], "USD")
        self.assertEqual(data["amount"], 1500.0)
        comparisons = data["comparisons"]
        self.assertEqual(len(comparisons), 5)
        currencies = [c["currency"] for c in comparisons]
        for expected in ["EUR", "GBP", "JPY", "CAD", "AUD"]:
            self.assertIn(expected, currencies)
        print("Travel budget results:", comparisons)

    def test_07_favorites_crud(self):
        # 1. Test auto-save pattern on conversion: converting USD -> CAD should auto-save to favorites with is_manual=0
        conv_res = client.get("/api/convert?from=USD&to=CAD&amount=200")
        self.assertEqual(conv_res.status_code, 200)

        res_list = client.get("/api/favorites")
        self.assertEqual(res_list.status_code, 200)
        favs = res_list.json()
        auto_cad = next((f for f in favs if f["source_currency"] == "USD" and f["target_currency"] == "CAD"), None)
        self.assertIsNotNone(auto_cad)
        self.assertEqual(auto_cad["is_manual"], 0)
        self.assertGreaterEqual(auto_cad["use_count"], 1)

        # 2. Test manual pin via toggle endpoint
        toggle_res = client.post("/api/favorites/toggle", json={"source": "USD", "target": "CAD"})
        self.assertEqual(toggle_res.status_code, 200)
        self.assertTrue(toggle_res.json()["is_manual"])

        # 3. Add favorite via POST
        res = client.post("/api/favorites", json={"source": "USD", "target": "JPY"})
        self.assertEqual(res.status_code, 200)

        # 4. Verify JPY is pinned
        res_list2 = client.get("/api/favorites")
        favs2 = res_list2.json()
        found_jpy = next((f for f in favs2 if f["source_currency"] == "USD" and f["target_currency"] == "JPY"), None)
        self.assertIsNotNone(found_jpy)
        self.assertEqual(found_jpy["is_manual"], 1)

        # 5. Delete favorite
        del_res = client.delete(f"/api/favorites/{found_jpy['id']}")
        self.assertEqual(del_res.status_code, 200)

    def test_08_conversion_history(self):
        res = client.get("/api/history?limit=5")
        self.assertEqual(res.status_code, 200)
        history = res.json()
        self.assertIsInstance(history, list)
        self.assertGreater(len(history), 0)
        self.assertEqual(history[0]["source_currency"], "USD")
        self.assertIn(history[0]["target_currency"], ["EUR", "CAD", "JPY"])

if __name__ == "__main__":
    unittest.main()
