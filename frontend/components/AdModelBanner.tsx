'use client';

/**
 * AdModelBanner — video player altında, sponsor reklamının yanında gösterilen
 * HAREKETLİ (Ken Burns yavaş zoom/pan) tıklanabilir reklam. Orijinal görsel
 * hiçbir kayıp olmadan yatay bir banner içinde canlandırılır.
 */
export default function AdModelBanner() {
  return (
    <a
      href="https://shortzit.co/proseogp3"
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="ad-model"
      data-testid="ad-model-banner"
      aria-label="Reklam - Gel buraya tıkla"
    >
      <img
        className="ad-model-img"
        src="/ad_model.jpg"
        alt="Reklam"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      <div className="ad-model-shade" />
      <span className="ad-model-badge">Reklam</span>

      <div className="ad-model-content">
        <span className="ad-model-cta" data-testid="ad-model-cta">
          Gel Buraya Tıkla <span className="ad-model-hand" aria-hidden="true">👆</span>
        </span>
        <span className="ad-model-sub">18+ • Sorumluluk reddi</span>
      </div>
    </a>
  );
}
