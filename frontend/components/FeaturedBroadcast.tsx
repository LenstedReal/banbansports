'use client';
import { useEffect, useRef, useState } from 'react';

type FeaturedStatus = { live: boolean; channel: string; name: string; configured: boolean };

const CHANNEL_LOGO: Record<string, string> = {
  bein1: '/logos/channels/bein1.png',
  ssport: '/logos/channels/ssport.png',
  trt1: '/logos/channels/trt1.png',
  trtspor: '/logos/channels/trtspor.png',
  tv8: '/logos/channels/tv8.png',
  trthaber: '/logos/channels/trthaber.png',
  tivibuspor: '/logos/channels/tivibuspor.png',
};

export default function FeaturedBroadcast() {
  const [status, setStatus] = useState<FeaturedStatus | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const r = await fetch('/api/featured/status', { cache: 'no-store' });
        if (!r.ok || cancelled) return;
        const d = await r.json();
        if (!cancelled) setStatus(d);
      } catch { /* sessiz */ }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const live = !!status?.live;

  // Canlı önizleme (muted autoplay) — sadece yayın canlıyken
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !live) {
      if (hlsRef.current) { try { hlsRef.current.destroy(); } catch { /* noop */ } hlsRef.current = null; }
      return;
    }
    setPreviewFailed(false);
    let cancelled = false;
    const src = '/api/featured/stream.m3u8';
    (async () => {
      if (v.canPlayType('application/vnd.apple.mpegurl')) {
        v.src = src; v.muted = true;
        try { await v.play(); } catch { /* noop */ }
        return;
      }
      try {
        const mod: any = await import('hls.js');
        const Hls = mod.default;
        if (cancelled) return;
        if (Hls.isSupported()) {
          const h = new Hls({ enableWorker: true, lowLatencyMode: false, liveSyncDurationCount: 3, backBufferLength: 15 });
          hlsRef.current = h;
          h.loadSource(src);
          h.attachMedia(v);
          h.on(Hls.Events.MANIFEST_PARSED, () => { v.muted = true; v.play().catch(() => { /* noop */ }); });
          h.on(Hls.Events.ERROR, (_: any, data: any) => { if (data?.fatal) setPreviewFailed(true); });
        } else { setPreviewFailed(true); }
      } catch { setPreviewFailed(true); }
    })();
    return () => {
      cancelled = true;
      if (hlsRef.current) { try { hlsRef.current.destroy(); } catch { /* noop */ } hlsRef.current = null; }
    };
  }, [live]);

  // "İZLE" → ana oynatıcıda ilgili kanalı seç (reklam/kalite/failover dahil tüm işlevler)
  const watchFull = () => {
    if (!live || !status?.channel) return;
    try { window.dispatchEvent(new CustomEvent('bb:select-channel', { detail: { id: status.channel } })); } catch { /* noop */ }
    const el = document.querySelector('[data-testid="video-wrapper"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const name = status?.name || 'beIN SPORTS 1';
  const logo = CHANNEL_LOGO[status?.channel || 'bein1'];

  return (
    <section className="featured-strip" data-testid="featured-broadcast" data-live={live ? '1' : '0'}>
      <div className="featured-strip-inner">
        {/* Sol: küçük canlı ekran */}
        <div className="fs-screen" onClick={watchFull} role="button" data-testid="featured-screen">
          {live && !previewFailed ? (
            <video ref={videoRef} className="fs-video" muted playsInline autoPlay controls={false} data-testid="featured-preview-video" />
          ) : (
            <div className="fs-poster">
              <div className="fs-grid" />
              {logo ? <img src={logo} alt={name} className="fs-poster-logo" /> : null}
            </div>
          )}
          <span className={`fs-badge ${live ? 'on' : 'off'}`} data-testid="featured-live-badge">
            <span className="fs-dot" />{live ? 'CANLI' : 'BEKLEMEDE'}
          </span>
        </div>

        {/* Orta: bilgi */}
        <div className="fs-meta">
          <div className="fs-kicker">ÖNE ÇIKAN MAÇ</div>
          <div className="fs-title" data-testid="featured-channel-name">{name}</div>
          <div className="fs-sub">
            {live ? 'Günün öne çıkan yayını şu an aktif' : 'Öne çıkan maç başlayınca burada canlı görünür'}
          </div>
        </div>

        {/* Sağ: aksiyon */}
        <button className="fs-cta" onClick={watchFull} disabled={!live} data-testid="featured-watch-btn">
          {live ? '▶  İZLE' : 'BEKLEMEDE'}
        </button>
      </div>
    </section>
  );
}
