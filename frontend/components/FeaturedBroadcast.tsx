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

  // ===== Öne çıkan yayın durumu — 45sn polling =====
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
    const id = setInterval(fetchStatus, 45_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const live = !!status?.live;

  // ===== Canlı önizleme (muted autoplay) — sadece yayın canlıyken =====
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
          const h = new Hls({ enableWorker: true, lowLatencyMode: false, liveSyncDurationCount: 3, backBufferLength: 20 });
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

  const watchFull = () => {
    if (!status?.channel) return;
    try { window.dispatchEvent(new CustomEvent('bb:select-channel', { detail: { id: status.channel } })); } catch { /* noop */ }
    const el = document.querySelector('[data-testid="video-wrapper"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const name = status?.name || 'beIN SPORTS 1';
  const logo = CHANNEL_LOGO[status?.channel || 'bein1'];

  return (
    <section className="featured-broadcast" data-testid="featured-broadcast" data-live={live ? '1' : '0'}>
      <div className="featured-head">
        <span className="featured-kicker">ÖNE ÇIKAN</span>
        <span className={`featured-live-badge ${live ? 'is-live' : 'is-off'}`} data-testid="featured-live-badge">
          <span className="featured-dot" />
          {live ? 'CANLI' : 'YAYIN BEKLENİYOR'}
        </span>
      </div>

      <div className={`featured-stage ${live ? 'live' : 'idle'}`}>
        {/* Sol: önizleme / poster */}
        <div className="featured-screen" data-testid="featured-screen" onClick={live ? watchFull : undefined}>
          {live && !previewFailed ? (
            <video
              ref={videoRef}
              className="featured-video"
              muted playsInline autoPlay
              controls={false}
              data-testid="featured-preview-video"
            />
          ) : (
            <div className="featured-idle-poster">
              <div className="featured-grid-bg" />
              <div className="featured-idle-inner">
                {logo ? <img src={logo} alt={name} className="featured-idle-logo" /> : null}
                <div className="featured-idle-text">
                  {live ? 'YAYIN HAZIRLANIYOR' : 'ŞU AN AKTİF YAYIN YOK'}
                </div>
                <div className="featured-idle-sub">
                  {live ? 'Önizleme yükleniyor…' : 'Öne çıkan maç başlayınca burada canlı görünür'}
                </div>
              </div>
            </div>
          )}
          {live && (
            <div className="featured-screen-badge">
              <span className="featured-dot sm" /> CANLI
            </div>
          )}
        </div>

        {/* Sağ: bilgi + CTA */}
        <div className="featured-meta">
          <div className="featured-ch">
            {logo ? <img src={logo} alt={name} className="featured-ch-logo" /> : null}
            <div>
              <div className="featured-ch-name" data-testid="featured-channel-name">{name}</div>
              <div className="featured-ch-tag">{live ? 'Şu an yayında' : 'Yayın beklemede'}</div>
            </div>
          </div>
          <p className="featured-desc">
            Günün en önemli karşılaşması otomatik olarak burada. Yayın aktif olduğunda
            LED yeşile döner ve tek dokunuşla tam ekran izlersin.
          </p>
          <button
            className="featured-cta"
            onClick={watchFull}
            disabled={!live}
            data-testid="featured-watch-btn"
          >
            {live ? '▶  TAM İZLE' : 'YAYIN BEKLENİYOR'}
          </button>
        </div>
      </div>
    </section>
  );
}
