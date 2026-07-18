'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getClient } from '@/lib/api';
import { TR } from '@/lib/i18n';

type Event = {
  Eid?: any;
  T1?: { Nm?: string }[];
  T2?: { Nm?: string }[];
  Tr1?: number; Tr2?: number;
  Eps?: string; Esd?: any;
  Trp1?: number; Trp2?: number;
};
type Stage = { Cnm?: string; Snm?: string; Events?: Event[] };

// === LİG FİLTRELERİ ===
const isTRSuperLig = (s: Stage) => /turk/i.test(s.Cnm || '') && /(süper|super)\s*lig/i.test(s.Snm || '');
const isTRCup      = (s: Stage) => /turk/i.test(s.Cnm || '') && /(cup|kupa)/i.test(s.Snm || '');
const isUCL        = (s: Stage) => /(uefa\s)?champions league/i.test(s.Snm || '') && !/youth|women/i.test(s.Snm || '');
const isUEL        = (s: Stage) => /(uefa\s)?europa league/i.test(s.Snm || '') && !/conference|women/i.test(s.Snm || '');
const isUECL       = (s: Stage) => /conference league/i.test(s.Snm || '') && !/women/i.test(s.Snm || '');
const isPremier    = (s: Stage) => /england/i.test(s.Cnm || '') && /^premier league/i.test((s.Snm || '').trim());
const isLaLiga     = (s: Stage) => /spain/i.test(s.Cnm || '') && /^la\s?liga/i.test((s.Snm || '').trim()) && !/laliga\s*2|hypermotion/i.test(s.Snm || '');
const isBundesliga = (s: Stage) => /germany/i.test(s.Cnm || '') && /^bundesliga(?!\s*2|\s*[23])/i.test((s.Snm || '').trim());
const isSerieA     = (s: Stage) => /italy/i.test(s.Cnm || '') && /^serie a/i.test((s.Snm || '').trim());
const isLigue1     = (s: Stage) => /france/i.test(s.Cnm || '') && /^ligue 1/i.test((s.Snm || '').trim());
const isWorldCup   = (s: Stage) => {
  const combined = `${s.Cnm || ''} ${s.Snm || ''}`;
  return /(world cup|fifa world cup|wc qualif|world cup qualif)/i.test(combined) && !/women|u17|u19|u21/i.test(combined);
};
const isEuro       = (s: Stage) => {
  const combined = `${s.Cnm || ''} ${s.Snm || ''}`;
  return /(european championship|euro 20\d{2}|euro qualif|uefa euro)/i.test(combined) && !/women|u17|u19|u21/i.test(combined);
};
const isNations    = (s: Stage) => {
  const combined = `${s.Cnm || ''} ${s.Snm || ''}`;
  return /(uefa nations|nations league)/i.test(combined) && !/women|u17|u19|u21/i.test(combined);
};
const isFriendly   = (s: Stage) => {
  const combined = `${s.Cnm || ''} ${s.Snm || ''}`;
  return /(friendly|hazırlık|international friendly|club friendly)/i.test(combined) && !/women|u17|u19|u21/i.test(combined);
};
const isMilli      = (s: Stage) => {
  // National team matches — includes World Cup, Euro, Nations League, Friendly
  return isWorldCup(s) || isEuro(s) || isNations(s) || isFriendly(s);
};
const isUCL2       = (s: Stage) => /champions league/i.test(`${s.Cnm || ''} ${s.Snm || ''}`) && !/youth|women/i.test(`${s.Cnm || ''} ${s.Snm || ''}`);
const isUEL2       = (s: Stage) => /europa league/i.test(`${s.Cnm || ''} ${s.Snm || ''}`) && !/conference|women/i.test(`${s.Cnm || ''} ${s.Snm || ''}`);
const isUECL2      = (s: Stage) => /conference league/i.test(`${s.Cnm || ''} ${s.Snm || ''}`) && !/women/i.test(`${s.Cnm || ''} ${s.Snm || ''}`);

// Büyük Türk kulüpleri — UEFA elemelerinde bunlar oynarsa maç KALIR, ufak kulüpler ELENİR.
const BIG_CLUB_RE = /(galatasaray|fenerbah[cç]e|be[sş]ikta[sş]|trabzonspor)/i;
// UEFA KULÜP kupalarının ELEME/ön eleme turları (KuPS, TNS, Riga gibi ufak kulüpler buradan geliyordu)
const isUefaClubQualifier = (s: Stage) => {
  const c = `${s.Cnm || ''} ${s.Snm || ''}`;
  return (isUCL2(s) || isUEL2(s) || isUECL2(s)) &&
    /(qualif|preliminary|prelim|1st round|2nd round|3rd round|play[\s-]?off)/i.test(c);
};

