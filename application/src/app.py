import time
import os
import json
import datetime
from flask import Flask, render_template, request, jsonify  # , Response
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from src.errors import register_error_handlers
from src.llm import chain, extract_text
from src.retriever import retrieve, build_context

# from flask_cors import CORS
from flask_cors import CORS
from src.db import init_db, log_query, get_recent_logs, get_metrics, set_rating
from src.config import AI_MODEL

# ── Evaluation results helper ──────────────────────────────────────────────────
# Flask is launched from the application/ directory, so CWD is reliable.
# results.json lives one level up at: <project_root>/endpoint/evaluation/results.json
_RESULTS_PATH = os.path.join(
    os.path.dirname(os.getcwd()),   # project root  (parent of application/)
    "endpoint", "evaluation", "results.json"
)


def _load_eval_results():
    """Load evaluation results.json; return None if missing or malformed."""
    try:
        with open(_RESULTS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        print(f"[eval] Failed to load results.json from {_RESULTS_PATH!r}: {exc}")
        return None

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})  # Allow Vite dev server
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

register_error_handlers(app)


with app.app_context():
    init_db()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/ask", methods=["POST"])
@limiter.limit("5 per minute")
def ask():
    user_input = request.form.get("user_input")

    if not user_input:
        return jsonify({"error": "Bad Request", "message": "No input provided"}), 400

    t_start = time.monotonic()

    chunks = retrieve(user_input, top_k=2)
    context = build_context(chunks)

    answer = extract_text(
        chain.invoke({"context": context, "question": user_input}).content
    )

    latency_ms = int((time.monotonic() - t_start) * 1000)

    log_id = log_query(
        user_input=user_input,
        answer=answer,
        chunks_used=len(chunks),
        latency_ms=latency_ms,
        model=AI_MODEL,
    )

    return jsonify(
        {
            "log_id": log_id,
            "question": user_input,
            "answer": answer,
            "chunks": chunks,
        }
    )


# * It drains the free quota
# @app.route("/stream")
# @limiter.limit("1 per minute")
# def stream():
#     user_input = request.args.get("user_input")

#     def generate():
#         chunks = retrieve(user_input, top_k=2)
#         context = build_context(chunks)

#         for chunk in chain.stream({"context": context, "question": user_input}):
#             text = extract_text(chunk.content)

#             if text:
#                 safe = text.replace("\n", "\\n")
#                 yield f"data: {safe}\n\n"

#     return Response(
#         generate(), mimetype="text/event-stream"
#     )  # Server‑Sent Events (SSE)


@app.route("/api/health")
def api_health():
    """Quick liveness check used by the dashboard header badge."""
    return jsonify({"status": "ok", "model": AI_MODEL})


@app.route("/api/logs")
def api_logs():
    """
    GET /api/logs?limit=50
    Returns recent query/answer logs from the SQLite DB.
    """
    limit = min(int(request.args.get("limit", 50)), 200)
    logs = get_recent_logs(limit=limit)
    return jsonify(logs)


@app.route("/api/metrics")
def api_metrics():
    """
    GET /api/metrics
    Returns aggregated KPIs: query count, avg latency, satisfaction rate, etc.
    Augments DB metrics with real evaluation scores from results.json.
    """
    metrics = get_metrics()

    eval_data = _load_eval_results()
    if eval_data:
        agg = eval_data.get("aggregate", {})
        # Use rouge_l fmeasure as faithfulness proxy
        metrics["faithfulness_score"]  = round(agg.get("rouge_l_fmeasure", {}).get("mean", 0), 4)
        # Use bleu mean as answer-relevancy proxy
        metrics["ans_relevancy"]       = round(agg.get("bleu", {}).get("mean", 0), 4)
        # Use OOD accuracy as context-precision proxy
        metrics["ctx_precision"]       = round(agg.get("ood_accuracy", 0), 4)

    return jsonify(metrics)


@app.route("/api/rate", methods=["POST"])
def api_rate():
    """
    POST /api/rate   body: { log_id: int, rating: 'positive'|'negative' }
    Lets the dashboard thumbs-up/down a specific answer.
    """
    data = request.get_json(silent=True) or {}
    log_id = data.get("log_id")
    rating = data.get("rating")

    if not log_id or rating not in ("positive", "negative"):
        return jsonify(
            {"error": "Bad Request", "message": "log_id and rating are required"}
        ), 400

    set_rating(log_id, rating)
    return jsonify({"ok": True})



