import { useState } from 'react';
import { GENRE_OPTS } from '../data/constants';
import { getMoviePoster } from '../utils/posters';
import { SectionHead, GenreChip, WlButton } from '../components/Shared';

function scorePool(pool, prefs, n = 5) {
  return pool
    .map(m => {
      let score = 0;
      score += m.genres.filter(g => prefs.genres.includes(g)).length * 3;
      if (prefs.mood) {
        const isLight = m.genres.some(g => ['Comedy','Animation','Family','Romance'].includes(g));
        if (prefs.mood.includes('Upbeat') && isLight)  score += 4;
        if (prefs.mood.includes('Dark')   && !isLight) score += 4;
        if (prefs.mood.includes("Doesn't"))             score += 2;
      }
      if (prefs.era) {
        if (prefs.era.includes('Golden') && m.era === 'classic') score += 3;
        if (prefs.era.includes('Modern') && m.era === 'modern')  score += 3;
        if (prefs.era.includes('Either'))                        score += 1;
      }
      if (prefs.runtime && m.runtime > 0) {
        if (prefs.runtime.includes('Quick')    && m.runtime < 110)                  score += 2;
        if (prefs.runtime.includes('Standard') && m.runtime >= 90 && m.runtime <= 130) score += 2;
        if (prefs.runtime.includes('Epic')     && m.runtime > 130)                  score += 2;
        if (prefs.runtime.includes('No'))                                            score += 1;
      } else if (prefs.runtime?.includes('No')) {
        score += 1;
      }
      return { ...m, score };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score || b.vote_average - a.vote_average)
    .slice(0, n);
}

export function QuizTab({ watchlist, onToggleWl, onSelect, moviePool }) {
  const [step,    setStep]    = useState(0);
  const [prefs,   setPrefs]   = useState({ genres: [], mood: null, era: null, runtime: null });
  const [err,     setErr]     = useState('');
  const [results, setResults] = useState(null);

  const toggleGenre = g =>
    setPrefs(p => ({ ...p, genres: p.genres.includes(g) ? p.genres.filter(x => x !== g) : [...p.genres, g] }));
  const setChoice = (key, val) => setPrefs(p => ({ ...p, [key]: val }));

  const advance = () => {
    if (step === 0 && prefs.genres.length === 0) { setErr('Please pick at least one genre, darling.'); return; }
    if (step === 1 && !prefs.mood)               { setErr('Please select a mood.');                    return; }
    if (step === 2 && !prefs.era)                { setErr('Please choose an era.');                    return; }
    if (step === 3 && !prefs.runtime)            { setErr('Please pick a runtime preference.');        return; }
    setErr('');
    if (step === 3) { setResults(scorePool(moviePool || [], prefs)); setStep(4); }
    else setStep(s => s + 1);
  };

  const reset = () => { setStep(0); setPrefs({ genres:[], mood:null, era:null, runtime:null }); setResults(null); setErr(''); };

  return (
    <div className="tab-panel active" id="panel-quiz">
      <div className="panel-inner">
        {step < 4 && (
          <>
            <div className="prog-wrap"><div className="prog-fill" style={{ width:`${(step/4)*100}%` }} /></div>
            <div className="prog-dots">{[0,1,2,3].map(i => <div key={i} className={`prog-dot${i<step?' done':i===step?' active':''}`}/>)}</div>
          </>
        )}

        {step === 0 && (
          <div className="quiz-card">
            <div className="quiz-step">Step 1 of 4</div>
            <div className="quiz-q">"Which genres set your pulse racing, darling?"</div>
            <div className="quiz-hint">Pick as many as you please.</div>
            <div className="genre-grid">
              {GENRE_OPTS.map(({ e, g }) => (
                <button key={g} className={`g-btn${prefs.genres.includes(g) ? ' sel' : ''}`} onClick={() => toggleGenre(g)}>
                  <span>{e}</span>{g}
                </button>
              ))}
            </div>
            {err && <div className="err-msg">{err}</div>}
            <button className="btn-gold" onClick={advance}>Next Scene →</button>
          </div>
        )}

        {step === 1 && (
          <div className="quiz-card">
            <div className="quiz-step">Step 2 of 4</div>
            <div className="quiz-q">"What kind of evening are you after?"</div>
            <div className="quiz-hint">Pick the mood that calls to you.</div>
            <div className="choice-row">
              {['Upbeat & Delightful','Dark & Intense',"Doesn't Matter"].map(m => (
                <button key={m} className={`c-btn${prefs.mood === m ? ' sel' : ''}`} onClick={() => setChoice('mood', m)}>{m}</button>
              ))}
            </div>
            {err && <div className="err-msg">{err}</div>}
            <div style={{ display:'flex', gap:'10px' }}>
              <button className="btn-ghost" onClick={() => setStep(0)}>← Back</button>
              <button className="btn-gold"  onClick={advance}>Next Scene →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="quiz-card">
            <div className="quiz-step">Step 3 of 4</div>
            <div className="quiz-q">"Classic Hollywood glamour or modern cinema?"</div>
            <div className="quiz-hint">Choose your era, darling.</div>
            <div className="choice-row">
              {['Golden Age (pre-2000)','Modern Era (2000+)','Either Era'].map(e => (
                <button key={e} className={`c-btn${prefs.era === e ? ' sel' : ''}`} onClick={() => setChoice('era', e)}>{e}</button>
              ))}
            </div>
            {err && <div className="err-msg">{err}</div>}
            <div style={{ display:'flex', gap:'10px' }}>
              <button className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-gold"  onClick={advance}>Next Scene →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="quiz-card">
            <div className="quiz-step">Step 4 of 4</div>
            <div className="quiz-q">"How long shall the evening last?"</div>
            <div className="quiz-hint">Your runtime preference, if you please.</div>
            <div className="choice-row">
              {['Quick (under 110m)','Standard (90–130m)','Epic (over 130m)','No Preference'].map(r => (
                <button key={r} className={`c-btn${prefs.runtime === r ? ' sel' : ''}`} onClick={() => setChoice('runtime', r)}>{r}</button>
              ))}
            </div>
            {err && <div className="err-msg">{err}</div>}
            <div style={{ display:'flex', gap:'10px' }}>
              <button className="btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="btn-gold"  onClick={advance}>The Reel Has Spoken ✦</button>
            </div>
          </div>
        )}

        {step === 4 && results && (
          <div>
            <SectionHead title="Your Curated Programme" gem="🎬" />
            <p className="section-note">"The house is yours, the lights are low — enjoy the show, darling."</p>
            {results.length === 0
              ? <div className="empty-state"><p>No matches found — try adjusting your preferences, darling.</p></div>
              : results.map((m, i) => (
                <div key={m.id} className="movie-row" onClick={() => onSelect(m.id)}>
                  <div className="mr-thumb"><img src={getMoviePoster(m, 'w92')} alt="" loading="lazy" /></div>
                  <div className="movie-row-info">
                    <div style={{ fontSize:'9px', letterSpacing:'3px', textTransform:'uppercase', color:'var(--gold-d)', marginBottom:'2px' }}>#{i+1} Recommendation</div>
                    <div className="movie-row-title">{m.title}</div>
                    <div className="movie-row-meta">{m.year > 0 && `${m.year}`}{m.vote_average > 0 && ` · ⭐ ${m.vote_average.toFixed(1)}`}</div>
                    <div className="movie-row-genres">{m.genres.slice(0,3).map(g => <GenreChip key={g} genre={g} />)}</div>
                  </div>
                  <div className="movie-row-score">
                    <span className="score-badge">{Math.round(m.score)}pts</span>
                    <WlButton movieId={m.id} watchlist={watchlist} onToggle={onToggleWl} />
                  </div>
                </div>
              ))}
            <div style={{ display:'flex', gap:'10px', marginTop:'24px', flexWrap:'wrap', justifyContent:'center' }}>
              <button className="btn-gold" onClick={reset}>Another Round ↺</button>
              <button className="btn-ghost" onClick={() => setStep(0)}>Adjust Preferences</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
