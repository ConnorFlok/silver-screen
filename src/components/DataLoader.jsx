import { useState, useRef } from 'react';

/**
 * DataLoader
 *
 * Shown on first launch when no local CSV files have been loaded.
 * Lets the user drop or pick their movies.csv and links.csv (and optionally
 * ratings.csv) from the MovieLens dataset.
 *
 * Once all required files are selected, calls onLoad(files) where files is:
 *   { movies: string, links: string, ratings: string|null }
 */
export function DataLoader({ onLoad, onSkip }) {
  const [files,    setFiles]    = useState({ movies: null, links: null, ratings: null });
  const [dragging, setDragging] = useState(false);
  const [error,    setError]    = useState('');
  const inputRef = useRef(null);

  const readFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });

  const handleFiles = async (fileList) => {
    setError('');
    const next = { ...files };
    for (const file of fileList) {
      const name = file.name.toLowerCase();
      if (name === 'movies.csv')  next.movies  = await readFile(file);
      if (name === 'links.csv')   next.links   = await readFile(file);
      if (name === 'ratings.csv') next.ratings = await readFile(file);
    }
    setFiles(next);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    await handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleSubmit = () => {
    if (!files.movies) { setError('movies.csv is required.'); return; }
    if (!files.links)  { setError('links.csv is required.');  return; }
    onLoad(files);
  };

  const ready = files.movies && files.links;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--ink)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Cormorant Garamond', Georgia, serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎬</div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(22px, 4vw, 38px)',
          fontWeight: 900, color: 'var(--gold-l)',
          textShadow: '0 0 20px rgba(201,168,76,.35)',
          marginBottom: '8px',
        }}>
          Load Your MovieLens Dataset
        </h1>
        <p style={{
          fontFamily: "'IM Fell English', serif",
          fontStyle: 'italic', fontSize: '16px',
          color: 'var(--silver-l)', maxWidth: '48ch', margin: '0 auto',
        }}>
          Drop your CSV files below or click to browse — then the show begins, darling.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          width: '100%', maxWidth: '520px',
          border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--gold-d)'}`,
          borderRadius: '12px',
          padding: '40px 32px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(201,168,76,.06)' : 'rgba(201,168,76,.02)',
          transition: 'all .2s',
          marginBottom: '24px',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv"
          style={{ display: 'none' }}
          onChange={e => handleFiles(Array.from(e.target.files))}
        />
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>📂</div>
        <div style={{ color: 'var(--cream)', fontSize: '16px', marginBottom: '6px' }}>
          Drop CSV files here or click to browse
        </div>
        <div style={{ color: 'var(--silver)', fontSize: '13px' }}>
          movies.csv · links.csv · ratings.csv (optional)
        </div>
      </div>

      {/* File status */}
      <div style={{
        width: '100%', maxWidth: '520px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        marginBottom: '24px',
      }}>
        {[
          { key: 'movies',  label: 'movies.csv',  required: true,  desc: 'titles & genres' },
          { key: 'links',   label: 'links.csv',   required: true,  desc: 'TMDB ID bridge for posters' },
          { key: 'ratings', label: 'ratings.csv', required: false, desc: 'star ratings (optional)' },
        ].map(({ key, label, required, desc }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 16px',
            background: files[key] ? 'rgba(23,184,184,.08)' : 'rgba(201,168,76,.04)',
            border: `1px solid ${files[key] ? 'rgba(23,184,184,.4)' : 'var(--ink-3)'}`,
            borderRadius: '6px',
          }}>
            <span style={{ fontSize: '18px' }}>
              {files[key] ? '✅' : required ? '⬜' : '⬜'}
            </span>
            <div>
              <div style={{ color: files[key] ? 'var(--teal)' : 'var(--cream)', fontSize: '14px', fontWeight: 600 }}>
                {label}
                {!required && <span style={{ color: 'var(--silver)', fontWeight: 400, marginLeft: '6px', fontSize: '12px' }}>optional</span>}
              </div>
              <div style={{ color: 'var(--silver)', fontSize: '12px' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ color: 'var(--ruby)', fontStyle: 'italic', fontSize: '14px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={handleSubmit}
          disabled={!ready}
          style={{
            background: 'transparent',
            border: `1px solid ${ready ? 'var(--gold)' : 'var(--gold-d)'}`,
            color: ready ? 'var(--gold)' : 'var(--gold-d)',
            fontFamily: "'Playfair Display', serif",
            fontSize: '12px', fontWeight: 700,
            letterSpacing: '3px', textTransform: 'uppercase',
            padding: '12px 32px', cursor: ready ? 'pointer' : 'default',
            transition: 'all .2s',
          }}
        >
          Load Dataset ✦
        </button>
        <button
          onClick={onSkip}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,.15)',
            color: 'var(--silver-l)',
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '14px', letterSpacing: '2px',
            padding: '11px 24px', cursor: 'pointer',
          }}
        >
          Use TMDB Live Data Instead
        </button>
      </div>

      <p style={{
        color: 'var(--silver)', fontSize: '12px', marginTop: '20px',
        textAlign: 'center', maxWidth: '48ch',
        fontStyle: 'italic',
      }}>
        Files are read locally in your browser — nothing is uploaded to any server.
      </p>
    </div>
  );
}
