import { useRef, useMemo } from 'react';
import { SectionHead, DecoRule } from '../components/Shared';
import { PosterCard } from '../components/PosterCard';
import { MovieRow } from '../components/MovieRow';

export function NowPlayingTab({ watchlist, onToggleWl, onSelect, onSwitchTab, moviePool, liveReady }) {
  const carRef = useRef(null);
  const pool   = moviePool || [];

  // ── Section splits ────────────────────────────────────────────────────────
  // Live movies (_source === 'tmdb-live') go to "Now Showing" — current releases
  // MovieLens movies go to "Coming Attractions" and "Box Office"
  const liveMovies  = useMemo(() => pool.filter(m => m._source === 'tmdb-live').slice(0, 6), [pool]);
  const mlMovies    = useMemo(() => pool.filter(m => m._source !== 'tmdb-live'), [pool]);

  // "Now Showing" = live movies if available, else fall back to top of MovieLens
  const nowShowing  = liveMovies.length >= 3 ? liveMovies : pool.slice(0, 6);

  // "Coming Attractions" = next 6 MovieLens classics by position
  const coming      = mlMovies.slice(0, 6);

  // "Box Office" carousel = top 12 by vote_average (mix of both sources)
  const boxOffice   = useMemo(() => {
    const rated = pool.filter(m => m.vote_average > 0);
    const sorted = [...rated].sort((a, b) => b.vote_average - a.vote_average).slice(0, 12);
    return sorted.length >= 6 ? sorted : pool.slice(0, 12);
  }, [pool]);

  const LIVE_TAGS = ['In Cinemas Now','New Release','Opening Week','Fresh Arrival','Just Released','Trending'];
  const ML_TAGS   = ['Fan Favourite','Crowd Pleaser','Modern Classic','Top Rated','Hidden Gem','Must See'];
  const nowTags   = liveMovies.length >= 3 ? LIVE_TAGS : ML_TAGS;

  return (
    <div className="tab-panel active" id="panel-nowplaying">

      {/* Vertical marquee sidebar */}
      <div className="left-marquee">
        <div className="marquee-frame">
          <div className="bulb-rail br-t"/><div className="bulb-rail br-b"/>
          <div className="bulb-rail br-l"/><div className="bulb-rail br-r"/>
          <div className="marquee-inner">
            <div className="mqk">NOW</div>
            <div className="mqb">SHOWING</div>
            <div className="mqm">Tonight Only</div>
          </div>
        </div>
      </div>

      <div className="panel-inner with-left-marquee">

        {/* Hero */}
        <div className="marquee-hero">
          <div className="mh-top">Feature Presentation</div>
          <h1 className="mh-title">Now <span className="spark">Playing</span> Tonight</h1>
          <p className="mh-sub">
            New releases from cinemas worldwide, plus 87,000 classics from our archives — curated just for you, darling.
          </p>
          <div className="mh-actions">
            <button className="btn-gold" onClick={() => onSwitchTab('quiz')}>Find My Picture ✦</button>
            <button className="btn-ghost" onClick={() => onSwitchTab('search')}>Browse the Catalogue</button>
          </div>
        </div>

        {/* Now Showing — current releases */}
        <SectionHead gem="✦" title={liveMovies.length >= 3 ? 'Now Showing — New Releases' : 'Now Showing'} />
        {!liveReady && liveMovies.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <div style={{ fontSize:'24px', animation:'reelSpin 1s linear infinite', display:'inline-block' }}>🎬</div>
            <p style={{ marginTop:'8px', fontSize:'14px' }}>Checking tonight's programme…</p>
          </div>
        ) : (
          <div className="now-grid">
            {nowShowing.map((m, i) => (
              <PosterCard key={m.id} movie={m} tag={nowTags[i] || 'Technicolor Pick'}
                watchlist={watchlist} onToggleWl={onToggleWl} onSelect={onSelect} />
            ))}
          </div>
        )}

        <DecoRule />

        {/* Coming Attractions — top MovieLens classics */}
        <SectionHead gem="◇" title="Coming Attractions" />
        <p className="section-note">"A few delicious previews — before the lights go all the way down."</p>
        {coming.map((m, i) => (
          <MovieRow key={m.id} movie={m} rank={i + 1}
            watchlist={watchlist} onToggleWl={onToggleWl} onSelect={onSelect} />
        ))}

        <DecoRule><span>★</span><span>◆</span><span>★</span></DecoRule>

        {/* Box Office Favorites carousel */}
        <SectionHead gem="★" title="Box Office Favorites" />
        <p className="section-note">"Crowd-pleasers with a touch of sparkle — step right up."</p>
        <div className="carousel-wrap">
          <button className="car-arrow left"
            onClick={() => carRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}>‹</button>
          <div className="carousel-track" ref={carRef}>
            {boxOffice.map(m => (
              <PosterCard key={m.id} movie={m} small
                watchlist={watchlist} onToggleWl={onToggleWl} onSelect={onSelect} />
            ))}
          </div>
          <button className="car-arrow right"
            onClick={() => carRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}>›</button>
        </div>

      </div>
    </div>
  );
}
