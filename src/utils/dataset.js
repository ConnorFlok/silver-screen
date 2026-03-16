/**
 * src/utils/dataset.js
 *
 * Unified data layer combining two sources:
 *
 *  1. MovieLens (static, pre-built at build time)
 *     ├─ moviepool.json    – 6,000 movies for Now Playing / Quiz / Random
 *     └─ search_index.json – 87,461 movies for instant local search
 *
 *  2. TMDB Live API (fetched at runtime)
 *     ├─ /movie/popular       – current popular titles
 *     ├─ /movie/now_playing   – in cinemas right now
 *     ├─ /movie/upcoming      – coming soon
 *     ├─ /trending/movie/week – this week's trending
 *     └─ /search/movie        – live search fallback for new titles
 *
 * Deduplication: by tmdbId. If a movie exists in both MovieLens and the live
 * feed, the MovieLens entry is kept. Only genuinely new releases not in the
 * 87k dataset are added from the live feed.
 *
 * Movie shape
 * ────────────────────────────────────────────────────────────────
 *  id            – MovieLens movieId  OR  tmdbId for live-only movies
 *  tmdbId        – TMDB numeric id (used for all TMDB API calls)
 *  title         – clean title (year stripped for MovieLens)
 *  year          – integer release year
 *  genres        – string[]  e.g. ['Action', 'Drama']
 *  era           – 'classic' | 'modern'
 *  poster_path   – TMDB path  e.g. '/abc.jpg'  (null until fetched/live)
 *  overview      – synopsis string (empty until enriched)
 *  director      – string (empty until enriched)
 *  cast          – string[] top 5 (empty until enriched)
 *  runtime       – minutes int (0 until enriched)
 *  vote_average  – TMDB 0–10
 *  vote_count    – int
 *  popularity    – TMDB float
 *  _source       – 'movielens' | 'tmdb-live'
 *  _enriched     – bool — true once fetchMovieDetails() has been called
 */

import poolData from '../data/moviepool.json';
import {
  fetchMovieDetails,
  getPopularMovies,
  getNowPlayingMovies,
  getTrendingMovies,
  getTopRatedMovies,
  searchMovies as tmdbSearchAPI,
  normalizeMovie,
} from './tmdb';

const IMG_BASE = 'https://image.tmdb.org/t/p';

// ── Normalise a MovieLens pool entry ──────────────────────────────────────────
function normaliseML(entry) {
  return {
    id:           entry.id     ?? entry.i,
    tmdbId:       entry.tmdbId ?? entry.t,
    title:        entry.title  ?? entry.n,
    year:         entry.year   ?? entry.y  ?? 0,
    genres:       entry.genres ?? entry.g  ?? [],
    era:          entry.era    ?? ((entry.year ?? entry.y ?? 0) < 2000 ? 'classic' : 'modern'),
    overview:     entry.overview     || '',
    director:     entry.director     || '',
    cast:         entry.cast         || [],
    keywords:     entry.keywords     || [],
    runtime:      entry.runtime      || 0,
    vote_average: entry.vote_average || 0,
    vote_count:   entry.vote_count   || 0,
    popularity:   entry.popularity   || 0,
    poster_path:  entry.poster_path  || null,
    backdrop_path:entry.backdrop_path|| null,
    _source:      'movielens',
    _enriched:    entry._enriched    || false,
  };
}

/**
 * Convert a TMDB normalizeMovie() result into our unified shape.
 * For live-only movies, id === tmdbId (no MovieLens id exists).
 */
