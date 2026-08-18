'use client';
/* BOX OFFICE — SİNEMATİK TEK KOMPOZİSYON:
   Üst: tam genişlik hero (başlık + poster + İZLE + rozetler + IMDb + KONU görselin ÜZERİNDE).
   Alt: kompakt gişe verileri (BoxOfficeCounter). Veriler AYNEN korunur. */
import { useEffect, useState } from 'react';
import type { Movie } from './MoviePlayer';
import BoxOfficeCounter from './BoxOfficeCounter';

export default function CinemaSection() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [imdb, setImdb] = useState<{ rating: number; votes: string } | null>(null);
  const [meta, setMeta] = useState<string | null>(null);
  const [plot, setPlot] = useState<{ text: string; credits?: string } | null>(null);
  const [plotOpen, setPlotOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/movies', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.movies?.length) setMovie(d.movies[0]); })
      .catch(() => { /* noop */ });
    return () => { alive = false; };
  }, []);

  const openMovie = () => {
    try { window.dispatchEvent(new CustomEvent('bb:open-movie')); } catch { /* noop */ }
  };

  return (
    <div className="pnl cin-card" id="filmler" data-testid="movie-tile">
      <div className="pnl-head">
        <span className="pnl-title" data-testid="boxoffice-source-title">KAYNAK</span>
        {meta && <span className="cin-src" data-testid="boxoffice-sources">{meta}</span>}
      </div>

      {/* ===== SİNEMATİK HERO — her şey görselin üzerinde ===== */}
      {movie && (
        <div className={`cin2-hero${plotOpen ? ' expanded' : ''}`} data-testid="boxoffice-hero" id="box-office">
          <img
            className="cin2-hero-img"
            src={movie.backdrop || '/spiderman_backdrop_v2.jpg'}
            alt={movie.title}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
          <div className="cin2-shade" aria-hidden="true" />

          {/* üst şerit: rozetler + IMDb */}
          <div className="cin2-top">
            <div className="bo2-badges" data-testid="boxoffice-badges">
              <span className="bo2-live-badge" data-testid="boxoffice-live-badge"><span className="bo2-live-dot" />CANLI GİŞE</span>
              {movie.badge && <span className="bo2-new-badge" data-testid="boxoffice-new-badge">{movie.badge} FİLM</span>}
            </div>
            {imdb && (
              <span className="cin2-imdb" data-testid="boxoffice-imdb-rating" title={`${imdb.votes} oy`}>
                <span className="bo2-imdb-logo">IMDb</span> ★ {imdb.rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* KONU — cam çip + açılır panel */}
          {plot && (
            <button className="cin2-plot-chip" data-testid="plot-toggle-btn" onClick={() => setPlotOpen((s) => !s)}>
              KONU {plotOpen ? '▲' : '▼'}
            </button>
          )}
          {plot && plotOpen && (
            <div className="cin2-plot" data-testid="boxoffice-plot" onClick={() => setPlotOpen(false)}>
              <p data-testid="boxoffice-plot-text">{plot.text}</p>
              {plot.credits && <div className="bo2-credits" data-testid="boxoffice-plot-credits">{plot.credits}</div>}
            </div>
          )}

          {/* alt blok: poster + başlık + etiketler + İZLE */}
          <div className="cin2-bottom">
            <img
              className="cin2-poster"
              src={movie.poster || '/spiderman_poster_v2.jpg'}
              alt={movie.title}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <div className="cin2-titles">
              <div className="cin2-title" data-testid="movie-title">{movie.title.toLocaleUpperCase('tr-TR')}</div>
              <div className="cin2-subtitle">{movie.title_en} · VİZYONDA · {movie.release_date}</div>
              <div className="cin2-tags">
                <span className="cin-tag t-dub" data-testid="movie-tag-dub">TÜRKÇE DUBLAJ · 720p</span>
                <span className="cin-tag t-sub" data-testid="movie-tag-sub">TÜRKÇE ALTYAZI · 1080p</span>
              </div>
            </div>
            <button className="btn-neon b-pink cin2-watch" data-testid="movie-shelf-watch" onClick={openMovie}>
              ▶ İZLE
            </button>
          </div>
        </div>
      )}

      {/* ===== KOMPAKT GİŞE VERİLERİ ===== */}
      <div className="cin2-stats">
        <BoxOfficeCounter
          onImdb={(rating, votes) => setImdb({ rating, votes })}
          onMeta={setMeta}
          onPlot={(text, credits) => setPlot({ text, credits })}
        />
      </div>
    </div>
  );
}