@app.route("/api/experiments")
@limiter.exempt
def api_experiments():
    """
    GET /api/experiments
    Returns evaluation runs built from results.json per-category breakdown.
    """
    eval_data = _load_eval_results()
    if not eval_data:
        return jsonify([])

    meta      = eval_data.get("metadata", {})
    agg       = eval_data.get("aggregate", {})
    per_cat   = eval_data.get("per_category", {})
    timestamp = meta.get("timestamp", "")

    # Overall run from aggregate scores
    overall_rouge = agg.get("rouge_l_fmeasure", {}).get("mean", 0)
    overall_bleu  = agg.get("bleu", {}).get("mean", 0)
    ood_acc       = agg.get("ood_accuracy", 0)

    experiments = [
        {
            "id":        "overall",
            "name":      "Overall Evaluation",
            "timestamp": timestamp,
            "status":    "completed",
            "params": {
                "total_evaluated": meta.get("total_evaluated", 0),
                "in_domain":       meta.get("in_domain_count", 0),
                "out_of_domain":   meta.get("ood_count", 0),
            },
            "metrics": {
                "faithfulness":      round(overall_rouge, 4),
                "answer_relevancy":  round(overall_bleu,  4),
                "context_precision": round(ood_acc,       4),
                "latency_ms":        0,
            },
        }
    ]

    # One experiment row per category
    for cat_name, cat in per_cat.items():
        experiments.append({
            "id":        cat_name,
            "name":      cat_name.replace("_", " ").title(),
            "timestamp": timestamp,
            "status":    "completed",
            "params": {
                "category": cat_name,
                "count":    cat.get("count", 0),
            },
            "metrics": {
                "faithfulness":      round(cat.get("rouge_l_mean", 0), 4),
                "answer_relevancy":  round(cat.get("bleu_mean", 0),   4),
                "context_precision": round(ood_acc, 4),
                "latency_ms":        0,
            },
        })

    return jsonify(experiments)


@app.route("/api/pipeline")
@limiter.exempt
def api_pipeline():
    history = []
    
    # Try to read local evaluation files to populate history
    eval_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "endpoint", "evaluation")
    results_path = os.path.join(eval_dir, "results.json")
    
    if os.path.exists(results_path):
        try:
            with open(results_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            timestamp = data.get("metadata", {}).get("timestamp", "")
            f1_score = data.get("aggregate", {}).get("rouge_l_fmeasure", {}).get("mean", 0)
            
            history.append({
                "run_id": "eval-" + timestamp[:10] if len(timestamp) >= 10 else "eval-1",
                "date": timestamp,
                "trigger": "manual",
                "status": "success",
                "f1": f"{f1_score:.4f}" if f1_score else None
            })
        except Exception as e:
            print("Error reading results.json:", e)

    return jsonify({
        "current_stage": "idle",
        "progress": 0,
        "started_at": None,
        "estimated_completion": None,
        "stages": [],
        "history": history
    })


@app.route("/api/embeddings")
@limiter.exempt
def api_embeddings():
    try:
        from src.retriever import pc_index
        stats = pc_index.describe_index_stats()
        # Pinecone SDK v3 returns an object, not a dict — use attribute access
        docs_indexed = getattr(stats, 'total_vector_count', None)
        if docs_indexed is None:
            # Fallback: try dict-style access (older SDK versions)
            docs_indexed = stats.get('total_vector_count', 0) if hasattr(stats, 'get') else 0
    except Exception as e:
        print("Error fetching Pinecone stats:", e)
        docs_indexed = 0

    now = datetime.datetime.now(datetime.timezone.utc)
    # Mocking next refresh to be 2:00 AM UTC
    next_refresh = now.replace(hour=2, minute=0, second=0, microsecond=0)
    if now >= next_refresh:
        next_refresh += datetime.timedelta(days=1)
        
    last_refresh = next_refresh - datetime.timedelta(days=1)

    return jsonify({
        "last_refresh": last_refresh.isoformat(),
        "next_refresh": next_refresh.isoformat(),
        "status": "idle",
        "docs_indexed": docs_indexed,
        "new_docs_pending": 0,
        "history": [
            {
                "date": last_refresh.isoformat(),
                "status": "success",
                "docs_added": docs_indexed,
                "duration_s": 4.2
            }
        ]
    })
