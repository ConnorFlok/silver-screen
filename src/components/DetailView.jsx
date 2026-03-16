import { useState, useEffect } from 'react';
import { enrichMovie } from '../utils/dataset';
import { backendSimilar, backendCluster, backendGetMovie, isBackendAvailable } from '../utils/api';
import { getMoviePoster } from '../utils/posters';
import { SectionHead, GenreChip } from './Shared';
import { MovieRow } from './MovieRow';

// ── Local genre-overlap fallback (used when backend is offline) ───────────────
function scoreLocalMovies(ref, pool, n = 10) {
  const refGenres = new Set(ref.genres);
  return pool
    .filter(m => m.id !== ref.id)
    .map(m => {
      const shared = m.genres.filter(g => refGenres.has(g));
      let score = shared.length * 3;
      if (m.era === ref.era)       score += 1;
      if (m.vote_average >= 7.5)   score += 1;
      return {
        ...m,
        score,
        similarity: 0,
        reasons: shared.length > 0
          ? [`Shares ${shared.slice(0, 2).join(', ')}`]
          : [],
      };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score || b.vote_average - a.vote_average)
    .slice(0, n);
}

export function DetailView({
  movie: initialMovie,
  watchlist, onToggleWl,
  onBack, onSelect, onMarkSeen,
  moviePool,
}) {
  const [movie,        setMovie]        = useState(initialMovie);
  const [recs,         setRecs]         = useState([]);
  const [clusterRecs,  setClusterRecs]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [usingBackend, setUsingBackend] = useState(false);
  const [activeTab,    setActiveTab]    = useState('similar'); // 'similar' | 'cluster'

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMovie(initialMovie);
    setRecs([]);
    setClusterRecs([]);

    async function load() {
      try {
        // ── Step 1: Enrich movie details (TMDB poster, overview, cast) ────
        const enriched = await enrichMovie({ ...initialMovie });
        if (!cancelled) setMovie(enriched);

        const movieId = initialMovie.id;
        const backend = isBackendAvailable();

        if (backend) {
          // ── Backend path: real TF-IDF + K-Means ─────────────────────────
          const [simResults, clusterResults, fullMeta] = await Promise.allSettled([
            backendSimilar(movieId, 10),
            backendCluster(movieId, 10, 'silhouette'),
            backendGetMovie(movieId),
          ]);

          if (cancelled) return;
          setUsingBackend(true);

          // Merge backend metadata (cluster, silhouette) into displayed movie
          if (fullMeta.status === 'fulfilled' && fullMeta.value) {
            setMovie(m => ({
              ...m,
              cluster:    fullMeta.value.cluster    ?? m.cluster,
              silhouette: fullMeta.value.silhouette ?? m.silhouette,
            }));
          }

          if (simResults.status === 'fulfilled' && simResults.value) {
            // Attach TMDB poster data from local pool where available
            const withPosters = simResults.value.map(r => {
              const local = (moviePool || []).find(m => m.id === r.id);
              return local ? { ...r, poster_path: local.poster_path ?? r.poster_path } : r;
            });
            setRecs(withPosters);
          } else {
            // Backend returned null for similar — fall back to local
            setRecs(scoreLocalMovies(enriched, moviePool || []));
          }

          if (clusterResults.status === 'fulfilled' && clusterResults.value) {
            const withPosters = clusterResults.value.map(r => {
              const local = (moviePool || []).find(m => m.id === r.id);
              return local ? { ...r, poster_path: local.poster_path ?? r.poster_path } : r;
            });
            setClusterRecs(withPosters);
          }

        } else {
          // ── Offline path: local genre overlap scoring ────────────────────
          setUsingBackend(false);
          setRecs(scoreLocalMovies(enriched, moviePool || []));
        }

      } catch (e) {
        console.error('DetailView load error:', e);
        if (!cancelled) setRecs(scoreLocalMovies(initialMovie, moviePool || []));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [initialMovie.id]);

  const img    = getMoviePoster(movie, 'w342');
  const inList = !!watchlist[movie.id];
  const isSeen = watchlist[movie.id]?.seen;

  return (
    <div>
      <button className="detail-back" onClick={onBack}>← Back to the Lobby</button>

      {/* ── Movie hero card ─────────────────────────────────────────────── */}
      <div className="detail-hero">
        <div className="detail-poster"><img src={img} alt={`${movie.title} poster`} /></div>
        <div className="detail-content">
          <div className="detail-title">{movie.title}</div>
          <div className="detail-meta">
            {movie.year > 0    && <span>{movie.year}</span>}
            {movie.runtime > 0 && <span>{movie.runtime} min</span>}
            {movie.director    && <span className="dm-dir">dir. {movie.director}</span>}
            {movie.vote_average > 0 && (
              <span>⭐ {movie.vote_average.toFixed(1)}
                {movie.vote_count > 0 && ` (${Number(movie.vote_count).toLocaleString()} votes)`}
              </span>
            )}
            {movie.cluster >= 0 && (
              <span style={{ color: 'var(--orchid)', fontSize: '11px' }}>
                Cluster {movie.cluster}
                {movie.silhouette > 0 && ` · fit ${movie.silhouette.toFixed(3)}`}
              </span>
            )}
          </div>
          <div className="detail-genres">
            {movie.genres.map(g => <GenreChip key={g} genre={g} />)}
          </div>
          {movie.overview && <div className="detail-overview">"{movie.overview}"</div>}
          {movie.cast?.length > 0 && (
            <div className="detail-cast"><strong>Cast</strong>{movie.cast.join(' · ')}</div>
          )}
          <div className="detail-actions">
            <button className="btn-gold" onClick={() => onToggleWl(movie.id)}>
              {inList ? '★ In Your Marquee' : '☆ Add to Marquee'}
            </button>
            {inList && !isSeen && (
              <button className="btn-ghost" onClick={() => onMarkSeen(movie.id)}>
                Mark as Seen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Source badge ────────────────────────────────────────────────── */}
      {!loading && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          marginBottom: '4px',
        }}>
          <span style={{
            fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase',
            color: usingBackend ? 'var(--teal)' : 'var(--silver)',
            opacity: 0.75,
          }}>
            {usingBackend ? '✦ ML Model Active' : '◇ Local Scoring (start backend for full ML)'}
          </span>
        </div>
      )}

      {/* ── Recommendation tabs (Similar / Cluster) ──────────────────────── */}
      {usingBackend && clusterRecs.length > 0 ? (
        <>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {[
              { key: 'similar', label: '✦ TF-IDF Similar' },
              { key: 'cluster', label: '◈ Same Cluster' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  background:   activeTab === key ? 'rgba(201,168,76,.12)' : 'transparent',
                  border:       `1px solid ${activeTab === key ? 'var(--gold)' : 'rgba(122,99,48,.4)'}`,
                  color:        activeTab === key ? 'var(--gold)' : 'var(--silver)',
                  fontFamily:   "'Cormorant Garamond', serif",
                  fontSize:     '12px',
                  letterSpacing:'2px',
                  padding:      '7px 16px',
                  cursor:       'pointer',
                  transition:   'all .2s',
                }}
              >{label}</button>
            ))}
          </div>

          {activeTab === 'similar' && (
            <>
              <SectionHead title={`Because You Like ${movie.title}`} />
              <p className="section-note">
                "TF-IDF cosine similarity — pictures built from the same fine cloth, darling."
              </p>
              <RecommendationList
                recs={recs} loading={loading} showSimilarity
                watchlist={watchlist} onToggleWl={onToggleWl} onSelect={onSelect}
              />
            </>
          )}

          {activeTab === 'cluster' && (
            <>
              <SectionHead title={`More from Cluster ${movie.cluster ?? ''}`} />
              <p className="section-note">
                "K-Means neighbours — the same genre era and audience, sorted by cluster fit."
              </p>
              <RecommendationList
                recs={clusterRecs} loading={loading} showSilhouette
                watchlist={watchlist} onToggleWl={onToggleWl} onSelect={onSelect}
              />
            </>
          )}
        </>
      ) : (
        <>
          <SectionHead title={`Because You Like ${movie.title}`} />
          <p className="section-note">
            {usingBackend
              ? '"TF-IDF cosine similarity — pictures cut from the same fine cloth, darling."'
              : '"Genre-matched recommendations — start the backend for full ML results."'}
          </p>
          <RecommendationList
            recs={recs} loading={loading} showSimilarity={usingBackend}
            watchlist={watchlist} onToggleWl={onToggleWl} onSelect={onSelect}
          />
        </>
      )}
    </div>
  );
}

