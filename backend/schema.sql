PRAGMA journal_mode=WAL;

-- 1. Cache for API rates to prevent rate-limit exhaustion
CREATE TABLE IF NOT EXISTS exchange_rate_cache (
    base_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    rate REAL NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (base_currency, target_currency)
);

-- 2. Frequently used and favorited currency pairs
CREATE TABLE IF NOT EXISTS user_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    is_manual INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_currency, target_currency)
);

-- 3. Log of recent conversions
CREATE TABLE IF NOT EXISTS conversion_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    amount REAL NOT NULL,
    converted_amount REAL NOT NULL,
    rate REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for fast retrieval
CREATE INDEX IF NOT EXISTS idx_cache_lookup ON exchange_rate_cache(base_currency, target_currency);
CREATE INDEX IF NOT EXISTS idx_history_created ON conversion_history(created_at DESC);
