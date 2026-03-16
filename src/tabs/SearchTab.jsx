import { useState, useEffect } from 'react';
import { hybridSearch } from '../utils/dataset';
import { getMoviePoster } from '../utils/posters';
import { WlButton } from '../components/Shared';
import { DetailView } from '../components/DetailView';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function SearchTab({ watchlist, onToggleWl, onSelect, externalId, onClearExternal, moviePool, getMovie }) {
  const [query,         setQuery]         = useState('');
  const [suggestions,   setSuggestions]   = useState([]);
  const [selIdx,        setSelIdx]        = useState(-1);
  const [searching,     setSearching]     = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const debouncedQuery = useDebounce(query, 200);

  // Trending grid: live movies first, then top MovieLens entries
  const trending = (moviePool || []).slice(0, 12);

  // External selection from other tabs
  useEffect(() => {
    if (!externalId) return;
    const m = getMovie?.(externalId) || { id: externalId, title: '', genres: [], year: 0 };
    setSelectedMovie(m);
    onClearExternal?.();
  }, [externalId]);

  // Hybrid search: local 87k + TMDB API in parallel
  useEffect(() => {
    if (!debouncedQuery.trim()) { setSuggestions([]); setSearching(false); return; }
    let cancelled = false;
    setSearching(true);
    hybridSearch(debouncedQuery, 12).then(results => {
      if (!cancelled) { setSuggestions(results); setSearching(false); }
    }).catch(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSelect = (movie) => {
    setSelectedMovie(movie);
    setSuggestions([]);
    onSelect?.(movie.id);
  };

  const highlight = (title, val) => {
    if (!val) return title;
    const re = new RegExp(`(${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return title.split(re).map((part, i) =>
      re.test(part) ? <strong key={i} style={{ color: 'var(--gold)' }}>{part}</strong> : part
    );
  };

  if (selectedMovie) {
    return (
      <div className="tab-panel active" id="panel-search">
        <div className="panel-inner">
          <DetailView
            movie={selectedMovie}
            watchlist={watchlist}
            onToggleWl={onToggleWl}
            moviePool={moviePool}
            onBack={() => setSelectedMovie(null)}
            onSelect={id => {
              const m = getMovie?.(id) || { id, title: '', genres: [], year: 0 };
              setSelectedMovie(m);
            }}
            onMarkSeen={id => onToggleWl(id, 'seen')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel active" id="panel-search">
      <div className="panel-inner">

        <div className="search-hero-strip">
          <h2>"Name a picture you've admired…"</h2>
          <p>Search 87,000 classics + today's new releases — all in one, darling.</p>
        </div>

        <div className="search-wrap">
          <span className="search-icon">◎</span>
          <input
            className="search-input"
            value={query}
            placeholder="Search by title… e.g. 'Casablanca' or 'Dune'"
            onChange={e => { setQuery(e.target.value); setSelIdx(-1); }}
            onKeyDown={e => {
              if      (e.key === 'ArrowDown') { setSelIdx(i => Math.min(i+1, suggestions.length-1)); e.preventDefault(); }
              else if (e.key === 'ArrowUp')   { setSelIdx(i => Math.max(i-1, -1)); e.preventDefault(); }
              else if (e.key === 'Enter' && selIdx >= 0) handleSelect(suggestions[selIdx]);
              else if (e.key === 'Escape') setSuggestions([]);
            }}
          />
          {query && (
            <button className="clear-btn" onClick={() => { setQuery(''); setSuggestions([]); }}>✕</button>
          )}

          {(suggestions.length > 0 || (searching && query)) && (
            <div className="suggestions">
              {searching && suggestions.length === 0 && (
                <div className="no-results" style={{ fontStyle: 'normal' }}>
                  Searching archives &amp; live catalogue…
                </div>
              )}
              {suggestions.map((m, i) => (
                <div key={`${m._source}-${m.id}`}
                  className={`suggestion-item${i === selIdx ? ' sel' : ''}`}
                  onClick={() => handleSelect(m)}
                >
                  <div className="sug-thumb">
                    <img src={getMoviePoster(m, 'w92')} alt="" loading="lazy" />
                  </div>
                  <div className="sug-info">
                    <div className="sug-title">
                      {highlight(m.title, query)}
                      {m._source === 'tmdb-live' && (
                        <span style={{
                          fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase',
                          color: 'var(--teal)', marginLeft: '8px', opacity: 0.85,
                        }}>NEW</span>
                      )}
                    </div>
                    <div className="sug-meta">
                      {m.year > 0 && `${m.year}`}
                      {m.genres.length > 0 && ` · ${m.genres.slice(0, 2).join(', ')}`}
                      {m.vote_average > 0 && ` · ⭐ ${m.vote_average.toFixed(1)}`}
                    </div>
                  </div>
                </div>
              ))}
              {!searching && query && suggestions.length === 0 && (
                <div className="no-results">No pictures found, sugar — try another title.</div>
              )}
            </div>
          )}
        </div>

        {/* Trending grid */}
        {trending.length > 0 && (
          <div className="trending-section">
            <div className="trending-label">Trending Now &amp; All-Time Favourites — tap to explore</div>
            <div className="trend-movie-grid">
              {trending.map(m => (
                <div key={`${m._source}-${m.id}`} className="tmg-card" onClick={() => handleSelect(m)}>
                  <div className="tmg-art" style={{ backgroundImage: `url('${getMoviePoster(m, 'w342')}')` }}>
                    <span className="tmg-badge">
                      {m._source === 'tmdb-live'
                        ? (m.genres[0] || 'New')
                        : (m.genres[0] || 'Classic')}
                    </span>
                    {m._source === 'tmdb-live' && (
                      <span style={{
                        position:'absolute', bottom:'5px', left:'5px', zIndex:3,
                        fontSize:'7px', letterSpacing:'2px', textTransform:'uppercase',
                        background:'rgba(23,184,184,.85)', color:'var(--ink)',
                        padding:'2px 5px', borderRadius:'2px', fontWeight:700,
                      }}>NEW</span>
                    )}
                    <WlButton movieId={m.id} watchlist={watchlist} onToggle={onToggleWl} className="tmg-wl" />
                  </div>
                  <div className="tmg-info">
                    <div className="tmg-title">{m.title}</div>
                    <div className="tmg-meta">
                      {m.year > 0 && m.year}
                      {m.vote_average > 0 && ` · ⭐ ${m.vote_average.toFixed(1)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
