'use client';
import { useEffect, useRef, useState } from 'react';
import { getClient } from '@/lib/api';
import type { Match } from '@/lib/api';

export default function MatchBanner({ initialMatches }: { initialMatches: Match[] }) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (matches.length <= 1) return;
    const id = setInterval(() => setIdx(i => (i + 1) % matches.length), 30_000);
    return () => clearInterval(id);
  }, [matches.length]);

  const polled = useRef(false);
  useEffect(() => {
    if (polled.current) return;
    polled.current = true;
    const tick = async () => {
      const d = await getClient<{ matches?: Match[] }>('/api/scores/top?n=5');
      if (d?.matches?.length) setMatches(d.matches);
    };
    // İlk anında bir fetch yap — initialMatches boşsa "Maç verisi yükleniyor…" sıkışmasın
    if (initialMatches.length === 0) tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!matches.length) {
    return (
      <div className="match-banner" data-testid="match-banner">
        <div className="match-content"><div className="league-info" style={{opacity:1}}>Maç verisi yükleniyor…</div></div>
      </div>
    );
  }

  const m = matches[idx];
  // Bug #6 fix: regex /^\d+/ false-positive (saat "19:00" digit prefix). Sadece backend flag.
  const live = !!m.isLive;
  const isNS = m.score1 == null;
  const leagueLabel = (live ? '● CANLI' : isNS ? '● YAKLAŞAN' : '● MAÇ') + ' · ' + (m.league || 'FUTBOL');

  return (
    <div className="match-banner" data-testid="match-banner">
      <div className="match-content">
        <div className="league-info" data-testid="league-info" style={{opacity:1}}>
          {leagueLabel} <span style={{opacity:0.6, marginLeft:8}}>{m.status || ''}</span>
        </div>
        <div className="teams-container" style={{opacity:1}}>
          <div className="team team-left"><span className="team-name" data-testid="team1">{m.team1}</span></div>
          <div className="score-container">
            <span className="score" data-testid="score1">{isNS ? 'vs' : m.score1}</span>
            {!isNS && <span className="score-separator" style={{display:'inline'}}>:</span>}
            {!isNS && <span className="score" data-testid="score2">{m.score2}</span>}
            {(m.pen1 !== null && m.pen1 !== undefined) && <span className="pen-badge">PEN {m.pen1}-{m.pen2}</span>}
          </div>
          <div className="team team-right"><span className="team-name" data-testid="team2">{m.team2}</span></div>
        </div>
        {m.status && (
          <div className="match-minute" data-testid="match-minute" style={{opacity:1}}>{m.status}</div>
        )}
        {matches.length > 1 && (
          <div style={{display:'flex',gap:6,justifyContent:'center',marginTop:14}} data-testid="banner-dots">
            {matches.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Maç ${i+1}`}
                style={{
                  height: 4, borderRadius: 2,
                  width: i === idx ? 28 : 10,
                  background: i === idx ? 'var(--cyan)' : 'rgba(255,255,255,0.15)',
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: i === idx ? '0 0 8px var(--cyan)' : 'none',
                }}
                data-testid={`banner-dot-${i}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
