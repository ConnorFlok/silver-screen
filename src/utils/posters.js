import { PALETTES, ACTOR_PALETTES } from '../data/constants';
import { posterUrl } from './tmdb';

/**
 * Returns the best poster image URL for a movie.
 * Priority:
 *   1. tmdb_poster (already-resolved TMDB image URL, set after batch fetch)
 *   2. poster_path via TMDB image CDN
 *   3. SVG art-deco fallback (no network required)
 */
export function getMoviePoster(movie, size = 'w342') {
  if (!movie) return posterDataUri({ title: '', genres: [], year: 0 });
  if (movie.tmdb_poster) return movie.tmdb_poster;
  if (movie.poster_path) return posterUrl(movie.poster_path, size);
  return posterDataUri(movie);
}

// ── SVG fallback poster ───────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function posterDataUri(movie) {
  const g = (movie?.genres || [])[0] || 'Drama';
  const p = PALETTES[g] || PALETTES.Drama;

  const words = (movie?.title || '').split(' ');
  let lines = [], cur = '';
  words.forEach(w => {
    if ((cur + ' ' + w).trim().length > 15 && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  });
  if (cur) lines.push(cur);
  lines = lines.slice(0, 3);
  const titleY = lines.length === 1 ? 185 : lines.length === 2 ? 175 : 165;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="510" viewBox="0 0 340 510">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2=".6" y2="1">
      <stop offset="0" stop-color="${p.a}" stop-opacity=".25"/>
      <stop offset=".5" stop-color="${p.b}" stop-opacity=".18"/>
      <stop offset="1" stop-color="#080503"/>
    </linearGradient>
    <radialGradient id="sp" cx="28%" cy="15%" r="70%">
      <stop offset="0" stop-color="${p.c}" stop-opacity=".28"/>
      <stop offset="1" stop-color="#080503" stop-opacity="0"/>
    </radialGradient>
    <filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .06 0"/>
    </filter>
  </defs>
  <rect width="340" height="510" fill="#0c0804"/>
  <rect width="340" height="510" fill="url(#bg)"/>
  <rect width="340" height="510" fill="url(#sp)"/>
  <rect x="12" y="12" width="316" height="486" rx="8" fill="none" stroke="${p.a}" stroke-opacity=".55" stroke-width="1.5"/>
  <rect x="20" y="20" width="300" height="470" rx="6" fill="none" stroke="${p.c}" stroke-opacity=".30" stroke-width="1"/>
  <circle cx="42" cy="42" r="4" fill="${p.a}" opacity=".8"/>
  <circle cx="298" cy="42" r="4" fill="${p.a}" opacity=".8"/>
  <circle cx="42" cy="468" r="4" fill="${p.a}" opacity=".8"/>
  <circle cx="298" cy="468" r="4" fill="${p.a}" opacity=".8"/>
  <rect x="80" y="34" width="180" height="18" rx="3" fill="${p.a}" opacity=".18"/>
  <text x="170" y="47" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="9" letter-spacing="5" fill="${p.a}" opacity=".9">${p.t}</text>
  <ellipse cx="170" cy="220" rx="90" ry="115" fill="${p.b}" opacity=".06"/>
  <ellipse cx="140" cy="200" rx="55" ry="80" fill="${p.a}" opacity=".07"/>
  <text x="170" y="238" text-anchor="middle" font-family="serif" font-size="60" fill="${p.a}" opacity=".12">✦</text>
  <text x="170" y="240" text-anchor="middle" font-family="serif" font-size="32" fill="${p.c}" opacity=".22">✦</text>
  <line x1="40" y1="155" x2="300" y2="155" stroke="${p.a}" stroke-opacity=".25" stroke-width=".8"/>
  <line x1="40" y1="300" x2="300" y2="300" stroke="${p.a}" stroke-opacity=".20" stroke-width=".8"/>
  ${lines.map((l,i)=>`<text x="170" y="${titleY+i*32}" text-anchor="middle" font-family="Playfair Display,serif" font-weight="900" font-size="${lines.length===1?26:23}" fill="#f7f0da" opacity=".96">${esc(l)}</text>`).join('')}
  <text x="170" y="${titleY+lines.length*32+18}" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="13" fill="#9e9282" font-style="italic">${movie?.year||''} · ${esc(g)}</text>
  <text x="170" y="438" text-anchor="middle" font-family="Cormorant Garamond,serif" letter-spacing="4" font-size="9" fill="${p.a}" opacity=".85">NOW PLAYING</text>
  <text x="170" y="460" text-anchor="middle" font-family="IM Fell English,serif" font-style="italic" font-size="13" fill="#e4d9b8" opacity=".7">"A splendid choice, darling."</text>
  <rect width="340" height="510" filter="url(#gr)" opacity=".5"/>
</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.trim());
}

// ── SVG actor portrait ────────────────────────────────────────────────────────
export function actorPortraitSvg(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  const p        = ACTOR_PALETTES[Math.abs(hash) % ACTOR_PALETTES.length];
  const initials = name.split(' ').map(w => w[0]||'').join('').slice(0,2).toUpperCase();
  const variant  = Math.abs(hash) % 4;

  const sils = [
    `<ellipse cx="170" cy="165" rx="56" ry="68" fill="${p.a}" opacity=".14"/><ellipse cx="170" cy="152" rx="38" ry="44" fill="${p.a}" opacity=".22"/>`,
    `<ellipse cx="155" cy="160" rx="42" ry="50" fill="${p.b}" opacity=".18"/><circle cx="160" cy="145" r="36" fill="${p.a}" opacity=".16"/>`,
    `<ellipse cx="170" cy="155" rx="50" ry="60" fill="${p.a}" opacity=".20"/><ellipse cx="170" cy="265" rx="95" ry="52" fill="${p.b}" opacity=".09"/>`,
    `<ellipse cx="160" cy="165" rx="45" ry="58" fill="${p.a}" opacity=".16"/><ellipse cx="180" cy="270" rx="80" ry="50" fill="${p.a}" opacity=".10"/>`,
  ];

  function e2(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="420" viewBox="0 0 340 420">
  <defs>
    <linearGradient id="abg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg}"/><stop offset="1" stop-color="#080503"/></linearGradient>
    <radialGradient id="asp" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="${p.a}" stop-opacity=".22"/><stop offset="1" stop-color="transparent"/></radialGradient>
    <filter id="agr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .06 0"/>
    </filter>
  </defs>
  <rect width="340" height="420" fill="url(#abg)"/>
  <rect width="340" height="420" fill="url(#asp)"/>
  <rect x="10" y="10" width="320" height="400" rx="8" fill="none" stroke="${p.a}" stroke-opacity=".5" stroke-width="1.5"/>
  ${sils[variant]}
  <text x="170" y="230" text-anchor="middle" font-family="Playfair Display,serif" font-weight="900" font-size="88" fill="${p.a}" opacity=".18">${e2(initials)}</text>
  <line x1="56" y1="298" x2="284" y2="298" stroke="${p.a}" stroke-opacity=".25" stroke-width="1"/>
  <text x="170" y="338" text-anchor="middle" font-family="Playfair Display,serif" font-weight="700" font-size="22" fill="#f7f0da" opacity=".94">${e2(name.split(' ').slice(-1)[0])}</text>
  <text x="170" y="362" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="14" fill="#9e9282" font-style="italic">${e2(name.split(' ').slice(0,-1).join(' '))}</text>
  <text x="170" y="390" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="8" letter-spacing="5" fill="${p.a}" opacity=".7">SILVER SCREEN STAR</text>
  <rect width="340" height="420" filter="url(#agr)" opacity=".45"/>
</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.trim());
}
