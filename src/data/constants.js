// ── Colour palettes for SVG poster fallbacks ─────────────────────────────────
export const PALETTES = {
  Action:      { a: "#d4274a", b: "#ff3d9a", c: "#c9a84c", t: "ACTION"    },
  Adventure:   { a: "#d4274a", b: "#17b8b8", c: "#c9a84c", t: "ADVENTURE" },
  Animation:   { a: "#17b8b8", b: "#8fdb2a", c: "#ff3d9a", t: "ANIMATION" },
  Comedy:      { a: "#e8a020", b: "#17b8b8", c: "#d4274a", t: "COMEDY"    },
  Crime:       { a: "#2d59ff", b: "#c9a84c", c: "#17b8b8", t: "CRIME"     },
  Documentary: { a: "#c9a84c", b: "#2d59ff", c: "#17b8b8", t: "DOC"       },
  Drama:       { a: "#2d59ff", b: "#b44cff", c: "#c9a84c", t: "DRAMA"     },
  Family:      { a: "#17b8b8", b: "#8fdb2a", c: "#ff3d9a", t: "FAMILY"    },
  Fantasy:     { a: "#b44cff", b: "#17b8b8", c: "#ff3d9a", t: "FANTASY"   },
  History:     { a: "#c9a84c", b: "#2d59ff", c: "#17b8b8", t: "HISTORY"   },
  Horror:      { a: "#b44cff", b: "#8b1a1a", c: "#17b8b8", t: "HORROR"    },
  Music:       { a: "#ff3d9a", b: "#c9a84c", c: "#2d59ff", t: "MUSIC"     },
  Mystery:     { a: "#17b8b8", b: "#b44cff", c: "#c9a84c", t: "MYSTERY"   },
  Romance:     { a: "#d4274a", b: "#ff3d9a", c: "#17b8b8", t: "ROMANCE"   },
  "Sci-Fi":    { a: "#2d59ff", b: "#17b8b8", c: "#b44cff", t: "SCI-FI"    },
  Thriller:    { a: "#17b8b8", b: "#2d59ff", c: "#d4274a", t: "THRILLER"  },
  War:         { a: "#c9a84c", b: "#2d59ff", c: "#d4274a", t: "WAR"       },
  Western:     { a: "#c9a84c", b: "#d4274a", c: "#2d59ff", t: "WESTERN"   },
};

// ── Actor portrait palettes ───────────────────────────────────────────────────
export const ACTOR_PALETTES = [
  { bg: "#1a0a1e", a: "#b44cff", b: "#ff3d9a", c: "#17b8b8" },
  { bg: "#06102e", a: "#2d59ff", b: "#17b8b8", c: "#c9a84c" },
  { bg: "#0e1a06", a: "#8fdb2a", b: "#17b8b8", c: "#ff3d9a" },
  { bg: "#1e0610", a: "#d4274a", b: "#ff3d9a", c: "#c9a84c" },
  { bg: "#06181e", a: "#17b8b8", b: "#2d59ff", c: "#b44cff" },
  { bg: "#1a1206", a: "#c9a84c", b: "#d4274a", c: "#17b8b8" },
];

// ── Tab navigation ────────────────────────────────────────────────────────────
export const TAB_LABELS = [
  { id: "nowplaying", icon: "🎟️", label: "Now Playing" },
  { id: "search",     icon: "🔍",  label: "Search"      },
  { id: "actors",     icon: "🎭",  label: "Actors"      },
  { id: "quiz",       icon: "🎬",  label: "Quiz"        },
  { id: "random",     icon: "🎲",  label: "Random"      },
];

// ── Quiz genre options (name + emoji) ─────────────────────────────────────────
export const GENRE_OPTS = [
  { e: "🎭", g: "Drama"       },
  { e: "😂", g: "Comedy"      },
  { e: "💀", g: "Thriller"    },
  { e: "❤️", g: "Romance"    },
  { e: "🚀", g: "Sci-Fi"     },
  { e: "🔍", g: "Mystery"     },
  { e: "🎬", g: "Action"      },
  { e: "👻", g: "Horror"      },
  { e: "✨", g: "Fantasy"     },
  { e: "🎵", g: "Music"       },
  { e: "🎞", g: "Animation"   },
  { e: "💰", g: "Crime"       },
  { e: "🌍", g: "Adventure"   },
  { e: "👨‍👩‍👧", g: "Family"  },
];

// ── Watchlist rating labels ───────────────────────────────────────────────────
export const RATING_LABELS = ["", "Dreadful", "Poor", "Fair", "Good", "Magnificent!"];
