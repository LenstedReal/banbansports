'use client';
/* Sağ kolon — CANLI YAYINDA + TV KANALLARI. Kanal seçimi bb:select-channel
   event'iyle VideoPlayer'a iletilir; player durumu bb:player-state ile gelir. */
import { useEffect, useState } from 'react';
import { CHANNELS, type Channel } from '@/lib/channels';

function ChannelLogo({ logo, label }: { logo?: string; label: string }) {
  return (
    <span className="rail-ch-logo" aria-label={label}>
      {logo ? <img src={logo} alt={label} loading="lazy" /> : <span>{label}</span>}
    </span>
  );
}

type PlayerState = { id: string; hasPicked: boolean; locked: boolean };

export default function ChannelRail() {
  const [liveStatus, setLiveStatus] = useState<Record<string, { configured: boolean; ok: boolean }>>({});
  const [featured, setFeatured] = useState<{ live: boolean; channel: string; status: string; match: any }>({ live: false, channel: '', status: 'none', match: null });
  const [player, setPlayer] = useState<PlayerState>({ id: '', hasPicked: false, locked: false });

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const r = await fetch('/api/stream/status', { cache: 'no-store' });
        if (!r.ok || cancelled) return;
        const data = await r.json();
        if (data && data.channels && !cancelled) {
          setLiveStatus((prev) => ({ ...prev, ...data.channels }));
        }
      } catch { /* sessiz */ }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchFeatured = async () => {
      try {
        const r = await fetch('/api/featured/status', { cache: 'no-store' });
        if (!r.ok || cancelled) return;
        const d = await r.json();
        if (cancelled) return;
        setFeatured((prev) => ({
          live: !!d.live, channel: d.channel || '', status: d.status || 'none',
          match: d.match || prev.match,
        }));
        if (d.channel && d.status === 'live') {
          setLiveStatus((prev) => ({ ...prev, [d.channel]: { configured: true, ok: !!d.live } }));
        }
      } catch { /* sessiz */ }
    };
    fetchFeatured();
    const id = setInterval(fetchFeatured, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    const onState = (e: Event) => {
      const d = (e as CustomEvent)?.detail;
      if (d) setPlayer({ id: d.id || '', hasPicked: !!d.hasPicked, locked: !!d.locked });
    };
    window.addEventListener('bb:player-state', onState as EventListener);
    return () => window.removeEventListener('bb:player-state', onState as EventListener);
  }, []);

  const effStatus = (c: Channel): Channel['status'] => {
    const isFeaturedLive = (featured.live && featured.channel === c.id) || c.id === 'trthaber';
    if (isFeaturedLive) return 'online';
    const live = liveStatus[c.id];
    if (live) return !live.configured ? 'maintenance' : (live.ok ? 'online' : 'maintenance');
    return c.status;
  };

  const pick = (c: Channel) => {
    if (player.locked) return;
    try {
      window.dispatchEvent(new CustomEvent('bb:select-channel', { detail: { id: c.id } }));
      document.getElementById('canli-yayin')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch { /* noop */ }
  };

  return (
    <div className="pnl" id="tv-kanallari" data-testid="channels-row">
      <div className="pnl-head">
        <span className="pnl-title">TV KANALLARI</span>
      </div>
      <div className="rail-list" data-testid="channel-sidebar">
        {CHANNELS.map((c) => {
          const status = effStatus(c);
          const isFeaturedLive = (featured.live && featured.channel === c.id) || c.id === 'trthaber';
          const isFeaturedUpcoming = !isFeaturedLive && featured.status === 'upcoming' && featured.channel === c.id;
          const featuredMatch = (featured.match && featured.match.app_channel === c.id) ? featured.match : null;
          const featuredTitle = featuredMatch
            ? `${featuredMatch.home} - ${featuredMatch.away} · ${featuredMatch.time}${featuredMatch.league ? ' · ' + featuredMatch.league : ''}`
            : c.name;
          const upcomingLabel = (() => {
            const n = featuredMatch?.starts_in_min ?? 0;
            if (n <= 0) return 'YAKINDA';
            if (n < 60) return `${n} DK`;
            return `${Math.floor(n / 60)} SA`;
          })();
          const active = player.hasPicked && player.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => pick(c)}
              disabled={player.locked}
              className={`rail-ch ${active ? 'active' : ''}`}
              data-status={status}
              data-testid={`channel-${c.id}`}
              title={featuredTitle}
              aria-label={c.name}
            >
              <ChannelLogo logo={c.logo} label={c.short || c.name} />
              <span className="rail-ch-name">{c.name}</span>
              {c.premium && <span className="rail-ch-hd">HD</span>}
              {isFeaturedLive && <span className="rail-ch-flag">CANLI</span>}
              {isFeaturedUpcoming && <span className="rail-ch-flag upcoming">{upcomingLabel}</span>}
              <span className={`rail-ch-status ${status === 'online' ? 'on' : status === 'maintenance' ? 'maint' : 'off'}`}>
                <span className="dot" />
                {status === 'online' ? 'CANLI' : status === 'maintenance' ? 'BAKIM' : '—'}
              </span>
            </button>
          );
        })}
      </div>
      <div className="rail-soon" data-testid="channels-coming-soon">
        <span className="rail-soon-dot" />
        <span>YAKINDA DAHA FAZLASI</span>
      </div>
    </div>
  );
}
