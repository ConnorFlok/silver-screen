/**
 * src/utils/movielens.js
 *
 * Parses the MovieLens movies.csv and links.csv files and normalises them
 * into the same movie shape used throughout the app.
 *
 * MovieLens schema
 * ─────────────────────────────────────────────────────
 * movies.csv  │ movieId │ title             │ genres
 *             │ 1       │ Toy Story (1995)  │ Adventure|Animation|Comedy
 *
 * links.csv   │ movieId │ imdbId  │ tmdbId
 *             │ 1       │ 0114709 │ 862
 *
 * The tmdbId column maps each MovieLens movie to its TMDB entry so we can
 * still fetch real poster images from the TMDB image CDN.
 *
 * Genre name mapping
 * ─────────────────────────────────────────────────────
 * MovieLens uses slightly different genre names from TMDB:
 *   Children  →  Family
 *   Film-Noir →  Thriller
 *   IMAX      →  (dropped)
 *   (no genres listed) → []
 */

import { posterUrl } from './tmdb';

// ── Genre normalisation map ───────────────────────────────────────────────────
const GENRE_NORM = {
  Children:   'Family',
  'Film-Noir':'Thriller',
  'Sci-Fi':   'Sci-Fi',
  IMAX:        null,          // drop IMAX as a genre
  '(no genres listed)': null,
};

function normaliseGenre(g) {
  if (g in GENRE_NORM) return GENRE_NORM[g];
  return g;
}

// ── Title / year extraction ───────────────────────────────────────────────────
/**
 * "Toy Story (1995)"  →  { cleanTitle: "Toy Story", year: 1995 }
 * "Heat (1995)"       →  { cleanTitle: "Heat",      year: 1995 }
 * "Nixon"             →  { cleanTitle: "Nixon",      year: 0    }
 *
 * Also handles "Article, The (1995)" → normalised to "The Article (1995)"
 * so titles sort and display naturally.
 */
export function parseTitleYear(raw) {
  if (!raw) return { cleanTitle: '', year: 0 };

  // Extract trailing (YYYY)
  const yearMatch = raw.match(/\((\d{4})\)\s*$/);
  const year      = yearMatch ? parseInt(yearMatch[1], 10) : 0;

  // Strip year from title
  let title = raw.replace(/\s*\(\d{4}\)\s*$/, '').trim();

  // Move trailing ", The" / ", A" / ", An" to the front
  title = title.replace(/^(.*),\s*(The|A|An|Les|La|Le|El|Los|Las|Das|Die|Der|Ein|Une|Un)$/i,
    (_, rest, article) => `${article} ${rest}`);

  return { cleanTitle: title, year };
}

// ── CSV parser (handles quoted fields) ───────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Handle \r\n line endings
  const header = lines[0].replace(/\r$/, '').split(',');

  return lines.slice(1).map(line => {
    line = line.replace(/\r$/, '');
    // Split on commas but respect double-quoted fields
    const fields = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { fields.push(cur); cur = ''; }
      else { cur += ch; }
    }
    fields.push(cur);

    const row = {};
    header.forEach((h, i) => { row[h.trim()] = (fields[i] || '').trim(); });
    return row;
  });
}

// ── Main load function ────────────────────────────────────────────────────────
/**
 * Parse the text content of movies.csv and links.csv and return a normalised
 * movie array ready for use in the app.
 *
 * @param {string} moviesCSV  – raw text of movies.csv
 * @param {string} linksCSV   – raw text of links.csv
 * @returns {Object[]}         – normalised movie objects
 */
