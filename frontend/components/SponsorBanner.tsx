'use client';

/**
 * SponsorBanner — Grandpashabet sponsor reklamı. Video player'ın ALTINDA, tam
 * genişlikte tek uzun yatay banner. cenatv tarzı hareketli/animasyonlu: parıltı
 * süpürmesi, yüzen altın parçacıklar ve nabız atan CTA. Yazılar üstünde sabit durur.
 */
const SPONSOR_URL = 'https://grandpashabet8239.com/?btag=52146205_483350';

export default function SponsorBanner() {
  return (
    <section
      className="mx-auto px-4 mt-6 mb-4"
      style={{ maxWidth: 1060 }}
      data-testid="sponsor-banner"
      aria-label="Sponsor"
    >
      <a
        href={SPONSOR_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="gpb-banner"
        data-testid="sponsor-link"
        aria-label="Grandpashabet - Gel buraya tıkla"
      >
        {/* Hareketli parıltı süpürmesi */}
        <span className="gpb-shine" aria-hidden="true" />
        {/* Yüzen altın parçacıklar */}
        <span className="gpb-coin gpb-coin-1" aria-hidden="true">🪙</span>
        <span className="gpb-coin gpb-coin-2" aria-hidden="true">💰</span>
        <span className="gpb-coin gpb-coin-3" aria-hidden="true">🪙</span>
        <span className="gpb-coin gpb-coin-4" aria-hidden="true">✦</span>

        {/* SOL — marka */}
        <div className="gpb-brand">
          <span className="gpb-crown" aria-hidden="true">♛</span>
          <span className="gpb-logo">
            GRANDPASHA<span className="gpb-logo-accent">BET</span>
          </span>
        </div>

        {/* ORTA — başlık + alt yazı */}
        <div className="gpb-text">
          <div className="gpb-title">RESMİ YAYIN SPONSORU</div>
          <div className="gpb-sub">18+ • Sorumluluk reddi • Yüksek oranlar + canlı bahis</div>
        </div>

        {/* SAĞ — CTA */}
        <div className="gpb-cta" data-testid="sponsor-cta">
          Gel Buraya Tıkla <span className="gpb-cta-sep">|</span> Kayıt Ol
          <span className="gpb-cta-emojis" aria-hidden="true">👆🔥</span>
        </div>

        {/* Yasal şeffaflık rozeti */}
        <span className="gpb-adbadge" aria-hidden="true">Reklam</span>
      </a>
    </section>
  );
}
