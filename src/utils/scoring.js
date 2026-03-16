import { getSimilarMovies, getRecommendedMovies } from './tmdb';

/**
 * Fetch TMDB's own similar + recommended movies for a given movie.
 * Merges both lists, deduplicates, and excludes the source movie.
 * Returns up to `n` results sorted by popularity.
 */
export async function scoreMovies(movieId, n = 10) {
  const [similar, recommended] = await Promise.allSettled([
    getSimilarMovies(movieId),
    getRecommendedMovies(movieId),
  ]);

  const seen  = new Set([movieId]);
  const merged = [];

  const addMovies = (list) => {
    for (const m of list) {
      if (!seen.has(m.id)) { seen.add(m.id); merged.push(m); }
    }
  };

  if (similar.status     === "fulfilled") addMovies(similar.value);
  if (recommended.status === "fulfilled") addMovies(recommended.value);

  return merged
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, n);
}

/**
 * Filter a local movie pool by quiz preferences.
 * Used by QuizTab which operates on the already-fetched popular movies pool.
 */
export function scoreForQuiz(pool, prefs, n = 5) {
  return pool
    .map(m => {
      let score = 0;

      score += m.genres.filter(g => prefs.genres.includes(g)).length * 3;

      if (prefs.mood) {
        // Approximate mood from vote_average: high-rated ≈ quality/serious
        const isLight = m.genres.some(g => ["Comedy","Animation","Family","Romance"].includes(g));
        if (prefs.mood.includes("Upbeat") && isLight)  score += 4;
        if (prefs.mood.includes("Dark")   && !isLight) score += 4;
        if (prefs.mood.includes("Doesn't"))             score += 2;
      }

      if (prefs.era) {
        const mEra = (m.year || 0) < 2000 ? "classic" : "modern";
        if (prefs.era.includes("Golden") && mEra === "classic") score += 3;
        if (prefs.era.includes("Modern") && mEra === "modern")  score += 3;
        if (prefs.era.includes("Either"))                        score += 1;
      }

      if (prefs.runtime) {
        if (prefs.runtime.includes("Quick")    && m.runtime > 0 && m.runtime < 110)                     score += 2;
        if (prefs.runtime.includes("Standard") && m.runtime >= 90  && m.runtime <= 130)                 score += 2;
        if (prefs.runtime.includes("Epic")     && m.runtime > 130)                                      score += 2;
        if (prefs.runtime.includes("No"))                                                                score += 1;
        // If runtime unknown (0), give small bonus so movies still appear
        if (m.runtime === 0)                                                                             score += 0.5;
      }

      return { ...m, score };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
