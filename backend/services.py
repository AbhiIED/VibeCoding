import httpx
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory or project root
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

EXCHANGE_API_KEY = os.getenv("EXCHANGE_RATE_API_KEY", "")
MAJOR_5 = ["EUR", "GBP", "JPY", "CAD", "AUD"]

CURRENCIES = [
    {"code": "USD", "name": "US Dollar", "symbol": "$", "flag": "🇺🇸"},
    {"code": "EUR", "name": "Euro", "symbol": "€", "flag": "🇪🇺"},
    {"code": "GBP", "name": "British Pound", "symbol": "£", "flag": "🇬🇧"},
    {"code": "JPY", "name": "Japanese Yen", "symbol": "¥", "flag": "🇯🇵"},
    {"code": "CAD", "name": "Canadian Dollar", "symbol": "CA$", "flag": "🇨🇦"},
    {"code": "AUD", "name": "Australian Dollar", "symbol": "AU$", "flag": "🇦🇺"},
    {"code": "CHF", "name": "Swiss Franc", "symbol": "CHF", "flag": "🇨🇭"},
    {"code": "CNY", "name": "Chinese Yuan", "symbol": "¥", "flag": "🇨🇳"},
    {"code": "INR", "name": "Indian Rupee", "symbol": "₹", "flag": "🇮🇳"},
    {"code": "SGD", "name": "Singapore Dollar", "symbol": "S$", "flag": "🇸🇬"},
    {"code": "NZD", "name": "New Zealand Dollar", "symbol": "NZ$", "flag": "🇳🇿"},
    {"code": "BRL", "name": "Brazilian Real", "symbol": "R$", "flag": "🇧🇷"},
    {"code": "MXN", "name": "Mexican Peso", "symbol": "$", "flag": "🇲🇽"},
    {"code": "HKD", "name": "Hong Kong Dollar", "symbol": "HK$", "flag": "🇭🇰"},
    {"code": "KRW", "name": "South Korean Won", "symbol": "₩", "flag": "🇰🇷"},
    {"code": "SEK", "name": "Swedish Krona", "symbol": "kr", "flag": "🇸🇪"},
    {"code": "NOK", "name": "Norwegian Krone", "symbol": "kr", "flag": "🇳🇴"},
    {"code": "TRY", "name": "Turkish Lira", "symbol": "₺", "flag": "🇹🇷"},
    {"code": "ZAR", "name": "South African Rand", "symbol": "R", "flag": "🇿🇦"},
    {"code": "AED", "name": "UAE Dirham", "symbol": "د.إ", "flag": "🇦🇪"},
]

