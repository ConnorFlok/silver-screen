import { useState } from 'react';
import { SectionHead, DecoRule } from '../components/Shared';
import { MovieRow } from '../components/MovieRow';

export function RandomTab({ watchlist, onToggleWl, onSelect, moviePool }) {
  const [count,       setCount]       = useState(3);
  const [varied,      setVaried]      = useState(true);
  const [genreFilter, setGenreFilter] = useState("all");
  const [results,     setResults]     = useState([]);
  const [spinning,    setSpinning]    = useState(false);

  const pool       = moviePool || [];
  const allGenres  = [...new Set(pool.flatMap(m => m.genres))].sort();

  const isActive = g =>
    g === "all" ? genreFilter === "all" : Array.isArray(genreFilter) && genreFilter.includes(g);

  const toggleGenreFilter = g => {
    if (g === "all") { setGenreFilter("all"); return; }
    setGenreFilter(f => {
      const arr = Array.isArray(f) ? f : [];
      return arr.includes(g) ? arr.filter(x => x !== g) : [...arr, g];
    });
  };

  const spin = () => {
    if (pool.length === 0) return;
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);

    let eligible = pool;
    if (Array.isArray(genreFilter) && genreFilter.length) {
      eligible = pool.filter(m => m.genres.some(g => genreFilter.includes(g)));
    }
    if (!eligible.length) eligible = pool;

    let picks = [];
    if (varied) {
      const shuffled = [...eligible].sort(() => Math.random() - .5);
      const used = new Set();
      for (const m of shuffled) {
        const freshGenre = m.genres.find(g => !used.has(g));
        if (freshGenre) { picks.push(m); m.genres.forEach(g => used.add(g)); }
        if (picks.length >= count) break;
      }
      if (picks.length < count) {
        const rest = shuffled.filter(m => !picks.includes(m));
        picks = [...picks, ...rest.slice(0, count - picks.length)];
      }
    } else {
      picks = [...eligible].sort(() => Math.random() - .5).slice(0, count);
    }

    setResults(picks);
  };

  return (
    <div className="tab-panel active" id="panel-random">
      <div className="panel-inner">
        <div className="random-hero">
          <div className={`reel-icon${spinning ? " spin" : ""}`}>🎬</div>
          <h2>"Spin the Reel, Darling"</h2>
          <p>Let fate choose tonight's feature — we guarantee you won't be disappointed.</p>
        </div>

        <SectionHead title="Genre Filter" left={false} right={false} />
        <div className="filter-row">
          <button className={`filter-chip${isActive("all") ? " active" : ""}`}
            onClick={() => toggleGenreFilter("all")}>All Genres</button>
          {allGenres.map(g => (
            <button key={g} className={`filter-chip${isActive(g) ? " active" : ""}`}
              onClick={() => toggleGenreFilter(g)}>{g}</button>
          ))}
        </div>

        <DecoRule><span>◆</span></DecoRule>

        <div className="count-row">
          <span className="count-label">How many pictures?</span>
          <button className="count-btn" onClick={() => setCount(c => Math.max(1, c-1))}>−</button>
          <span className="count-val">{count}</span>
          <button className="count-btn" onClick={() => setCount(c => Math.min(5, c+1))}>+</button>
        </div>

        <div className="varied-row">
          <div className={`toggle-wrap${varied ? " on" : ""}`} onClick={() => setVaried(v => !v)}>
            <div className="toggle-knob" />
          </div>
          <span>"Varied" mode — mix genres for a richer evening</span>
        </div>

        <div style={{ textAlign:"center", marginBottom:"26px" }}>
          <button className="btn-gold" style={{ fontSize:"13px", padding:"14px 44px" }}
            onClick={spin} disabled={pool.length === 0}>
            {pool.length === 0 ? "Loading catalogue…" : "✦ Surprise Me ✦"}
          </button>
        </div>

        {results.length > 0 && (
          <div>
            <SectionHead title="The Reel Has Spoken" gem="🎬" />
            <p className="section-note">
              "Fate has cast its vote — here is tonight's programme, darling."
            </p>
            {results.map((m, i) => (
              <MovieRow key={m.id} movie={m} rank={i+1}
                watchlist={watchlist} onToggleWl={onToggleWl} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
