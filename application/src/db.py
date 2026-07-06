"""
db.py — SQLite persistence layer for the RAG monitoring dashboard.

Tables
------
query_logs   : every /ask interaction (question, answer, latency, rating)
metrics_cache: lightweight pre-aggregated stats refreshed on every write

The DB file is written to the application working directory as `rag_logs.db`.
In Docker, mount a volume to persist it across container restarts.
"""

import sqlite3
from contextlib import contextmanager

import os

# Create absolute path pointing to application/rag_logs.db
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "rag_logs.db")

# ── Schema ─────────────────────────────────────────────────────────────────────

_DDL = """
CREATE TABLE IF NOT EXISTS query_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    user_input  TEXT    NOT NULL,
    answer      TEXT    NOT NULL,
    chunks_used INTEGER NOT NULL DEFAULT 0,
    latency_ms  INTEGER NOT NULL DEFAULT 0,
    model       TEXT    NOT NULL DEFAULT 'unknown',
    rating      TEXT    CHECK(rating IN ('positive','negative','none')) DEFAULT 'none'
);

CREATE TABLE IF NOT EXISTS ratings (
    log_id  INTEGER PRIMARY KEY REFERENCES query_logs(id) ON DELETE CASCADE,
    rating  TEXT    NOT NULL CHECK(rating IN ('positive','negative'))
);
"""


# ── Connection helper ──────────────────────────────────────────────────────────


@contextmanager
def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")  # safe for concurrent reads
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ── Public API ─────────────────────────────────────────────────────────────────


def init_db():
    """Create tables if they don't exist. Call once at app startup."""
    with _get_conn() as conn:
        conn.executescript(_DDL)


def log_query(
    user_input: str,
    answer: str,
    chunks_used: int,
    latency_ms: int,
    model: str = "unknown",
) -> int:
    """Insert a query/answer pair and return its auto-generated id."""
    with _get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO query_logs (user_input, answer, chunks_used, latency_ms, model)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_input, answer, chunks_used, latency_ms, model),
        )
        return cur.lastrowid


def set_rating(log_id: int, rating: str):
    """Update the rating for a specific query log entry."""
    with _get_conn() as conn:
        conn.execute(
            "UPDATE query_logs SET rating = ? WHERE id = ?",
            (rating, log_id),
        )


def get_recent_logs(limit: int = 50) -> list[dict]:
    """Return the most recent query logs as a list of dicts."""
    with _get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, timestamp, user_input, answer,
                   chunks_used AS retrieved_chunks, latency_ms, model, rating
            FROM   query_logs
            ORDER  BY id DESC
            LIMIT  ?
            """,
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_metrics() -> dict:
    """
    Return aggregated KPIs computed directly from SQLite.
    Designed to be called by GET /api/metrics.
    """
    with _get_conn() as conn:
        # ── Today's query count ────────────────────────────────────────────────
        today_count = conn.execute(
            """
            SELECT COUNT(*) FROM query_logs
            WHERE  date(timestamp) = date('now')
            """
        ).fetchone()[0]

        # ── All-time & today avg latency ──────────────────────────────────────
        latency_row = conn.execute(
            """
            SELECT AVG(latency_ms) as avg_all,
                   AVG(CASE WHEN date(timestamp)=date('now') THEN latency_ms END) as avg_today
            FROM   query_logs
            """
        ).fetchone()

        # ── Satisfaction rate (positive / total rated) ─────────────────────────
        sat_row = conn.execute(
            """
            SELECT
                COUNT(CASE WHEN rating='positive' THEN 1 END)  AS pos,
                COUNT(CASE WHEN rating != 'none'  THEN 1 END)  AS rated
            FROM query_logs
            """
        ).fetchone()

        pos = sat_row["pos"] or 0
        rated = sat_row["rated"] or 1  # avoid div/0
        satisfaction_rate = round(pos / rated, 4)

        # ── Hourly timeline for the last 7 hours ──────────────────────────────
        hourly = conn.execute(
            """
            SELECT strftime('%H:00', timestamp) AS hour,
                   COUNT(*)                     AS queries,
                   AVG(latency_ms)              AS avg_latency,
                   (CAST(COUNT(CASE WHEN rating='positive' THEN 1 END) AS FLOAT) / 
                    NULLIF(COUNT(CASE WHEN rating != 'none' THEN 1 END), 0)) AS avg_satisfaction
            FROM   query_logs
            WHERE  timestamp >= datetime('now', '-7 hours')
            GROUP  BY hour
            ORDER  BY hour
            """
        ).fetchall()

    return {
        "total_queries_today": today_count,
        "avg_latency_ms": round(latency_row["avg_all"] or 0),
        "avg_latency_today_ms": round(latency_row["avg_today"] or 0),
        "satisfaction_rate": satisfaction_rate,
        # Frontend will compute change % itself; send 0 placeholders for now
        "queries_change": 0,
        "latency_change": 0,
        "satisfaction_change": 0,
        "faithfulness_score": 0,    # placeholder until RAGAS pipeline writes here
        "faithfulness_change": 0,
        "ans_relevancy": 0,          # placeholder until RAGAS pipeline writes here
        "ctx_precision": 0,          # placeholder until RAGAS pipeline writes here
        "hourly_timeline": [dict(r) for r in hourly],
    }