async def fetch_live_rate(base: str, target: str, db) -> float:
    base, target = base.upper().strip(), target.upper().strip()
    if base == target:
        return 1.0

    # 1. Check SQLite Cache (< 1 hr old)
    cursor = db.cursor()
    cursor.execute(
        "SELECT rate, fetched_at FROM exchange_rate_cache WHERE base_currency = ? AND target_currency = ?",
        (base, target),
    )
    cached = cursor.fetchone()
    if cached:
        try:
            cache_str = cached["fetched_at"]
            if "T" in cache_str:
                cache_time = datetime.fromisoformat(cache_str).replace(tzinfo=timezone.utc)
            else:
                cache_time = datetime.strptime(cache_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            
            if datetime.now(timezone.utc) - cache_time < timedelta(hours=1):
                return float(cached["rate"])
        except Exception:
            pass

    # 2. Fetch live data from ExchangeRate-API (Fallback to Frankfurter -> Open ER-API)
    rate = None
    async with httpx.AsyncClient(timeout=8.0) as client:
        # Step 2a: Primary - ExchangeRate-API if API key configured
        if EXCHANGE_API_KEY:
            try:
                url = f"https://v6.exchangerate-api.com/v6/{EXCHANGE_API_KEY}/pair/{base}/{target}"
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("result") == "success" and "conversion_rate" in data:
                        rate = float(data["conversion_rate"])
            except Exception:
                rate = None

        # Step 2b: Fallback 1 - Frankfurter API (free, public, no key)
        if rate is None:
            try:
                url = f"https://api.frankfurter.dev/v1/latest?base={base}&symbols={target}"
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if "rates" in data and target in data["rates"]:
                        rate = float(data["rates"][target])
            except Exception:
                rate = None

        # Step 2c: Fallback 2 - Open Exchange Rates open free endpoint (supports 160+ currencies)
        if rate is None:
            try:
                url = f"https://open.er-api.com/v6/latest/{base}"
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("result") == "success" and "rates" in data and target in data["rates"]:
                        rate = float(data["rates"][target])
            except Exception:
                rate = None

    if rate is None:
        # If all live fetches failed, try to return any cached rate even if expired
        if cached:
            return float(cached["rate"])
        raise ValueError(f"Could not obtain exchange rate from {base} to {target}")

    # 3. Update Cache in SQLite
    cursor.execute(
        """INSERT INTO exchange_rate_cache (base_currency, target_currency, rate, fetched_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(base_currency, target_currency)
           DO UPDATE SET rate=excluded.rate, fetched_at=CURRENT_TIMESTAMP""",
        (base, target, rate),
    )
    db.commit()
    return rate

VALID_CODES = {c["code"] for c in CURRENCIES}

def validate_currency_code(code: str) -> str:
    """Validates and normalizes a currency code. Raises ValueError if invalid."""
    normalized = code.upper().strip()
    if normalized not in VALID_CODES:
        raise ValueError(f"Unsupported currency code: '{normalized}'")
    return normalized


def _compute_series_stats(series: list) -> dict:
    """Computes statistics from a list of {date, rate} data points. All business logic stays server-side."""
    if not series:
        return {
            "high": 0.0, "low": 0.0, "average": 0.0,
            "change_percent": 0.0, "is_positive": True,
            "start_rate": 0.0, "end_rate": 0.0, "data_points": 0
        }

    rates = [point["rate"] for point in series]
    high = max(rates)
    low = min(rates)
    average = sum(rates) / len(rates)
    start_rate = rates[0]
    end_rate = rates[-1]
    change_percent = ((end_rate - start_rate) / start_rate * 100) if start_rate != 0 else 0.0

    return {
        "high": round(high, 4),
        "low": round(low, 4),
        "average": round(average, 4),
        "change_percent": round(change_percent, 2),
        "is_positive": change_percent >= 0,
        "start_rate": round(start_rate, 4),
        "end_rate": round(end_rate, 4),
        "data_points": len(rates)
    }


async def fetch_30d_history(base: str, target: str, db=None, days: int = 30) -> dict:
    """
    Returns structured 30-day historical data with server-computed statistics.
    Response shape: { series, stats, source, meta }
    """
    base, target = base.upper().strip(), target.upper().strip()
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)

    if base == target:
        # Generate N days of 1.0 rate
        series = []
        for i in range(days + 1):
            d = (start_date + timedelta(days=i)).isoformat()
            series.append({"date": d, "rate": 1.0})
        return {
            "series": series,
            "stats": _compute_series_stats(series),
            "source": "identity",
            "meta": {"base": base, "target": target, "days": days}
        }

    # Query Frankfurter time-series API
    series = []
    source = "synthetic"

    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            url = f"https://api.frankfurter.dev/v1/{start_date}..{end_date}?base={base}&symbols={target}"
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                rates = data.get("rates", {})
                history = [{"date": d, "rate": float(val[target])} for d, val in sorted(rates.items()) if target in val]
                if history:
                    series = history
                    source = "frankfurter"
        except Exception:
            pass

    # Fallback: if Frankfurter doesn't have the pair (e.g. non-ECB currency),
    # fetch current live rate and construct synthetic trend points
    if not series:
        current_rate = 1.0
        if db:
            try:
                current_rate = await fetch_live_rate(base, target, db)
            except Exception:
                current_rate = 1.0

        # Build trend using small deterministic market variations around current_rate
        import math
        for i in range(days):
            d = (start_date + timedelta(days=i)).isoformat()
            # pseudo-fluctuation based on sine wave within +/- 1.2%
            factor = 1.0 + 0.012 * math.sin(i * 0.45)
            series.append({"date": d, "rate": round(current_rate * factor, 4)})
        series.append({"date": end_date.isoformat(), "rate": round(current_rate, 4)})
        source = "synthetic"

    return {
        "series": series,
        "stats": _compute_series_stats(series),
        "source": source,
        "meta": {"base": base, "target": target, "days": days}
    }
