# VibeFX — Real-Time Currency Converter & Market Trends 💱✈️

A fast, resilient, and aesthetic full-stack currency utility featuring real-time conversion rates, SQLite caching with WAL mode concurrency, interactive 30-day market trend visualizations, user favorites with auto-saved frequent pairs, and a "Travel Budgeting" matrix comparing the top 5 global currencies simultaneously.

---

## ⚡ Architecture Highlights

- **FastAPI Backend (`/backend`)**: High-throughput asynchronous REST API.
- **SQLite with WAL Mode (`backend/database.py`)**: `PRAGMA journal_mode=WAL;` eliminates SQLite file locks for non-blocking concurrent reads and writes.
- **1-Hour TTL Rate Caching (`backend/services.py`)**: Stores live rates in SQLite cache to eliminate N+1 API burnout and reduce latency to sub-millisecond.
- **Multi-Tier API Fallback**:
  1. Primary: ExchangeRate-API (via optional key).
  2. Fallback 1: Keyless, free **Frankfurter API** (`api.frankfurter.dev`) for live rates and 30-day time-series.
  3. Fallback 2: **Open ER-API** (`open.er-api.com`) supporting 160+ world currencies.
- **Vite + React 19 Frontend (`/frontend`)**: Fast HMR client with Tailwind CSS dark fintech aesthetic and Recharts responsive visualizations.
- **Auto-Saved Frequently Used Pairs**: Automatically tracks conversion patterns and adds frequently used pairs to the Quick-Access bar alongside pinned favorites.

---

## 🚀 Quick Start

### Option 1: One-Click Launch (Windows)
Double-click:
```cmd
start_all.bat
```
This automatically launches both the FastAPI backend (`http://127.0.0.1:8000`) and Vite frontend (`http://localhost:5173`) in dedicated windows.

---

### Option 2: Manual Start

#### 1. Backend Setup
```bash
cd backend
py -3.10 -m pip install -r requirements.txt
py -3.10 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at: `http://127.0.0.1:8000/docs`

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Web Application will be available at: `http://localhost:5173`

---

## 🌟 Key Features

1. **Dual Converter**:
   - Side-by-side dropdown selectors with country flags and search.
   - 350ms debounced input to prevent excessive backend/API calls.
   - Instant 180° animated currency swap.
   - Quick preset buttons (`50`, `100`, `500`, `1,000`, `5,000`).
2. **30-Day Trend Chart**:
   - Interactive Area Chart powered by Recharts with custom emerald gradient fill.
   - Real-time statistics: 30-day Low, Average, High, and % net change.
   - Precision tooltip with date and exchange rates.
3. **Travel Budgeting Mode ("The Vibe Check")**:
   - Toggle switch in header.
   - Simultaneously calculates equivalent spending budgets for the top 5 global currencies:
     - 🇪🇺 **EUR** (Euro)
     - 🇬🇧 **GBP** (British Pound)
     - 🇯🇵 **JPY** (Japanese Yen)
     - 🇨🇦 **CAD** (Canadian Dollar)
     - 🇦🇺 **AUD** (Australian Dollar)
4. **Quick-Access Favorites & Frequent Pairs**:
   - Auto-tracks every conversion and ranks frequently used pairs.
   - Star button to pin/unpin favorites manually.
   - One-click pair loading and inline removal.
5. **Recent Conversions Ledger**:
   - SQLite-backed audit log of conversions with one-click reload.

---

## 📡 API Contract

| Method | Endpoint | Query / Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/convert` | `from=USD&to=EUR&amount=100` | Calculates rate, caches in SQLite, logs conversion |
| `GET` | `/api/historical` | `from=USD&to=EUR&days=30` | Returns 30-day time-series array `{date, rate}` |
| `GET` | `/api/budget` | `base=USD&amount=1000` | Computes values across EUR, GBP, JPY, CAD, AUD |
| `GET` | `/api/favorites` | — | Returns saved and frequently used pairs |
| `POST` | `/api/favorites` | `{"source": "USD", "target": "EUR"}` | Pins pair to manual favorites |
| `POST` | `/api/favorites/toggle` | `{"source": "USD", "target": "EUR"}` | Toggles pinned favorite state |
| `DELETE` | `/api/favorites/{id}` | — | Removes pair from list |
| `GET` | `/api/history` | `limit=15` | Returns recent conversion logs |
| `GET` | `/api/currencies` | — | Supported currency list with names and flags |

---

## 🧪 Automated Testing

Run the comprehensive unit test suite:
```bash
cd backend
py -3.10 test_backend.py
```
Validates:
- SQLite WAL mode verification (`PRAGMA journal_mode = wal`)
- Real-time rate retrieval and SQLite caching
- 30-day time-series data from Frankfurter
- Travel budget computation for 5 major global currencies
- Auto-saving of frequent pairs and favorite toggle CRUD
- Conversion history logging
