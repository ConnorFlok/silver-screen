const API_KEY  = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

// ── Genre ID → name map ───────────────────────────────────────────────────────
export const GENRE_ID_MAP = {
  28:    "Action",    12:    "Adventure",  16:    "Animation",
  35:    "Comedy",    80:    "Crime",      99:    "Documentary",
  18:    "Drama",     10751: "Family",     14:    "Fantasy",
  36:    "History",   27:    "Horror",     10402: "Music",
  9648:  "Mystery",   10749: "Romance",   878:   "Sci-Fi",
  10770: "TV Movie",  53:    "Thriller",  10752: "War",
  37:    "Western",
};

// ── Poster URL helpers ────────────────────────────────────────────────────────
export const posterUrl = (path, size = "w342") =>
  path ? `${IMG_BASE}/${size}${path}` : null;

export const backdropUrl = (path, size = "w780") =>
  path ? `${IMG_BASE}/${size}${path}` : null;

export const profileUrl = (path, size = "w185") =>
  path ? `${IMG_BASE}/${size}${path}` : null;

// ── Normalize a raw TMDB movie object into our internal shape ────────────────
export function normalizeMovie(raw) {
  const genres = (raw.genre_ids || raw.genres?.map(g => g.id) || [])
    .map(id => GENRE_ID_MAP[id])
    .filter(Boolean);

  return {
    id:           raw.id,
    title:        raw.title || raw.name || "Untitled",
    year:         raw.release_date
                    ? parseInt(raw.release_date.split("-")[0], 10)
                    : 0,
    overview:     raw.overview || "",
    vote_average: raw.vote_average || 0,
    vote_count:   raw.vote_count   || 0,
    popularity:   raw.popularity   || 0,
    poster_path:  raw.poster_path  || null,
    backdrop_path:raw.backdrop_path|| null,
    genre_ids:    raw.genre_ids    || raw.genres?.map(g => g.id) || [],
    genres:       genres,
    // Enriched by fetchMovieDetails() — empty until then
    runtime:      raw.runtime  || 0,
    director:     raw.director || "",
    cast:         raw.cast     || [],
    keywords:     raw.keywords || [],
    mood:         "serious",   // cannot derive without ML — kept for quiz compat
    era:          (raw.release_date?.split("-")[0] || "2000") < "2000" ? "classic" : "modern",
  };
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json();
}

// ── Movie list endpoints ──────────────────────────────────────────────────────

/** Movies currently in theatres. */
export const getPopularMovies = async () => {
  const data = await tmdbFetch("/movie/popular");
  return data.results.map(normalizeMovie);
};

/** Search movies by title query. */
export const searchMovies = async (query) => {
  const data = await tmdbFetch("/search/movie", { query: encodeURIComponent(query) });
  return data.results.map(normalizeMovie);
};

/** Global trending movies (week window). */
export const getTrendingMovies = async () => {
  const data = await tmdbFetch("/trending/movie/week");
  return data.results.map(normalizeMovie);
};

/** Now-playing movies (currently in cinemas). */
export const getNowPlayingMovies = async () => {
  const data = await tmdbFetch("/movie/now_playing");
  return data.results.map(normalizeMovie);
};

/** Top-rated movies of all time. */
export const getTopRatedMovies = async () => {
  const data = await tmdbFetch("/movie/top_rated");
  return data.results.map(normalizeMovie);
};

/** Movies filtered by genre ID. */
export const getMoviesByGenre = async (genreId) => {
  const data = await tmdbFetch("/discover/movie", {
    with_genres: genreId,
    sort_by: "popularity.desc",
  });
  return data.results.map(normalizeMovie);
};

// ── Single-movie detail ───────────────────────────────────────────────────────

/**
 * Fetch full details for a single movie, including runtime, full genre names,
 * credits (director + top cast), and keywords.
 * Returns an enriched normalized movie object.
 */
export const fetchMovieDetails = async (movieId) => {
  const [details, credits, kwData] = await Promise.all([
    tmdbFetch(`/movie/${movieId}`),
    tmdbFetch(`/movie/${movieId}/credits`),
    tmdbFetch(`/movie/${movieId}/keywords`),
  ]);

  const director = (credits.crew || [])
    .find(c => c.job === "Director")?.name || "";

  const cast = (credits.cast || [])
    .slice(0, 5)
    .map(c => c.name);

  const keywords = (kwData.keywords || [])
    .slice(0, 10)
    .map(k => k.name);

  return normalizeMovie({
    ...details,
    director,
    cast,
    keywords,
  });
};

/** Fetch TMDB's own similar-movie list for a given movie ID. */
export const getSimilarMovies = async (movieId) => {
  const data = await tmdbFetch(`/movie/${movieId}/similar`);
  return data.results.map(normalizeMovie);
};

/** Fetch movies recommended by TMDB for a given movie ID. */
export const getRecommendedMovies = async (movieId) => {
  const data = await tmdbFetch(`/movie/${movieId}/recommendations`);
  return data.results.map(normalizeMovie);
};

// ── People ────────────────────────────────────────────────────────────────────

/** Search for people (actors, directors) by name. */
export const searchPeople = async (query) => {
  const data = await tmdbFetch("/search/person", { query: encodeURIComponent(query) });
  return data.results;
};

/** Get all movie credits for a person by their TMDB person ID. */
export const getPersonMovieCredits = async (personId) => {
  const data = await tmdbFetch(`/person/${personId}/movie_credits`);
  return (data.cast || [])
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .map(normalizeMovie);
};
