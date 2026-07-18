import type { Metadata } from 'next';
import Link from 'next/link';
import { getServer } from '@/lib/api';
import { epsToLabel, trLeagueName } from '@/lib/i18n';
import MatchDetailClient from './MatchDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

type MatchStats = {
  available: boolean;
  home: string; away: string;
  league?: string;
  score?: { home: number; away: number; pen_home?: number | null; pen_away?: number | null };
  events?: any[];
  stats?: Record<string, { home: any; away: any }>;
  sources?: string[];
  eps?: string;
  venue?: string;
  message?: string;
};

async function fetchMatch(slug: string): Promise<MatchStats | null> {
  try {
    // Slug may arrive percent-encoded; backend expects raw UTF-8 in path
    const decoded = (() => { try { return decodeURIComponent(slug); } catch { return slug; } })();
    return await getServer<MatchStats>(`/api/match/by-slug/${encodeURIComponent(decoded)}`);
  } catch {
    return null;
  }
}

function decodeSlug(slug: string): { home: string; away: string; date: string } {
  // Accept both raw and percent-encoded slugs
  let s = slug;
  try { s = decodeURIComponent(slug); } catch { /* invalid percent-encoding — fall back to raw slug */ }
  const parts = s.split('__');
  return {
    home: (parts[0] || '').replace(/_/g, ' '),
    away: (parts[1] || '').replace(/_/g, ' '),
    date: parts[2] || '',
  };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const m = await fetchMatch(id);
  const decoded = decodeSlug(id);
  const home = m?.home || decoded.home || 'Maç';
  const away = m?.away || decoded.away || 'banbansports';
  const score = m?.score ? `${m.score.home}-${m.score.away}` : '';
  const title = score
    ? `${home} ${score} ${away} — Detay · banbansports`
    : `${home} vs ${away} — Canlı Detay · banbansports`;
  const desc = m?.league
    ? `${trLeagueName(m.league)} · ${home} - ${away} canlı skor, istatistik ve maç olayları.`
    : 'Canlı skor, istatistik ve maç olayları — banbansports UNDERGROUND HD.';
  const og = `/og/match?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}&score=${encodeURIComponent(score)}&league=${encodeURIComponent(m?.league || '')}`;
  return {
    title,
    description: desc,
    openGraph: {
      title, description: desc, type: 'website',
      images: [{ url: og, width: 1200, height: 630, alt: `${home} vs ${away}` }],
    },
    twitter: { card: 'summary_large_image', title, description: desc, images: [og] },
  };
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await fetchMatch(id);
  const decoded = decodeSlug(id);
  const home = m?.home || decoded.home || '—';
  const away = m?.away || decoded.away || '—';

  return (
    <div className="app-container">
      <div className="scanlines" />
      <header style={{ borderBottom: '1px solid rgba(255,0,170,0.2)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" className="text-neon-cyan" style={{ fontFamily: 'Orbitron, sans-serif', textDecoration: 'none', letterSpacing: 3, fontSize: 18 }}>
          ← banbansports
        </Link>
        <div style={{ fontFamily: 'VT323, monospace', color: 'var(--text-dim)', letterSpacing: 2, fontSize: 11 }}>MAÇ DETAYI</div>
      </header>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(10px, 3vw, 20px)' }} data-testid="match-detail-page">
        {/* SSR header block — instant content, SEO ready */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(255,0,170,0.08), rgba(0,240,255,0.04))',
          border: '1px solid rgba(255,0,170,0.2)',
          borderRadius: 12, padding: 'clamp(14px, 3vw, 24px) clamp(14px, 3vw, 30px)', marginBottom: 20,
        }}>
          {m?.league && (
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 11, letterSpacing: 3, color: 'var(--cyan, #00f0ff)', textAlign: 'center', marginBottom: 14 }} data-testid="match-league">
              {trLeagueName(m.league).toUpperCase()}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 'clamp(8px, 2vw, 16px)' }}>
            <div style={{ textAlign: 'right', minWidth: 0 }}>
              <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 'clamp(15px, 4vw, 28px)', letterSpacing: 1, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }} data-testid="match-home">{home}</h1>
            </div>
            <div style={{ textAlign: 'center', fontFamily: 'Orbitron, sans-serif', fontSize: 'clamp(28px, 7vw, 48px)', color: 'var(--cyan, #00f0ff)', textShadow: '0 0 14px rgba(0,240,255,0.5)', letterSpacing: 'clamp(2px, 0.5vw, 4px)', whiteSpace: 'nowrap' }} data-testid="match-score">
              {m?.score && !['NS', 'Not Started'].includes(String(m?.eps || '')) ? `${m.score.home}–${m.score.away}` : 'vs'}
              {m?.score?.pen_home != null && (
                <div style={{ fontSize: 13, color: 'var(--orange, #ffa600)', marginTop: 6, letterSpacing: 2 }}>
                  PEN {m.score.pen_home}-{m.score.pen_away}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 'clamp(15px, 4vw, 28px)', letterSpacing: 1, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }} data-testid="match-away">{away}</h1>
            </div>
          </div>
          {m?.eps && (
            <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--pink)', fontFamily: 'VT323, monospace', letterSpacing: 2 }} data-testid="match-eps">
              {epsToLabel(m.eps).txt}
            </div>
          )}
          {m?.venue && (
            <div style={{ textAlign: 'center', marginTop: 6, color: 'var(--text-dim)', fontSize: 11, letterSpacing: 2 }} data-testid="match-venue">
              🏟 STADYUM: {(typeof m.venue === 'string' ? m.venue : (m.venue as any)?.Vnm || '').toUpperCase()}
            </div>
          )}
        </div>

        {/* Client-side modal-style detail (events + stats + my prediction badge) */}
        <MatchDetailClient home={home} away={away} date={decoded.date} initial={m} />
      </main>
    </div>
  );
}