export function parseMovieLensData(moviesCSV, linksCSV) {
  const movieRows = parseCSV(moviesCSV);
  const linkRows  = parseCSV(linksCSV);

  // Build movieId → tmdbId lookup from links.csv
  const tmdbMap = {};
  const imdbMap = {};
  for (const row of linkRows) {
    const mid    = parseInt(row.movieId, 10);
    const tmdbId = row.tmdbId ? parseInt(row.tmdbId, 10) : null;
    const imdbId = row.imdbId || null;
    if (mid && tmdbId) tmdbMap[mid] = tmdbId;
    if (mid && imdbId) imdbMap[mid] = imdbId;
  }

  const movies = [];

  for (const row of movieRows) {
    const movieId = parseInt(row.movieId, 10);
    if (!movieId) continue;

    const { cleanTitle, year } = parseTitleYear(row.title);

    // Parse pipe-separated genres
    const genres = (row.genres || '')
      .split('|')
      .map(g => normaliseGenre(g.trim()))
      .filter(Boolean);  // drop null/empty

    const tmdbId = tmdbMap[movieId] || null;
    const imdbId = imdbMap[movieId] || null;

    movies.push({
      // Internal IDs
      id:        movieId,          // MovieLens movieId (used as our app id)
      movieId,
      tmdbId,
      imdbId,

      // Display fields
      title:        cleanTitle,
      originalTitle:row.title,    // "Toy Story (1995)" — kept for reference
      year,
      genres,
      overview:     '',           // not in MovieLens — enriched by TMDB if needed
      director:     '',
      cast:         [],
      keywords:     [],

      // Numeric signals (populated from ratings.csv if provided)
      avg_rating:   0,
      rating_count: 0,
      popularity:   0,
      runtime:      0,
      vote_average: 0,
      vote_count:   0,

      // Poster — derived from tmdbId
      poster_path:  null,         // fetched lazily from TMDB
      tmdb_poster:  null,         // set after TMDB fetch

      // ML fields (set by notebook artifacts if loaded)
      cluster:    -1,
      silhouette: 0,

      era: year > 0 && year < 2000 ? 'classic' : 'modern',
      mood: 'serious',
    });
  }

  return movies;
}

/**
 * Aggregate ratings.csv into per-movie avg_rating and rating_count,
 * then merge into the movies array in-place.
 *
 * @param {Object[]} movies    – output of parseMovieLensData()
 * @param {string}   ratingsCSV – raw text of ratings.csv
 */
export function mergeRatings(movies, ratingsCSV) {
  const rows = parseCSV(ratingsCSV);

  // Accumulate sum + count per movieId
  const acc = {};
  for (const row of rows) {
    const mid    = parseInt(row.movieId, 10);
    const rating = parseFloat(row.rating);
    if (!mid || isNaN(rating)) continue;
    if (!acc[mid]) acc[mid] = { sum: 0, count: 0 };
    acc[mid].sum   += rating;
    acc[mid].count += 1;
  }

  // Merge back
  for (const m of movies) {
    const stat = acc[m.movieId];
    if (stat) {
      m.avg_rating   = Math.round((stat.sum / stat.count) * 100) / 100;
      m.rating_count = stat.count;
      m.vote_average = m.avg_rating * 2;  // scale 0–5 → 0–10 for display compat
      m.vote_count   = stat.count;
    }
  }
}

// ── Poster URL helper ─────────────────────────────────────────────────────────
/**
 * Given a movie object, return the best poster URL available.
 *  1. If tmdb_poster was already fetched, use it.
 *  2. If tmdbId exists, build a placeholder URL that the component can
 *     trigger a lazy fetch for.
 *  3. Fall back to SVG art-deco poster.
 */
export function moviePosterUrl(movie, size = 'w342') {
  if (movie.tmdb_poster) return movie.tmdb_poster;
  return null;  // caller falls back to posterDataUri()
}

// ── Batch TMDB poster fetch ───────────────────────────────────────────────────
const API_KEY  = import.meta.env.VITE_TMDB_API_KEY;
const IMG_BASE = 'https://image.tmdb.org/t/p';

/**
 * Fetch poster_path for a batch of movies that have a tmdbId.
 * Updates each movie object in-place with tmdb_poster URL.
 *
 * Processes in parallel batches of `batchSize` to avoid rate limits.
 * Only fetches movies that don't already have a poster.
 *
 * @param {Object[]} movies
 * @param {number}   batchSize  – concurrent requests per batch (default 10)
 * @param {Function} onProgress – optional callback(fetched, total)
 */
export async function fetchPostersForMovies(movies, batchSize = 10, onProgress) {
  const needPosters = movies.filter(m => m.tmdbId && !m.tmdb_poster);
  const total = needPosters.length;
  let fetched = 0;

  for (let i = 0; i < needPosters.length; i += batchSize) {
    const batch = needPosters.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (movie) => {
        try {
          const url = `https://api.themoviedb.org/3/movie/${movie.tmdbId}?api_key=${API_KEY}&fields=poster_path`;
          const res  = await fetch(url);
          if (!res.ok) return;
          const data = await res.json();
          if (data.poster_path) {
            movie.tmdb_poster  = `${IMG_BASE}/w342${data.poster_path}`;
            movie.poster_path  = data.poster_path;
            // Also enrich overview if missing
            if (!movie.overview && data.overview) movie.overview = data.overview;
            if (!movie.runtime  && data.runtime)  movie.runtime  = data.runtime;
          }
        } catch (_) {
          // Silently skip — SVG fallback will be used
        }
        fetched++;
        onProgress?.(fetched, total);
      })
    );
  }
}
