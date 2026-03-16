import { getMoviePoster } from '../utils/posters';
import { GenreChip, WlButton } from './Shared';

export function MovieRow({ movie, showScore = false, rank = null, watchlist, onToggleWl, onSelect }) {
  const img = getMoviePoster(movie, "w92");

  return (
    <div className="movie-row" onClick={() => onSelect(movie.id)}>
      <div className="mr-thumb">
        <img src={img} alt="" loading="lazy" />
      </div>
      <div className="movie-row-info">
        {rank && (
          <div style={{ fontSize:"9px", letterSpacing:"3px", textTransform:"uppercase", color:"var(--gold-d)", marginBottom:"2px" }}>
            #{rank} Recommendation
          </div>
        )}
        <div className="movie-row-title">{movie.title}</div>
        <div className="movie-row-meta">
          {movie.year > 0 && <span>{movie.year}</span>}
          {movie.runtime > 0 && <span> · {movie.runtime}m</span>}
          {movie.director && <span> · {movie.director}</span>}
          {movie.vote_average > 0 && (
            <span> · ⭐ {movie.vote_average.toFixed(1)}</span>
          )}
        </div>
        <div className="movie-row-genres">
          {movie.genres.slice(0, 3).map(g => <GenreChip key={g} genre={g} />)}
        </div>
        {movie.reasons?.length > 0 && (
          <div style={{ marginTop:"5px" }}>
            {movie.reasons.map(r => <span key={r} className="why-tag">{r}</span>)}
          </div>
        )}
      </div>
      <div className="movie-row-score">
        {showScore && movie.score > 0 && (
          <span className="score-badge">{Math.round(movie.score)}pts</span>
        )}
        <WlButton movieId={movie.id} watchlist={watchlist} onToggle={onToggleWl} />
      </div>
    </div>
  );
}
