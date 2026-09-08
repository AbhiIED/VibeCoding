from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from database import init_db, get_db
import services

app = FastAPI(
    title="Vibe Currency API",
    description="Real-time currency converter with SQLite caching and Frankfurter fallback",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

class FavoriteRequest(BaseModel):
    source: str
    target: str

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "currency-converter"}

@app.get("/api/currencies")
def get_currencies():
    """Return list of supported currencies with symbols, names, and flags"""
    return services.CURRENCIES

@app.get("/api/convert")
async def convert(
    from_curr: Optional[str] = Query(None, alias="from"),
    source_curr: Optional[str] = Query(None, alias="from_curr"),
    to_curr: Optional[str] = Query(None, alias="to"),
    target_curr: Optional[str] = Query(None, alias="to_curr"),
    amount: float = Query(1.0, ge=0.0)
):
    """
    Converts amount from source currency to target currency.
    Caches rate in SQLite and logs to conversion_history.
    """
    src = (source_curr or from_curr or "USD").upper().strip()
    tgt = (target_curr or to_curr or "EUR").upper().strip()

    with get_db() as db:
        try:
            rate = await services.fetch_live_rate(src, tgt, db)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch rate: {str(e)}")

        converted = round(amount * rate, 4)

        try:
            db.execute(
                """INSERT INTO conversion_history 
                   (source_currency, target_currency, amount, converted_amount, rate) 
                   VALUES (?, ?, ?, ?, ?)""",
                (src, tgt, amount, converted, rate)
            )
            # Automatically record / increment frequently used pair in user_favorites
            db.execute(
                """INSERT INTO user_favorites (source_currency, target_currency, is_manual, use_count, updated_at) 
                   VALUES (?, ?, 0, 1, CURRENT_TIMESTAMP)
                   ON CONFLICT(source_currency, target_currency)
                   DO UPDATE SET use_count = user_favorites.use_count + 1, updated_at = CURRENT_TIMESTAMP""",
                (src, tgt)
            )
            db.commit()
        except Exception:
            pass

    return {
        "source": src,
        "target": tgt,
        "amount": amount,
        "converted": converted,
        "rate": rate
    }

@app.get("/api/historical")
async def historical(
    from_curr: Optional[str] = Query(None, alias="from"),
    source_curr: Optional[str] = Query(None, alias="from_curr"),
    to_curr: Optional[str] = Query(None, alias="to"),
    target_curr: Optional[str] = Query(None, alias="to_curr"),
    days: int = Query(30, ge=1, le=90)
):
    """
    Returns 30-day historical time-series data for chart visualization.
    """
    src = (source_curr or from_curr or "USD").upper().strip()
    tgt = (target_curr or to_curr or "EUR").upper().strip()

    with get_db() as db:
        try:
            data = await services.fetch_30d_history(src, tgt, db)
            return data
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch historical data: {str(e)}")

@app.get("/api/budget")
async def budget(
    base: str = Query("USD"),
    amount: float = Query(1000.0, ge=0.0)
):
    """
    Travel Budgeting Mode:
    Calculates equivalent values for 5 major global currencies simultaneously (EUR, GBP, JPY, CAD, AUD).
    """
    base_code = base.upper().strip()
    results = []

    with get_db() as db:
        for target in services.MAJOR_5:
            try:
                rate = await services.fetch_live_rate(base_code, target, db)
                results.append({
                    "currency": target,
                    "rate": round(rate, 4),
                    "equivalent": round(amount * rate, 2)
                })
            except Exception:
                results.append({
                    "currency": target,
                    "rate": 0.0,
                    "equivalent": 0.0
                })

    return {
        "base": base_code,
        "amount": amount,
        "comparisons": results
    }

@app.get("/api/favorites")
def get_favorites():
    """Returns saved and frequently used currency pairs, prioritizing pinned favorites followed by highest frequency"""
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM user_favorites ORDER BY is_manual DESC, use_count DESC, updated_at DESC LIMIT 15"
        ).fetchall()
        return [dict(r) for r in rows]

@app.post("/api/favorites")
def add_favorite(fav: Optional[FavoriteRequest] = None, source: Optional[str] = None, target: Optional[str] = None):
    """Pins a currency pair to favorites"""
    src = (fav.source if fav else source or "").upper().strip()
    tgt = (fav.target if fav else target or "").upper().strip()

    if not src or not tgt or src == tgt:
        raise HTTPException(status_code=400, detail="Valid distinct source and target currencies required")

    with get_db() as db:
        db.execute(
            """INSERT INTO user_favorites (source_currency, target_currency, is_manual, use_count, updated_at) 
               VALUES (?, ?, 1, 1, CURRENT_TIMESTAMP)
               ON CONFLICT(source_currency, target_currency)
               DO UPDATE SET is_manual = 1, updated_at = CURRENT_TIMESTAMP""",
            (src, tgt)
        )
        db.commit()
        fav_row = db.execute(
            "SELECT * FROM user_favorites WHERE source_currency = ? AND target_currency = ?",
            (src, tgt)
        ).fetchone()

    return {"status": "success", "favorite": dict(fav_row) if fav_row else {"source_currency": src, "target_currency": tgt, "is_manual": 1}}

@app.post("/api/favorites/toggle")
def toggle_favorite(fav: FavoriteRequest):
    """Toggles the pinned favorite status of a currency pair"""
    src = fav.source.upper().strip()
    tgt = fav.target.upper().strip()

    if not src or not tgt or src == tgt:
        raise HTTPException(status_code=400, detail="Valid distinct source and target currencies required")

    with get_db() as db:
        existing = db.execute(
            "SELECT * FROM user_favorites WHERE source_currency = ? AND target_currency = ?",
            (src, tgt)
        ).fetchone()
        if existing:
            new_status = 0 if existing["is_manual"] else 1
            db.execute(
                "UPDATE user_favorites SET is_manual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (new_status, existing["id"])
            )
            db.commit()
            updated = db.execute("SELECT * FROM user_favorites WHERE id = ?", (existing["id"],)).fetchone()
            return {"status": "success", "is_manual": bool(new_status), "favorite": dict(updated)}
        else:
            db.execute(
                """INSERT INTO user_favorites (source_currency, target_currency, is_manual, use_count, updated_at) 
                   VALUES (?, ?, 1, 1, CURRENT_TIMESTAMP)""",
                (src, tgt)
            )
            db.commit()
            inserted = db.execute(
                "SELECT * FROM user_favorites WHERE source_currency = ? AND target_currency = ?",
                (src, tgt)
            ).fetchone()
            return {"status": "success", "is_manual": True, "favorite": dict(inserted)}

@app.delete("/api/favorites/{fav_id}")
def delete_favorite(fav_id: int):
    """Removes a currency pair from favorites / frequently used by ID"""
    with get_db() as db:
        db.execute("DELETE FROM user_favorites WHERE id = ?", (fav_id,))
        db.commit()
    return {"status": "success", "id": fav_id}

@app.get("/api/history")
def get_history(limit: int = Query(15, ge=1, le=50)):
    """Returns recent conversion history"""
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM conversion_history ORDER BY id DESC LIMIT ?",
            (limit,)
        ).fetchall()
        return [dict(r) for r in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