function normaliseTMDB(raw) {
  const m = typeof raw.genres === 'undefined' ? normalizeMovie(raw) : raw; // already normalised
  return {
    id:           m.id,           // tmdbId — no MovieLens id for new releases
    tmdbId:       m.id,
    title:        m.title,
    year:         m.year         || 0,
    genres:       m.genres       || [],
    era:          (m.year || 0) < 2000 ? 'classic' : 'modern',
    overview:     m.overview     || '',
    director:     m.director     || '',
    cast:         m.cast         || [],
    keywords:     m.keywords     || [],
    runtime:      m.runtime      || 0,
    vote_average: m.vote_average || 0,
    vote_count:   m.vote_count   || 0,
    popularity:   m.popularity   || 0,
    poster_path:  m.poster_path  || null,
    backdrop_path:m.backdrop_path|| null,
    _source:      'tmdb-live',
    _enriched:    false,
  };
}

// ── Core MovieLens pool (synchronous — bundled at build time) ─────────────────
export const MOVIE_POOL = poolData.map(normaliseML);

// Fast lookup maps (updated when live movies are merged in)
export let POOL_BY_ID     = Object.fromEntries(MOVIE_POOL.map(m => [m.id,     m]));
export let POOL_BY_TMDBID = Object.fromEntries(MOVIE_POOL.map(m => [m.tmdbId, m]));

// ── Live TMDB movies (populated at runtime) ───────────────────────────────────
export let LIVE_MOVIES = []; // new releases not in MovieLens

/**
 * Fetch current popular / now-playing / trending / top-rated movies from TMDB,
 * deduplicate against the MovieLens dataset by tmdbId, and return only the
 * genuinely new entries.
 *
 * Call this once on app mount. Results are stored in LIVE_MOVIES and the
 * lookup maps are updated in place.
 *
 * @returns {Object[]} array of new live movies added to the pool
 */
export async function loadLiveMovies() {
  const [popular, nowPlaying, trending, topRated] = await Promise.allSettled([
    getPopularMovies(),
    getNowPlayingMovies(),
    getTrendingMovies(),
    getTopRatedMovies(),
  ]);

  // Collect all results, dedupe within the live batch by tmdbId
  const seenTmdb = new Set(MOVIE_POOL.map(m => m.tmdbId));
  const newMovies = [];

  const addBatch = (result) => {
    if (result.status !== 'fulfilled') return;
    for (const m of result.value) {
      const tmdbId = m.id ?? m.tmdbId;
      if (!tmdbId || seenTmdb.has(tmdbId)) continue; // already in MovieLens
      seenTmdb.add(tmdbId);
      newMovies.push(normaliseTMDB(m));
    }
  };

  addBatch(popular);
  addBatch(nowPlaying);
  addBatch(trending);
  addBatch(topRated);

  // Sort live movies by popularity descending
  newMovies.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

  LIVE_MOVIES = newMovies;

  // Update lookup maps to include live movies
  newMovies.forEach(m => {
    POOL_BY_ID[m.id]         = m;
    POOL_BY_TMDBID[m.tmdbId] = m;
  });

  return newMovies;
}

/**
 * Get the combined pool: live TMDB movies first (newest/most popular),
 * followed by MovieLens movies.
 * Used by NowPlayingTab, QuizTab, RandomTab.
 */
export function getCombinedPool() {
  return [...LIVE_MOVIES, ...MOVIE_POOL];
}

// ── Full search index (lazy — loaded on first search keystroke) ───────────────
let _searchIndex   = null;
let _searchLoading = false;
let _searchQueue   = [];

export async function getSearchIndex() {
  if (_searchIndex) return _searchIndex;
  if (_searchLoading) return new Promise(r => _searchQueue.push(r));
  _searchLoading = true;
  const { default: raw } = await import('../data/search_index.json');
  _searchIndex = raw.map(normaliseML);
  _searchLoading = false;
  _searchQueue.forEach(r => r(_searchIndex));
  _searchQueue = [];
  return _searchIndex;
}

/**
 * Hybrid search:
 *  1. Search MovieLens index (87k titles, instant, local)
 *  2. Search TMDB API in parallel (catches new/recent movies not in MovieLens)
 *  3. Deduplicate by tmdbId — MovieLens entry wins if both match
 *  4. Return merged results, local matches first
 *
 * @param {string} query
 * @param {number} limit  total results to return (default 12)
 */
