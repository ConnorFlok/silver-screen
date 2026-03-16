/**
 * src/utils/api.js
 *
 * API client for the CineScope FastAPI backend.
 *
 * Every function tries the backend first. If the backend is unavailable
 * (server not running, CORS error, network timeout) it falls back silently
 * to local scoring so the app keeps working without any Python server.
 *
 * Backend base URL is set via the VITE_API_URL environment variable.
 * Default: http://localhost:8000
 *
 * To disable the backend entirely and always use local scoring:
 *   VITE_API_URL=disabled
 */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const DISABLED = API_URL === 'disabled';
const TIMEOUT_MS = 4000; // give up after 4 s

// ── Track whether the backend is reachable ────────────────────────────────────
// Set to false on first failure, reset to true when /health succeeds.
// Avoids hammering a down server with failed requests.
let _backendAvailable = !DISABLED;
let _lastCheck = 0;
const RECHECK_INTERVAL = 30_000; // retry backend every 30 s

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function isBackendUp() {
  if (DISABLED) return false;
  const now = Date.now();
  // Re-check periodically even if we think it's down
  if (!_backendAvailable && now - _lastCheck < RECHECK_INTERVAL) return false;
  try {
    const res = await fetchWithTimeout(`${API_URL}/health`);
    _backendAvailable = res.ok;
    _lastCheck = now;
    return _backendAvailable;
  } catch {
    _backendAvailable = false;
    _lastCheck = now;
    return false;
  }
}

async function apiGet(path) {
  if (!_backendAvailable) return null;
  try {
    const res = await fetchWithTimeout(`${API_URL}${path}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    _backendAvailable = false;
    return null;
  }
}

async function apiPost(path, body) {
  if (!_backendAvailable) return null;
  try {
    const res = await fetchWithTimeout(`${API_URL}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    _backendAvailable = false;
    return null;
  }
}

// ── Shape converter ───────────────────────────────────────────────────────────
// The backend returns MovieLens-shaped dicts. Convert to our frontend shape.
function backendMovieToFrontend(m) {
  if (!m) return null;
  return {
    id:           m.movie_id ?? m.id,
    tmdbId:       m.tmdbId   ?? null,
    title:        m.title    ?? '',
    year:         m.year     ?? 0,
    genres:       m.genres   ?? m.genres_list ?? [],
    era:          (m.year ?? 0) < 2000 ? 'classic' : 'modern',
    overview:     m.overview ?? '',
    director:     m.director ?? '',
    cast:         m.cast_list ?? m.cast ?? [],
    runtime:      m.runtime  ?? 0,
    vote_average: m.vote_average ?? 0,
    vote_count:   m.vote_count   ?? 0,
    popularity:   m.popularity   ?? 0,
    cluster:      m.cluster      ?? -1,
    silhouette:   m.silhouette   ?? 0,
    similarity:   m.similarity   ?? m.score ?? 0,
    // Poster comes from TMDB — keep any existing poster_path
    poster_path:  m.poster_path  ?? null,
    _source:      'backend',
    _enriched:    true,
  };
}

// ── Public API functions ──────────────────────────────────────────────────────

/**
 * Check if the backend is currently reachable.
 * Call this on app mount to set the initial availability flag.
 */
export async function checkBackend() {
  const up = await isBackendUp();
  console.log(`[API] Backend ${up ? '✅ connected' : '⚠️ unavailable'} — ${API_URL}`);
  return up;
}

/**
 * Search movies by partial title.
 * Returns null if backend unavailable (caller uses local search as fallback).
 */
export async function backendSearch(query, limit = 10) {
  if (!_backendAvailable) return null;
  const data = await apiGet(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!data) return null;
  return data.map(backendMovieToFrontend);
}

/**
 * Get full metadata for a movie by its MovieLens movieId.
 * Returns null if backend unavailable.
 */
export async function backendGetMovie(movieId) {
  if (!_backendAvailable) return null;
  const data = await apiGet(`/movie/${movieId}`);
  return data ? backendMovieToFrontend(data) : null;
}

/**
 * Get TF-IDF cosine-similar movies for a given movieId.
 * Returns null if backend unavailable (caller uses genre scoring as fallback).
 *
 * Results include a `similarity` field (0–1 cosine score).
 */
export async function backendSimilar(movieId, limit = 10) {
  if (!_backendAvailable) return null;
  const data = await apiGet(`/similar/${movieId}?limit=${limit}`);
  if (!data) return null;
  return data.map(backendMovieToFrontend);
}

/**
 * Get same-cluster movies for a given movieId.
 * Returns null if backend unavailable.
 *
 * Results include `cluster` and `silhouette` fields.
 */
export async function backendCluster(movieId, limit = 10, sort = 'silhouette') {
  if (!_backendAvailable) return null;
  const data = await apiGet(`/cluster/${movieId}?limit=${limit}&sort=${sort}`);
  if (!data) return null;
  return data.map(backendMovieToFrontend);
}

/**
 * Get a summary of all K-Means clusters.
 */
export async function backendClusters() {
  if (!_backendAvailable) return null;
  return await apiGet('/clusters');
}

/**
 * Find movies similar to a free-text description (realtime TF-IDF).
 * Returns null if backend unavailable.
 */
export async function backendSimilarText(text, limit = 10) {
  if (!_backendAvailable) return null;
  const data = await apiPost('/similar-text', { text, limit });
  if (!data) return null;
  return data.map(backendMovieToFrontend);
}

/**
 * Expose the current backend availability flag.
 * Read-only — updated automatically by API calls.
 */
export function isBackendAvailable() {
  return _backendAvailable && !DISABLED;
}
