import sqlite3
from contextlib import contextmanager
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "currency.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        
        # Migration: ensure is_manual, use_count, and updated_at exist in user_favorites
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(user_favorites);")
        existing_cols = [row[1] for row in cursor.fetchall()]
        if "is_manual" not in existing_cols:
            conn.execute("ALTER TABLE user_favorites ADD COLUMN is_manual INTEGER DEFAULT 0;")
        if "use_count" not in existing_cols:
            conn.execute("ALTER TABLE user_favorites ADD COLUMN use_count INTEGER DEFAULT 1;")
        if "updated_at" not in existing_cols:
            conn.execute("ALTER TABLE user_favorites ADD COLUMN updated_at TIMESTAMP DEFAULT NULL;")
        
        conn.commit()

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
