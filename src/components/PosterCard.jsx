import { getMoviePoster } from '../utils/posters';
import { WlButton } from './Shared';

export function PosterCard({ movie, tag = "Technicolor Pick", small = false, watchlist, onToggleWl, onSelect }) {
  const img = getMoviePoster(movie, "w342");

  return (
    <div
      className={small ? "car-item poster-card" : "poster-card"}
      onClick={() => onSelect(movie.id)}
    >
      <div
        className="poster-art"
        style={{ height: small ? "110px" : "160px", backgroundImage: `url('${img}')` }}
      >
        <WlButton movieId={movie.id} watchlist={watchlist} onToggle={onToggleWl} className="tmg-wl" />
        <span className="pa-badge">{small ? "BOX OFFICE" : "NOW PLAYING"}</span>
      </div>
      <div className="poster-info">
        <div className="poster-title" style={small ? { fontSize:"13px" } : {}}>
          {movie.title}
        </div>
        <div className="poster-meta">
          {movie.year > 0 && `${movie.year} · `}
          {movie.genres.slice(0, small ? 1 : 2).join(", ")}
        </div>
        {!small && <span className="poster-tag">{tag}</span>}
      </div>
    </div>
  );
}
