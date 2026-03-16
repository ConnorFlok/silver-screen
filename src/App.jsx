import { useState, useEffect, useRef, useCallback } from 'react';
import { TAB_LABELS } from './data/constants';
import {
  MOVIE_POOL,
  POOL_BY_ID,
  loadLiveMovies,
  getCombinedPool,
  batchFetchPosters,
} from './utils/dataset';
import { NowPlayingTab } from './tabs/NowPlayingTab';
import { SearchTab     } from './tabs/SearchTab';
import { ActorsTab     } from './tabs/ActorsTab';
import { QuizTab       } from './tabs/QuizTab';
import { RandomTab     } from './tabs/RandomTab';
import { WatchlistTab  } from './tabs/WatchlistTab';
import { checkBackend, isBackendAvailable } from './utils/api';
import './styles/index.css';

export default function App() {
  const [activeTab,            setActiveTab]            = useState('nowplaying');
  const [watchlist,            setWatchlist]            = useState(() => {
    try { return JSON.parse(localStorage.getItem('ssc_wl') || '{}'); } catch { return {}; }
  });
  const [toast,       setToast]       = useState('');
  const [curtainOpen, setCurtainOpen] = useState(false);
  const [selectedFromExternal, setSelectedFromExternal] = useState(null);

  // Combined pool state — starts as MovieLens, live movies added after fetch
  const [moviePool,      setMoviePool]      = useState(MOVIE_POOL);
  const [liveReady,      setLiveReady]      = useState(false);
  const [posterProgress, setPosterProgress] = useState(null); // { done, total } | null

  const tabBarRef     = useRef(null);
  const inkRef        = useRef(null);
  const toastTimerRef = useRef(null);

  // ── Opening curtain ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setCurtainOpen(true), 200);
    return () => clearTimeout(t);
  }, []);

  // ── Check if ML backend is available ─────────────────────────────────────
  useEffect(() => {
    checkBackend();
  }, []);

  // ── Step 1: Load live TMDB movies and merge into pool ────────────────────────
  useEffect(() => {
    loadLiveMovies()
      .then(newMovies => {
        // Update pool: live movies at the front, MovieLens behind
        setMoviePool(getCombinedPool());
        setLiveReady(true);

        // Step 2: Batch-fetch posters for the live movies immediately
        // (MovieLens posters follow in step 3)
        if (newMovies.length > 0) {
          batchFetchPosters(newMovies, 10).then(() => {
            setMoviePool(p => [...p]); // trigger re-render after live posters arrive
          });
        }
      })
      .catch(err => {
        console.warn('Live TMDB fetch failed, using MovieLens only:', err.message);
        setLiveReady(true);
      });
  }, []);

  // ── Step 3: Batch-fetch posters for MovieLens entries in background ──────────
  useEffect(() => {
    const needPosters = MOVIE_POOL.filter(m => !m.poster_path && m.tmdbId);
    if (needPosters.length === 0) return;

    const total = needPosters.length;
    setPosterProgress({ done: 0, total });

    batchFetchPosters(needPosters, 8, (done, t) => {
      setPosterProgress({ done, total: t });
      if (done % 100 === 0) setMoviePool(p => [...p]); // re-render every 100
    }).then(() => {
      setPosterProgress(null);
      setMoviePool(p => [...p]);
    });
  }, []);

  // ── Tab ink indicator ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tabBarRef.current || !inkRef.current) return;
    const btn = tabBarRef.current.querySelector(`[data-tab="${activeTab}"]`);
    if (!btn) return;
    const br = tabBarRef.current.getBoundingClientRect();
    const r  = btn.getBoundingClientRect();
    inkRef.current.style.left  = (r.left - br.left) + 'px';
    inkRef.current.style.width = r.width + 'px';
  }, [activeTab]);

  // ── Persist watchlist ────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('ssc_wl', JSON.stringify(watchlist));
  }, [watchlist]);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2800);
  }, []);

  // ── Watchlist ────────────────────────────────────────────────────────────────
  const toggleWl = useCallback((id, action = null) => {
    setWatchlist(wl => {
      const next = { ...wl };
      if (action === 'seen') {
        if (next[id]) next[id] = { ...next[id], seen: true };
        return next;
      }
      if (next[id]) { delete next[id]; showToast('Removed from your marquee.'); }
      else          { next[id] = { seen: false, rating: 0, addedAt: Date.now() }; showToast('Added to your marquee ✦'); }
      return next;
    });
  }, [showToast]);

  const markSeen = useCallback((id) => {
    setWatchlist(wl => ({ ...wl, [id]: { ...(wl[id] || { addedAt: Date.now() }), seen: true } }));
  }, []);

  const setRating = useCallback((id, r) => {
    setWatchlist(wl => ({ ...wl, [id]: { ...(wl[id] || { addedAt: Date.now() }), seen: true, rating: r } }));
  }, []);

  // ── Cross-tab navigation ─────────────────────────────────────────────────────
  const handleSelectMovie = useCallback((id) => {
    setSelectedFromExternal(id);
    setActiveTab('search');
  }, []);

  const getMovie = useCallback((id) => {
    return POOL_BY_ID[id] || moviePool.find(m => m.id === id) || null;
  }, [moviePool]);

  const tabProps = {
    watchlist,
    onToggleWl: toggleWl,
    onSelect:   handleSelectMovie,
    moviePool,
    getMovie,
    liveReady,
  };

  return (
    <div className="ssc-root">

      {/* Curtain */}
      <div className={`curtain-overlay${curtainOpen ? ' curtain-open' : ''}`}
        style={{ pointerEvents: curtainOpen ? 'none' : 'all' }}>
        <div className="curtain curtain-left" />
        <div className="curtain curtain-right" />
        <div className="curtain-title">
          <div className="ct-top">Feature Presentation</div>
          <div className="ct-script">Silver Screen Concierge</div>
          <div className="ct-sub">Now Showing in Living Technicolor ✦</div>
        </div>
      </div>

      {/* Poster load progress bar */}
      {posterProgress && (
        <div style={{ position:'fixed', top:0, left:0, right:0, height:'3px', background:'var(--ink-2)', zIndex:9996 }}>
          <div style={{
            height: '100%',
            width:  `${(posterProgress.done / posterProgress.total) * 100}%`,
            background: 'linear-gradient(90deg, var(--ruby), var(--gold), var(--teal))',
            transition: 'width .4s ease',
          }} />
        </div>
      )}

      {/* Brand bar */}
      <div className="brand-bar">
        <div className="brand-left">
          <span className="brand-reel">🎬</span>
          <span className="brand-name">The Silver Screen</span>
          <span className="brand-sub">Picture Concierge</span>
        </div>
        <div className="ticker-wrap">
          <span className="ticker-inner">
            ✦ NOW SHOWING IN LIVING TECHNICOLOR ✦ STEP RIGHT UP ✦ YOUR NEXT PICTURE AWAITS ✦ ROLL THE REEL ✦ TONIGHT'S FEATURE PRESENTATION ✦ THE HOUSE LIGHTS ARE LOW ✦
          </span>
        </div>
        <div className="brand-actions">
          <button className="btn-ticket" onClick={() => setActiveTab('watchlist')}>★ My Marquee</button>
          <div className="brand-est">Est. MCMXXIV</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar" ref={tabBarRef}>
        {TAB_LABELS.map(t => (
          <button key={t.id}
            className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
            data-tab={t.id}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="ti">{t.icon}</span>{t.label}
          </button>
        ))}
        <div className="tab-ink" ref={inkRef} />
      </div>

      {/* Content panels */}
      <div className="content-area">
        {activeTab === 'nowplaying' && <NowPlayingTab {...tabProps} onSwitchTab={setActiveTab} />}
        {activeTab === 'search' && (
          <SearchTab {...tabProps}
            externalId={selectedFromExternal}
            onClearExternal={() => setSelectedFromExternal(null)}
          />
        )}
        {activeTab === 'actors' && (
          <ActorsTab {...tabProps}
            onSelectMovie={id => { setSelectedFromExternal(id); setActiveTab('search'); }}
          />
        )}
        {activeTab === 'quiz'      && <QuizTab      {...tabProps} />}
        {activeTab === 'random'    && <RandomTab    {...tabProps} />}
        {activeTab === 'watchlist' && (
          <WatchlistTab watchlist={watchlist} onToggleWl={toggleWl}
            onMarkSeen={markSeen} onSetRating={setRating} getMovie={getMovie} />
        )}
      </div>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}