const ALL_MAJOR = (s: Stage) =>
  isTRSuperLig(s) || isTRCup(s) || isUCL(s) || isUEL(s) || isUECL(s) ||
  isUCL2(s) || isUEL2(s) || isUECL2(s) ||
  isPremier(s) || isLaLiga(s) || isBundesliga(s) || isSerieA(s) || isLigue1(s) ||
  isWorldCup(s) || isEuro(s) || isNations(s) || isFriendly(s);

const FILTERS = [
  { id: 'all',    label: TR.ALL,            test: ALL_MAJOR },
  { id: 'tr',     label: 'SÜPER LİG',       test: isTRSuperLig },
  { id: 'milli',  label: 'MİLLİ MAÇ',       test: isMilli },
  { id: 'wc',     label: 'DÜNYA KUPASI',    test: isWorldCup },
  { id: 'euro',   label: 'AVRUPA ŞAMP.',    test: isEuro },
  { id: 'fr',     label: 'HAZIRLIK',        test: isFriendly },
  { id: 'ucl',    label: 'ŞAMPİYONLAR LİGİ', test: isUCL },
  { id: 'uel',    label: 'AVRUPA LİGİ',     test: isUEL },
  { id: 'uecl',   label: 'KONFERANS LİGİ',  test: isUECL },
  { id: 'pl',     label: 'PREMİER LİG',     test: isPremier },
  { id: 'laliga', label: 'LA LİGA',         test: isLaLiga },
  { id: 'bun',    label: 'BUNDESLIGA',      test: isBundesliga },
  { id: 'seriea', label: 'SERİE A',         test: isSerieA },
  { id: 'l1',     label: 'LIGUE 1',         test: isLigue1 },
];

