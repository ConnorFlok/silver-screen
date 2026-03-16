// ─────────────────────────────────────────────────────────────────────────────
// Shared decorative and utility components used across tabs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Art-deco section heading with flanking rule lines and gem ornaments.
 */
export function SectionHead({ left = true, right = true, gem = '✦', gemRight, title }) {
  return (
    <div className="sec-head">
      {left  && <div className="sec-head-line"/>}
      <div className="sec-head-gem">{gem}</div>
      <div className="sec-head-title">{title}</div>
      <div className="sec-head-gem">{gemRight || gem}</div>
      {right && <div className="sec-head-line r"/>}
    </div>
  );
}

/**
 * Horizontal ornamental rule with optional centred content.
 * Default centred content: 🎞 ◆ 🎞
 */
export function DecoRule({ children }) {
  return (
    <div className="deco-rule">
      <div className="deco-rule-center">
        {children || (
          <><span>🎞</span><span>◆</span><span>🎞</span></>
        )}
      </div>
    </div>
  );
}

/**
 * Small uppercase genre label chip.
 */
export function GenreChip({ genre }) {
  return <span className="genre-chip">{genre}</span>;
}

/**
 * Watchlist toggle star button (☆ / ★).
 * Stops click propagation so it works inside clickable parent rows.
 */
export function WlButton({ movieId, watchlist, onToggle, className = 'wl-icon-btn' }) {
  const inList = !!watchlist[movieId];
  return (
    <button
      className={`${className}${inList ? ' in-list' : ''}`}
      onClick={e => { e.stopPropagation(); onToggle(movieId); }}
      title={inList ? 'Remove from Marquee' : 'Add to Marquee'}
    >
      {inList ? '★' : '☆'}
    </button>
  );
}
