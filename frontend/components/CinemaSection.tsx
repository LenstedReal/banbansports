'use client';
/* BOX OFFICE — sinematik film deneyimi: poster + İZLE + canlı gişe sayacı tek kompozisyonda.
   Film verisi /api/movies, gişe verisi BoxOfficeCounter içinde /api/boxoffice. Veriler AYNEN kullanılır. */
import { useEffect, useState } from 'react';
import type { Movie } from './MoviePlayer';
import BoxOfficeCounter from './BoxOfficeCounter';

export default function CinemaSection() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [imdb, setImdb] = useState<{ rating: number; votes: string } | null>(null);
  const [meta, setMeta] = useState<string | null>(null);

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
      <div
        className="cin-backdrop"
        style={{ backgroundImage: `url('${movie?.backdrop || '/spiderman_backdrop_v2.jpg'}')` }}
        aria-hidden="true"
      />
      <div className="cin-veil" aria-hidden="true" />
      <div className="cin-inner">
        <div className="pnl-head" style={{ position: 'relative', zIndex: 2 }}>
          <span className="pnl-title" data-testid="boxoffice-source-title">KAYNAK</span>
          {meta && <span className="cin-src" data-testid="boxoffice-sources">{meta}</span>}
        </div>
        <div className="cin-body" id="box-office">
          {movie && (
            <div className="cin-poster-col">
              <img
                className="cin-poster"
                src={movie.poster || '/spiderman_poster_v2.jpg'}
                alt={movie.title}
                loading="lazy"
              />
              <div className="cin-tags">
                <span className="cin-tag t-dub" data-testid="movie-tag-dub">TÜRKÇE DUBLAJ · 720p</span>
                <span className="cin-tag t-sub" data-testid="movie-tag-sub">TÜRKÇE ALTYAZI · 1080p</span>
              </div>
              <button className="btn-neon b-pink cin-watch" data-testid="movie-shelf-watch" onClick={openMovie}>
                ▶ İZLE
              </button>
              {imdb && (
                <span className="cin-imdb" data-testid="boxoffice-imdb-rating" title={`${imdb.votes} oy`}>
                  <span className="bo2-imdb-logo">IMDb</span>
                  <span>★</span>
                  {imdb.rating.toFixed(1)}
                  <span className="bo2-imdb-votes">· {imdb.votes} oy</span>
                </span>
              )}
            </div>
          )}
          <div className="cin-main">
            <BoxOfficeCounter
              badge={movie?.badge}
              backdrop={movie?.backdrop || '/spiderman_backdrop.jpg'}
              onImdb={(rating, votes) => setImdb({ rating, votes })}
              onMeta={setMeta}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
