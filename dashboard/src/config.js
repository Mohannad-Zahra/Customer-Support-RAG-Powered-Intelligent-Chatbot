/**
 * config.js — Single source of truth for the RAG backend URL.
 *
 * Set VITE_API_BASE in `.env.local` to point at your deployment:
 *   VITE_API_BASE=https://your-deployed-url.com
 *
 * If the variable is not set, it defaults to the local dev server port.
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';
