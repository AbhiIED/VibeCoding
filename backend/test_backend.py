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
        # inverse_rate must be present and server-computed
        self.assertIn("inverse_rate", data)
        self.assertGreater(data["inverse_rate"], 0)
        # Verify inverse_rate is approximately 1/rate
        self.assertAlmostEqual(data["inverse_rate"], round(1.0 / data["rate"], 6), places=5)
        print(f"Convert 100 USD -> EUR: {data['converted']} (rate {data['rate']}, inverse {data['inverse_rate']})")

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
        # Response must be structured dict with series, stats, source, meta
        self.assertIsInstance(data, dict)
        self.assertIn("series", data)
        self.assertIn("stats", data)
        self.assertIn("source", data)
        self.assertIn("meta", data)
        # Series validation
        series = data["series"]
        self.assertIsInstance(series, list)
        self.assertGreater(len(series), 15)
        self.assertIn("date", series[0])
        self.assertIn("rate", series[0])
        # Stats validation — all business logic computed server-side
        stats = data["stats"]
        self.assertIn("high", stats)
        self.assertIn("low", stats)
        self.assertIn("average", stats)
        self.assertIn("change_percent", stats)
        self.assertIn("is_positive", stats)
        self.assertIn("start_rate", stats)
        self.assertIn("end_rate", stats)
        self.assertIn("data_points", stats)
        self.assertGreater(stats["high"], 0)
        self.assertLessEqual(stats["low"], stats["high"])
        # Source must be a known value
        self.assertIn(data["source"], ["frankfurter", "synthetic", "identity"])
        # Meta validation
        self.assertEqual(data["meta"]["base"], "USD")
        self.assertEqual(data["meta"]["target"], "EUR")
        self.assertEqual(data["meta"]["days"], 30)
        print(f"Historical: {stats['data_points']} points, source={data['source']}, change={stats['change_percent']}%")

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

    def test_09_invalid_currency_code(self):
        """Backend must reject unsupported currency codes with 400"""
        # Invalid source currency
        res = client.get("/api/convert?from=FAKE&to=EUR&amount=100")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Unsupported currency code", res.json()["detail"])

        # Invalid target currency on historical
        res2 = client.get("/api/historical?from=USD&to=ZZZZZ&days=30")
        self.assertEqual(res2.status_code, 400)
        self.assertIn("Unsupported currency code", res2.json()["detail"])
        print("Invalid currency code validation: PASSED")

if __name__ == "__main__":
    unittest.main()
