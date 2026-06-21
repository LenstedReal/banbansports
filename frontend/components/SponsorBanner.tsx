'use client';

/**
 * SponsorBanner — küçük, profesyonel bahis-tarzı sponsor reklamı.
 * Video player'ın ALTINDA, video alanı DIŞINDA gösterilir. Neon glass-morphism
 * tasarım, amatör görüntü içermez. Tıklanınca yeni sekmede sponsor sitesine açılır.
 */
export default function SponsorBanner() {
  return (
    <section
      className="mx-auto max-w-7xl px-4 mt-6 mb-4"
      data-testid="sponsor-banner"
      aria-label="Sponsor"
    >
      <a
        href="https://example.com/sponsor"
        target="_blank"
        rel="noopener noreferrer sponsored"
        data-testid="sponsor-link"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '14px 22px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(20,8,38,0.85) 0%, rgba(45,12,55,0.78) 50%, rgba(15,8,28,0.85) 100%)',
          border: '1.5px solid rgba(255,0,170,0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(255,0,170,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
          color: '#fff',
          textDecoration: 'none',
          overflow: 'hidden',
          position: 'relative',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6), 0 0 36px rgba(255,0,170,0.45), inset 0 1px 0 rgba(255,255,255,0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(255,0,170,0.25), inset 0 1px 0 rgba(255,255,255,0.08)';
        }}
      >
        {/* SOL — Bahis ikonu (kart + chip kombosu, SVG) */}
        <div
          style={{
            flexShrink: 0,
            width: 52,
            height: 52,
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(255,0,170,0.2), rgba(0,240,255,0.15))',
            border: '1px solid rgba(255,0,170,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(255,0,170,0.3)',
          }}
          aria-hidden="true"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cyan, #00f0ff)' }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a15 15 0 0 1 0 20" />
            <path d="M12 2a15 15 0 0 0 0 20" />
            <path d="M2 12h20" />
          </svg>
        </div>

        {/* ORTA — Başlık + alt yazı */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'Orbitron, sans-serif',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 2.5,
              color: '#fff',
              textShadow: '0 0 8px rgba(255,0,170,0.5)',
              textTransform: 'uppercase',
            }}
          >
            Resmi Yayın Sponsoru
          </div>
          <div
            style={{
              fontFamily: 'VT323, monospace',
              fontSize: 14,
              letterSpacing: 1,
              color: 'rgba(255,255,255,0.78)',
              marginTop: 2,
            }}
          >
            18+ • Sorumlu oyna • Yüksek oranlar + canlı bahis
          </div>
        </div>

        {/* SAĞ — CTA pill */}
        <div
          style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderRadius: 999,
            background: 'linear-gradient(90deg, var(--pink, #ff00aa) 0%, var(--cyan, #00f0ff) 100%)',
            color: '#000',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 2,
            boxShadow: '0 4px 14px rgba(255,0,170,0.5), 0 0 18px rgba(0,240,255,0.3)',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          Kayıt Ol →
        </div>

        {/* Köşede küçük "REKLAM" rozeti — transparency için yasal */}
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 8,
            fontSize: 8,
            letterSpacing: 1.5,
            color: 'rgba(255,255,255,0.35)',
            fontFamily: 'VT323, monospace',
            pointerEvents: 'none',
          }}
        >
          REKLAM
        </span>
      </a>
    </section>
  );
}
