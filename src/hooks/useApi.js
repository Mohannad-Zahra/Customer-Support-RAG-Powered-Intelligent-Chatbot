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
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Accept': 'application/json' },
        // 8-second timeout so we don't wait forever on a slow deployment
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      // On error keep showing last good data, just surface the error state
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