export async function hybridSearch(query, limit = 12) {
  if (!query.trim()) return [];

  const q = query.toLowerCase();

  // Run both searches in parallel
  const [localResults, tmdbResults] = await Promise.allSettled([
    // Local: full 87k scan
    getSearchIndex().then(index => {
      const out = [];
      for (const m of index) {
        if (m.title.toLowerCase().includes(q)) {
          out.push(m);
          if (out.length >= limit) break;
        }
      }
      return out;
    }),
    // Live: TMDB API search
    tmdbSearchAPI(query).then(results => results.map(normaliseTMDB)),
  ]);

  const local = localResults.status === 'fulfilled' ? localResults.value : [];
  const live  = tmdbResults.status  === 'fulfilled' ? tmdbResults.value  : [];

  // Deduplicate: build set of tmdbIds already in local results
  const seenTmdb = new Set(local.map(m => m.tmdbId).filter(Boolean));

  // Add live results that aren't already covered by local results
  const liveOnly = live.filter(m => m.tmdbId && !seenTmdb.has(m.tmdbId));

  // Merge: local first (has MovieLens context), then new live-only results
  return [...local, ...liveOnly].slice(0, limit);
}

// ── TMDB enrichment cache ─────────────────────────────────────────────────────
const _enrichCache = new Map();

/**
 * Enrich a movie with full TMDB metadata (poster, overview, cast, director, runtime).
 * Cached in memory — repeated calls for the same tmdbId are instant.
 * Mutates the passed movie object in-place and returns it.
 */
export async function enrichMovie(movie) {
  if (movie._enriched || !movie.tmdbId) return movie;
  if (_enrichCache.has(movie.tmdbId)) {
    return Object.assign(movie, _enrichCache.get(movie.tmdbId), { _enriched: true });
  }
  try {
    const details = await fetchMovieDetails(movie.tmdbId);
    const patch = {
      overview:      details.overview      || movie.overview,
      director:      details.director      || movie.director,
      cast:          details.cast?.length  ? details.cast    : movie.cast,
      keywords:      details.keywords?.length ? details.keywords : movie.keywords,
      runtime:       details.runtime       || movie.runtime,
      vote_average:  details.vote_average  || movie.vote_average,
      vote_count:    details.vote_count    || movie.vote_count,
      popularity:    details.popularity    || movie.popularity,
      poster_path:   details.poster_path   || movie.poster_path,
      backdrop_path: details.backdrop_path || movie.backdrop_path,
      _enriched:     true,
    };
    _enrichCache.set(movie.tmdbId, patch);
    return Object.assign(movie, patch);
  } catch (_) {
    movie._enriched = true; // don't retry
    return movie;
  }
}

/**
 * Batch-fetch poster images for movies that don't have one yet.
 * Runs in parallel batches of batchSize to respect TMDB rate limits.
 * Mutates movies in-place. Calls onProgress(done, total) after each batch.
 */
export async function batchFetchPosters(movies, batchSize = 8, onProgress) {
  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const need    = movies.filter(m => !m.poster_path && m.tmdbId);
  const total   = need.length;
  let done      = 0;

  for (let i = 0; i < need.length; i += batchSize) {
    const batch = need.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async movie => {
        try {
          const res  = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdbId}?api_key=${API_KEY}`);
          const data = await res.json();
          if (data.poster_path) {
            movie.poster_path   = data.poster_path;
            movie.backdrop_path = data.backdrop_path || null;
            if (!movie.overview    && data.overview)    movie.overview    = data.overview;
            if (!movie.popularity  && data.popularity)  movie.popularity  = data.popularity;
            if (!movie.vote_average && data.vote_average) {
              movie.vote_average = data.vote_average;
              movie.vote_count   = data.vote_count;
            }
          }
        } catch (_) { /* silent — SVG fallback shows */ }
        done++;
        onProgress?.(done, total);
      })
    );
  }
}
