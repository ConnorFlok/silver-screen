import { getMoviePoster } from '../utils/posters';
import { RATING_LABELS } from '../data/constants';
import { SectionHead, DecoRule } from '../components/Shared';

export function WatchlistTab({ watchlist, onToggleWl, onMarkSeen, onSetRating, getMovie }) {
  const entries = Object.entries(watchlist);
  const unseen  = entries.filter(([, d]) => !d.seen).sort((a, b) => b[1].addedAt - a[1].addedAt);
  const seen    = entries.filter(([, d]) =>  d.seen).sort((a, b) => b[1].addedAt - a[1].addedAt);

  const renderRow = ([id, data], showRating = false) => {
    const numId = parseInt(id);
    const m = getMovie?.(numId) || { id: numId, title: `Movie #${numId}`, genres: [], year: 0 };
    return (
      <div key={id} className="wl-movie-row">
        <div className="wl-thumb">
          <img src={getMoviePoster(m, 'w92')} alt="" loading="lazy" />
        </div>
        <div className="wl-info">
          <div className="wl-title">{m.title}</div>
          <div className="wl-meta">
            {m.year > 0 && `${m.year}`}
            {m.genres.length > 0 && ` · ${m.genres.slice(0, 2).join(', ')}`}
            {m.runtime > 0 && ` · ${m.runtime}m`}
          </div>
          {showRating && (
            <div className="star-rating">
              {[1,2,3,4,5].map(s => (
                <span key={s}
                  className={`sr-star${data.rating >= s ? ' lit' : ''}`}
                  onClick={() => onSetRating(numId, s)}>★</span>
              ))}
              <span style={{ fontSize:'10px', color:'var(--gold-d)', marginLeft:'6px', fontStyle:'italic' }}>
                {data.rating ? RATING_LABELS[data.rating] : 'Not yet rated'}
              </span>
            </div>
          )}
        </div>
        <div className="wl-actions">
          {!showRating && (
            <button className="btn-ghost"
              style={{ fontSize:'11px', padding:'5px 10px' }}
              onClick={() => onMarkSeen(numId)}>Mark Seen</button>
          )}
          <button className="wl-remove" onClick={() => onToggleWl(numId)}>✕</button>
        </div>
      </div>
    );
  };

  return (
    <div className="tab-panel active" id="panel-watchlist">
      <div className="panel-inner">
        <SectionHead gem="★" title="My Marquee" />
        <p className="section-note">"Your personal bill — pictures seen and pictures waiting."</p>

        <DecoRule>
          <span>◇</span>
          <span style={{ fontSize:'9px', letterSpacing:'4px', textTransform:'uppercase', color:'var(--gold-d)' }}>To Watch</span>
          <span>◇</span>
        </DecoRule>
        {unseen.length === 0
          ? <div className="empty-state"><div className="es-icon">🎭</div><p>Your "to watch" marquee is bare — add films using ☆ on any movie, darling.</p></div>
          : unseen.map(e => renderRow(e, false))}

        <DecoRule>
          <span>★</span>
          <span style={{ fontSize:'9px', letterSpacing:'4px', textTransform:'uppercase', color:'var(--gold-d)' }}>Seen &amp; Rated</span>
          <span>★</span>
        </DecoRule>
        {seen.length === 0
          ? <div className="empty-state"><div className="es-icon">⭐</div><p>No rated pictures yet — mark films as seen and give them a star rating.</p></div>
          : seen.map(e => renderRow(e, true))}
      </div>
    </div>
  );
}