// ── Recommendation list sub-component ─────────────────────────────────────────
function RecommendationList({ recs, loading, showSimilarity, showSilhouette, watchlist, onToggleWl, onSelect }) {
  if (loading) {
    return (
      <div className="empty-state">
        <div style={{ fontSize:'28px', animation:'reelSpin 1s linear infinite', display:'inline-block' }}>🎬</div>
        <p style={{ marginTop:'12px' }}>Consulting the programme…</p>
      </div>
    );
  }
  if (recs.length === 0) {
    return (
      <div className="empty-state">
        <p>No similar pictures found — quite the singular taste!</p>
      </div>
    );
  }
  return (
    <>
      {recs.map((r, i) => (
        <div key={r.id} className="movie-row" onClick={() => onSelect(r.id)}>
          <div className="mr-thumb">
            <img src={getMoviePoster(r, 'w92')} alt="" loading="lazy" />
          </div>
          <div className="movie-row-info">
            <div style={{ fontSize:'9px', letterSpacing:'3px', textTransform:'uppercase', color:'var(--gold-d)', marginBottom:'2px' }}>
              #{i + 1} Recommendation
            </div>
            <div className="movie-row-title">{r.title}</div>
            <div className="movie-row-meta">
              {r.year > 0 && `${r.year}`}
              {r.vote_average > 0 && ` · ⭐ ${r.vote_average.toFixed(1)}`}
              {showSimilarity && r.similarity > 0 && (
                <span style={{ color:'var(--teal)', marginLeft:'6px', fontSize:'10px' }}>
                  {(r.similarity * 100).toFixed(1)}% similar
                </span>
              )}
              {showSilhouette && r.silhouette > 0 && (
                <span style={{ color:'var(--orchid)', marginLeft:'6px', fontSize:'10px' }}>
                  fit {r.silhouette.toFixed(3)}
                </span>
              )}
            </div>
            <div className="movie-row-genres">
              {(r.genres || []).slice(0, 3).map(g => <GenreChip key={g} genre={g} />)}
            </div>
            {r.reasons?.length > 0 && (
              <div style={{ marginTop:'4px' }}>
                {r.reasons.map(reason => <span key={reason} className="why-tag">{reason}</span>)}
              </div>
            )}
          </div>
          <div className="movie-row-score">
            <button
              className={`wl-icon-btn${watchlist[r.id] ? ' in-list' : ''}`}
              onClick={e => { e.stopPropagation(); onToggleWl(r.id); }}
            >
              {watchlist[r.id] ? '★' : '☆'}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