const epsToLabel = (e: Event) => {
  const eps = (e.Eps || '').toString();
  if (eps === '1H') return { txt: TR.FIRST_HALF, live: true, finished: false, notStarted: false };
  if (eps === '2H') return { txt: TR.SECOND_HALF, live: true, finished: false, notStarted: false };
  if (eps === 'HT') return { txt: TR.HALF_TIME, live: true, finished: false, notStarted: false };
  if (eps === 'ET') return { txt: TR.EXTRA_TIME, live: true, finished: false, notStarted: false };
  if (eps === 'PEN') return { txt: TR.PENALTIES, live: true, finished: false, notStarted: false };
  if (['FT', 'AET', 'AP', 'Pen.'].includes(eps)) return { txt: TR.MATCH_ENDED, live: false, finished: true, notStarted: false };
  if (eps === 'NS' || eps === 'Not Started') {
    // ESD = UTC YYYYMMDDhhmm — TR saatine (+3) çevir
    const esd = String(e.Esd || '');
    if (esd.length >= 12) {
      const h = parseInt(esd.slice(8, 10), 10);
      const m = esd.slice(10, 12);
      if (!isNaN(h)) {
        const hi = (h + 3) % 24;
        return { txt: `${String(hi).padStart(2, '0')}:${m}`, live: false, finished: false, notStarted: true };
      }
    }
    return { txt: TR.NOT_STARTED, live: false, finished: false, notStarted: true };
  }
  // Dakika formatı ("40'", "90+3'") → canlı maç
  if (/^\d+(\+\d+)?'?$/.test(eps)) return { txt: eps.endsWith("'") ? eps : `${eps}'`, live: true, finished: false, notStarted: false };
  // İngilizce durum kodları → Türkçe
  const EN_STATUS: Record<string, string> = {
    'POSTP': 'ERTELENDİ', 'POSTP.': 'ERTELENDİ', 'POSTPONED': 'ERTELENDİ',
    'CANC': 'İPTAL', 'CANC.': 'İPTAL', 'CANCELLED': 'İPTAL', 'CANCELED': 'İPTAL',
    'AW': 'HÜKMEN', 'AWARDED': 'HÜKMEN',
    'SUSP': 'ASKIDA', 'SUSP.': 'ASKIDA', 'SUSPENDED': 'ASKIDA',
    'INT': 'DURDURULDU', 'INT.': 'DURDURULDU', 'INTERRUPTED': 'DURDURULDU',
    'ABAND': 'YARIDA KALDI', 'ABAND.': 'YARIDA KALDI', 'ABANDONED': 'YARIDA KALDI',
    'DELAYED': 'GECİKMELİ', 'DEL.': 'GECİKMELİ',
    'TBA': 'BELİRLENECEK', 'TBD': 'BELİRLENECEK',
    'BREAK': 'ARA', 'BREAK TIME': 'ARA',
  };
  const tr = EN_STATUS[eps.toUpperCase()];
  if (tr) return { txt: tr, live: false, finished: false, notStarted: false };
  return { txt: eps || '—', live: false, finished: false, notStarted: false };
};

export default function MatchCenter({ initialStages }: { initialStages: Stage[] }) {
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  // P1 #24: pagination — başlangıçta 24, "Daha fazla göster" ile artar
  const [visibleCount, setVisibleCount] = useState(24);
  // Filter değişince visibleCount sıfırla — kullanıcı farklı lige geçtiğinde başa dön
  useEffect(() => { setVisibleCount(24); }, [filter]);
  const stagesRef = useRef<Stage[]>(initialStages);

  // Mount-once polling — stages değişimi effect'i tetiklemez. Canlı maç varsa 30s, yoksa 60s.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (!alive) return;
      try {
        setLoading(true);
        const d = await getClient<{ Stages?: Stage[] }>('/api/livescore/today');
        if (!alive) return;
        if (d?.Stages) {
          stagesRef.current = d.Stages;
          setStages(d.Stages);
        }
      } finally {
        if (alive) {
          setLoading(false);
          const anyLive = stagesRef.current.some((s) => (s.Events || []).some((e) => ['1H', '2H', 'HT', 'ET', 'PEN'].includes(e.Eps || '')));
          timer = setTimeout(tick, anyLive ? 30_000 : 60_000);
        }
      }
    };
    // İlk fetch hemen (initialStages boş gelirse skoreboard hızlı dolar)
    // P3 #91: 3 component aynı endpoint'i 500ms'de çekiyordu → IP-ban riski.
    // Stagger: Scoreboard 500ms, MatchCenter 900ms (farklı endpoint zaten), MatchBanner anlık.
    const firstDelay = initialStages.length === 0 ? 900 : 30_000;
    timer = setTimeout(tick, firstDelay);
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, []);

  const cleaned = useMemo(() => stages.filter(ALL_MAJOR), [stages]);
  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter) || FILTERS[0];
    if (filter === 'all') {
      const order = [isTRSuperLig, isWorldCup, isEuro, isNations, isFriendly, isUCL, isUEL, isUECL, isTRCup, isPremier, isLaLiga, isBundesliga, isSerieA, isLigue1];
      return [...cleaned].sort((a, b) => {
        const ai = order.findIndex((t) => t(a));
        const bi = order.findIndex((t) => t(b));
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      });
    }
    return cleaned.filter(f.test);
  }, [cleaned, filter]);

  const flatMatches = useMemo(() => {
    const out: { home: string; away: string; league: string; status: string; live: boolean; finished: boolean; notStarted: boolean; score1: number; score2: number; pen1?: number | null; pen2?: number | null; slug: string }[] = [];
    // Preserve Turkish/unicode letters in slug (only collapse whitespace and special punctuation to _)
    const cleanName = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
    // Smart league label: "Group A/B/C/D" gibi grup adlarını ana turnuvaya çevir
    const smartLeague = (s: Stage): string => {
      const snm = (s.Snm || '').trim();
      const cnm = (s.Cnm || '').trim();
      const combined = `${cnm} ${snm}`;
      // Grup adı (Group A, Grup B, Hazırlık Grubu...) → ana turnuvaya çevir
      const isGroup = /^(group|grup|gr\.?)\s*[a-z]\d*$/i.test(snm) || /^(group|grup)\s*[a-z]/i.test(snm);
      if (isGroup) {
        if (/world cup|wc|dünya/i.test(combined)) return 'DÜNYA KUPASI';
        if (/euro|european championship/i.test(combined)) return 'AVRUPA ŞAMP.';
        if (/champions league/i.test(combined)) return 'ŞAMPİYONLAR LİGİ';
        if (/europa league/i.test(combined)) return 'AVRUPA LİGİ';
        if (/conference league/i.test(combined)) return 'KONFERANS LİGİ';
        if (/nations league/i.test(combined)) return 'ULUSLAR LİGİ';
        if (/africa|afcon/i.test(combined)) return 'AFRİKA KUPASI';
        if (/asia|afc/i.test(combined)) return 'ASYA KUPASI';
        if (/copa america/i.test(combined)) return 'COPA AMERİKA';
        // Genel fallback: ülke + "GRUP"
        if (cnm) return cnm.toUpperCase();
      }
      // "International" + boş → HAZIRLIK
      if (/international/i.test(cnm) && (/friendly|club friendly|exhibition/i.test(snm) || !snm)) return 'HAZIRLIK';
      // "Club Friendly" → HAZIRLIK
      if (/friendly/i.test(snm)) return 'HAZIRLIK';
      // Standart liga adı
      return snm || cnm || 'FUTBOL';
    };
    visible.forEach((s) => {
      const qualifierStage = isUefaClubQualifier(s);
      (s.Events || []).forEach((e) => {
        const t1 = e.T1?.[0]?.Nm || '—';
        const t2 = e.T2?.[0]?.Nm || '—';
        // Çöp filtresi: UEFA kulüp elemesi ise SADECE büyük Türk kulübü olan maçları göster
        if (qualifierStage && !(BIG_CLUB_RE.test(t1) || BIG_CLUB_RE.test(t2))) return;
        const ep = epsToLabel(e);
        const esd = String(e.Esd || '');
        const date = esd.length >= 8 ? esd.slice(0, 8) : '';
        const slug = `${cleanName(t1)}__${cleanName(t2)}${date ? '__' + date : ''}`;
        out.push({
          home: t1, away: t2,
          league: smartLeague(s),
          status: ep.txt, live: ep.live, finished: ep.finished, notStarted: ep.notStarted,
          score1: ep.notStarted ? -1 : (e.Tr1 ?? 0),
          score2: ep.notStarted ? -1 : (e.Tr2 ?? 0),
          pen1: e.Trp1 ?? null, pen2: e.Trp2 ?? null,
          slug,
        });
      });
    });
    return out;
  }, [visible]);

  // Kullanıcının seçtiği filtre için bağlama özel mesaj
  const emptyMessage = filter === 'all' ? TR.NO_MATCHES_TODAY : TR.NO_MATCHES_FILTER;

  return (
    <div className="match-center" data-testid="match-center">
      <div className="match-center-title">
        {TR.MATCH_CENTER}
        {loading && <span style={{ marginLeft: 10, fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2 }}>↻</span>}
      </div>
      <div className="league-filter" data-testid="league-filter">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`league-filter-btn ${filter === f.id ? 'active' : ''}`}
            data-testid={`filter-${f.id}`}
          >{f.label}</button>
        ))}
      </div>
      <div className="matches-grid" data-testid="matches-grid">
        {flatMatches.length === 0 ? (
          <div style={{
            textAlign: 'center', color: 'var(--text-dim)', padding: '40px 20px',
            gridColumn: '1/-1', fontFamily: 'VT323, monospace', fontSize: 18, letterSpacing: 1,
          }} data-testid="matches-empty">
            <div style={{ fontSize: 32, marginBottom: 8 }} aria-hidden>⚽</div>
            {emptyMessage}
          </div>
        ) : flatMatches.slice(0, visibleCount).map((m, i) => (
          <Link
            key={`${m.home}-${m.away}-${i}`}
            href={`/match/${m.slug}`}
            className="match-card"
            data-testid={`match-row-${i}`}
            style={{ cursor: 'pointer', position: 'relative', display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div
              data-testid={`match-detail-link-${i}`}
              style={{
                position: 'absolute', top: 6, right: 8,
                fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1,
                padding: '2px 6px',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4,
                fontFamily: 'Orbitron, sans-serif',
              }}
              title="Maç detayı"
            >
              ↗ DETAY
            </div>
            <div className="match-card-league">{m.league.toUpperCase()}</div>
            <div className="match-card-teams">
              <div className="match-card-team">{m.home}</div>
              <div className="match-card-score">
                {m.notStarted ? <span style={{ color: 'var(--text-dim)' }}>vs</span> : `${m.score1} – ${m.score2}`}
              </div>
              <div className="match-card-team">{m.away}</div>
            </div>
            {(m.pen1 !== null && m.pen1 !== undefined) && (
              <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--orange, #ffa600)', marginTop: 4, letterSpacing: 1 }}>
                PEN {m.pen1}-{m.pen2}
              </div>
            )}
            <div className={`match-card-status ${m.live ? 'live' : m.finished ? 'finished' : ''}`}>
              {m.live && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', marginRight: 6, verticalAlign: 'middle' }} />}
              {m.status}
            </div>
          </Link>
        ))}
      </div>
      {/* P1 #24: "Daha fazla göster" — 24'ten fazla maç olduğunda görünür */}
      {flatMatches.length > visibleCount && (
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + 24)}
            data-testid="matches-show-more"
            style={{
              background: 'linear-gradient(135deg, rgba(0,240,255,0.18), rgba(0,160,255,0.18))',
              border: '1.5px solid var(--cyan, #00f0ff)',
              color: 'var(--cyan, #00f0ff)',
              padding: '10px 28px',
              fontFamily: 'Orbitron, sans-serif',
              fontSize: 11,
              letterSpacing: 2,
              cursor: 'pointer',
              borderRadius: 4,
              boxShadow: '0 0 12px rgba(0,240,255,0.35)',
              textShadow: '0 0 6px rgba(0,240,255,0.6)',
            }}
          >
            DAHA FAZLA GÖSTER ({flatMatches.length - visibleCount} maç)
          </button>
        </div>
      )}
    </div>
  );
}
