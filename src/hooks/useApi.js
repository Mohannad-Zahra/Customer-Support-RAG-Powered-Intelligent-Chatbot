import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../config';

/**
 * useApi — Generic polling hook for the RAG backend.
 *
 * @param {string} path        - API path, e.g. '/api/logs'
 * @param {*}      fallback    - Value returned while loading or on error
 * @param {number} intervalMs  - Auto-refresh interval in ms (0 = no polling)
 *
 * @returns {{ data, loading, error, refetch, lastUpdated }}
 */
export function useApi(path, fallback = null, intervalMs = 0) {
  const [data,        setData]        = useState(fallback);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      let json = null;
      
      // Mock Data Generation based on path
      if (path === '/api/health') {
        json = { status: 'ok', model: 'gemini-1.5-pro' };
      } else if (path.startsWith('/api/logs')) {
        json = [
          {
            id: 101,
            user_input: "How do I reset my password?",
            answer: "To reset your password, go to the login page and click on 'Forgot Password'. You will receive an email with a reset link.",
            latency_ms: 1240,
            faithfulness: 0.95,
            satisfaction: 0.9,
            rating: 'positive',
            retrieved_chunks: 3,
            model: 'gemini-1.5-pro',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
          },
          {
            id: 102,
            user_input: "What are the pricing plans?",
            answer: "We offer three pricing plans: Basic ($9/mo), Pro ($29/mo), and Enterprise (Custom). Visit our pricing page for more details.",
            latency_ms: 850,
            faithfulness: 0.92,
            satisfaction: 0.85,
            rating: 'positive',
            retrieved_chunks: 2,
            model: 'gemini-1.5-pro',
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
          },
          {
            id: 103,
            user_input: "I can't access my account, it says locked.",
            answer: "Accounts are locked after 5 failed login attempts. Please wait 15 minutes or contact support to unlock it immediately.",
            latency_ms: 2100,
            faithfulness: 0.65,
            satisfaction: 0.4,
            rating: 'negative',
            retrieved_chunks: 4,
            model: 'gemini-1.5-pro',
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
          },
          {
            id: 104,
            user_input: "Is there a free trial?",
            answer: "Yes, we offer a 14-day free trial on the Pro plan. No credit card is required to sign up.",
            latency_ms: 920,
            faithfulness: 0.98,
            satisfaction: 1.0,
            rating: 'positive',
            retrieved_chunks: 1,
            model: 'gemini-1.5-pro',
            timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString()
          },
          {
            id: 105,
            user_input: "How do I delete my data?",
            answer: "You can delete your account and all associated data from the 'Privacy' section in your account settings.",
            latency_ms: 1100,
            faithfulness: 0.88,
            satisfaction: 0.8,
            rating: 'positive',
            retrieved_chunks: 2,
            model: 'gemini-1.5-pro',
            timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString()
          }
        ];
      } else if (path === '/api/metrics') {
        const hourly_timeline = Array.from({ length: 24 }).map((_, i) => ({
          hour: `${i.toString().padStart(2, '0')}:00`,
          avg_latency: 800 + Math.random() * 400,
          avg_satisfaction: 0.8 + Math.random() * 0.15,
        }));
        json = {
          total_queries_today: 1245 + Math.floor(Math.random() * 10),
          avg_latency_ms: 854,
          satisfaction_rate: 0.92,
          faithfulness_score: 0.89,
          queries_change: 12,
          latency_change: -45,
          satisfaction_change: 0.05,
          faithfulness_change: 0.02,
          ans_relevancy: 0.87,
          hourly_timeline
        };
      } else if (path === '/api/experiments') {
        json = [
          {
            id: "exp_1",
            name: "gemini-1.5-pro-tuned",
            status: "completed",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            params: { chunk_size: 512, top_k: 5, temperature: 0.2 },
            metrics: { faithfulness: 0.89, answer_relevancy: 0.91, context_precision: 0.85, latency_ms: 854 }
          },
          {
            id: "exp_2",
            name: "gpt-4o-baseline",
            status: "completed",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
            params: { chunk_size: 1024, top_k: 3, temperature: 0.1 },
            metrics: { faithfulness: 0.82, answer_relevancy: 0.85, context_precision: 0.78, latency_ms: 1205 }
          },
          {
            id: "exp_3",
            name: "claude-3-opus-test",
            status: "running",
            timestamp: new Date().toISOString(),
            params: { chunk_size: 512, top_k: 5, temperature: 0.3 },
            metrics: {}
          }
        ];
      } else if (path === '/api/pipeline') {
        json = {
          current_stage: "Evaluating RAG responses",
          progress: 65 + Math.floor(Math.random() * 5),
          stages: [
            { name: "Data Ingestion", status: "completed" },
            { name: "Chunking & Embedding", status: "completed" },
            { name: "Evaluating RAG responses", status: "running" },
            { name: "Generating Report", status: "pending" }
          ],
          history: [
            { run_id: "run_102", status: "success", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() }
          ]
        };
      } else if (path === '/api/embeddings') {
        json = {
          status: "idle",
          docs_indexed: 5420,
          new_docs_pending: 12,
          history: [
            { event: "Sync complete", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() }
          ]
        };
      } else {
        throw new Error(`Mock endpoint not found: ${path}`);
      }

      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  // Initial fetch
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Polling
  useEffect(() => {
    if (!intervalMs) return;
    intervalRef.current = setInterval(() => fetchData(true), intervalMs);
    return () => clearInterval(intervalRef.current);
  }, [fetchData, intervalMs]);

  return { data, loading, error, refetch: () => fetchData(false), lastUpdated };
}

/**
 * useHealth — Polls /api/health to drive the header status badge.
 */
export function useHealth(intervalMs = 30_000) {
  const { data, error } = useApi('/api/health', null, intervalMs);
  return {
    isOnline: !error && data?.status === 'ok',
    model:    data?.model ?? 'unknown',
  };
}

/**
 * useQueryLogs — Fetches recent query/answer logs, refreshed every 30 seconds.
 */
export function useQueryLogs(limit = 50) {
  return useApi(`/api/logs?limit=${limit}`, [], 30_000);
}

/**
 * useMetrics — Fetches aggregated KPIs, refreshed every 60 seconds.
 */
export function useMetrics() {
  const fallback = {
    total_queries_today: 0,
    avg_latency_ms: 0,
    satisfaction_rate: 0,
    faithfulness_score: 0,
    queries_change: 0,
    latency_change: 0,
    satisfaction_change: 0,
    faithfulness_change: 0,
  };
  return useApi('/api/metrics', fallback, 60_000);
}

export function useExperiments() {
  return useApi('/api/experiments', [], 30_000);
}

export function usePipeline() {
  const fallback = { current_stage: "idle", progress: 0, stages: [], history: [] };
  return useApi('/api/pipeline', fallback, 15_000);
}

export function useEmbeddings() {
  const fallback = { status: "idle", docs_indexed: 0, new_docs_pending: 0, history: [] };
  return useApi('/api/embeddings', fallback, 30_000);
}

/**
 * postRating — Fire-and-forget helper to submit a thumbs up/down.
 * @param {number} logId
 * @param {'positive'|'negative'} rating
 */
export async function postRating(logId, rating) {
  try {
    await fetch(`${API_BASE}/api/rate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ log_id: logId, rating }),
    });
  } catch {
    // best-effort — don't crash the UI
  }
}
