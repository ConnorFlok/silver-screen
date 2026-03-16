import { useState, useEffect } from 'react';
import { searchPeople, getPersonMovieCredits, getTrendingMovies } from '../utils/tmdb';
import { profileUrl } from '../utils/tmdb';
import { actorPortraitSvg } from '../utils/posters';
import { SectionHead } from '../components/Shared';
import { MovieRow } from '../components/MovieRow';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ActorsTab({ watchlist, onToggleWl, onSelectMovie }) {
  const [query,       setQuery]       = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selIdx,      setSelIdx]      = useState(-1);
  const [selPerson,   setSelPerson]   = useState(null);
  const [films,       setFilms]       = useState([]);
  const [loadingFilms, setLoadingFilms] = useState(false);
  const [spotlightActors, setSpotlightActors] = useState([]);
  const debouncedQuery = useDebounce(query, 300);

  // Populate the spotlight grid from trending movie cast
  useEffect(() => {
    getTrendingMovies().then(movies => {
      const seen = new Set();
      const actors = [];
      for (const m of movies) {
        for (const name of (m.cast || [])) {
          if (!seen.has(name) && actors.length < 12) { seen.add(name); actors.push({ name, movieCount: 1 }); }
        }
      }
      setSpotlightActors(actors);
    }).catch(console.error);
  }, []);

  // Search people on debounced query
  useEffect(() => {
    if (!debouncedQuery.trim()) { setSuggestions([]); return; }
    let cancelled = false;
    searchPeople(debouncedQuery)
      .then(results => { if (!cancelled) setSuggestions(results.slice(0, 8)); })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSelect = async (person) => {
    setSelPerson(person);
    setSuggestions([]);
    setQuery(person.name);
    setLoadingFilms(true);
    try {
      const credits = await getPersonMovieCredits(person.id);
      setFilms(credits.slice(0, 20));
    } catch(e) {
      console.error(e);
    } finally {
      setLoadingFilms(false);
    }
  };

  const handleSelectByName = async (name) => {
    const results = await searchPeople(name).catch(() => []);
    if (results[0]) handleSelect(results[0]);
  };

  const getActorPortrait = (person) => {
    if (person.profile_path) return profileUrl(person.profile_path, "w185");
    return actorPortraitSvg(person.name || "");
  };

  return (
    <div className="tab-panel active" id="panel-actors">
      <div className="panel-inner">
        <div className="actor-search-hero">
          <h2>Under the Spotlight</h2>
          <p>Search for a star — and discover the constellation around them.</p>
        </div>

        <div className="search-wrap">
          <span className="search-icon">✦</span>
          <input
            className="search-input"
            value={query}
            placeholder="Type an actor's name… e.g. 'Caine'"
            onChange={e => { setQuery(e.target.value); setSelIdx(-1); }}
            onKeyDown={e => {
              if (e.key === "ArrowDown") { setSelIdx(i => Math.min(i+1, suggestions.length-1)); e.preventDefault(); }
              else if (e.key === "ArrowUp") { setSelIdx(i => Math.max(i-1, -1)); e.preventDefault(); }
              else if (e.key === "Enter" && selIdx >= 0) handleSelect(suggestions[selIdx]);
              else if (e.key === "Escape") setSuggestions([]);
            }}
          />
          {query && (
            <button className="clear-btn" onClick={() => { setQuery(""); setSuggestions([]); setSelPerson(null); setFilms([]); }}>✕</button>
          )}

          {suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map((p, i) => (
                <div key={p.id}
                  className={`suggestion-item${i === selIdx ? " sel" : ""}`}
                  onClick={() => handleSelect(p)}
                >
                  <div className="sug-thumb">
                    <img src={getActorPortrait(p)} alt="" loading="lazy" />
                  </div>
                  <div className="sug-info">
                    <div className="sug-title">{p.name}</div>
                    <div className="sug-meta">
                      {p.known_for_department || "Acting"} ·{" "}
                      {(p.known_for || []).slice(0,2).map(k => k.title || k.name).join(", ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actor detail view */}
        {selPerson ? (
          <div>
            <div className="actor-detail-header">
              <div className="actor-portrait-large">
                <img src={getActorPortrait(selPerson)} alt={selPerson.name} loading="lazy" />
              </div>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"22px", fontWeight:900, color:"var(--gold-l)", marginBottom:"6px" }}>
                  {selPerson.name}
                </div>
                {selPerson.known_for_department && (
                  <div style={{ fontSize:"12px", color:"var(--silver)", marginBottom:"8px" }}>
                    {selPerson.known_for_department}
                  </div>
                )}
                <div style={{ fontFamily:"'IM Fell English',serif", fontStyle:"italic", fontSize:"14px", color:"var(--cream-d)" }}>
                  "Based on {selPerson.name.split(" ")[0]}'s body of work — pictures cut from the same fine cloth."
                </div>
              </div>
            </div>

            <SectionHead title="Filmography" gem="🎬" />
            {loadingFilms ? (
              <div className="empty-state">
                <div style={{ fontSize:"28px", animation:"reelSpin 1s linear infinite", display:"inline-block" }}>🎬</div>
                <p style={{ marginTop:"12px" }}>Consulting the archives…</p>
              </div>
            ) : films.map((m, i) => (
              <MovieRow key={m.id} movie={m} rank={i+1}
                watchlist={watchlist} onToggleWl={onToggleWl} onSelect={onSelectMovie} />
            ))}
          </div>
        ) : (
          /* Spotlight grid */
          <div className="trending-section">
            <div className="trending-label">Under the Spotlight — tap to explore</div>
            <div className="trending-actor-grid">
              {spotlightActors.map(a => (
                <div key={a.name} className="tag-card" onClick={() => handleSelectByName(a.name)}>
                  <div className="tag-portrait"
                    style={{ backgroundImage:`url('${actorPortraitSvg(a.name)}')` }}
                  >
                    <span style={{ position:"absolute", top:"6px", right:"6px", zIndex:3, fontSize:"14px", color:"var(--gold)" }}>✦</span>
                  </div>
                  <div className="tag-info">
                    <div className="tag-name">{a.name}</div>
                    <div className="tag-films">Trending cast</div>
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
