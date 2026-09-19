'use client';

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import Header from '@/components/Header';
import MatchBanner from '@/components/MatchBanner';
import MatchCenter from '@/components/MatchCenter';
import VideoPlayer from '@/components/VideoPlayer';
import ChannelRail from '@/components/ChannelRail';
import ServerPanel from '@/components/ServerPanel';
import DailyMatchStrip from '@/components/DailyMatchStrip';
import CinemaSection from '@/components/CinemaSection';
import SponsorBanner from '@/components/SponsorBanner';
import OkeyBanner from '@/components/OkeyBanner';
import Sponsors, { LegalPanel } from '@/components/Sponsors';
import NotificationCenter from '@/components/NotificationCenter';
import SwRegister from '@/components/SwRegister';
import PushPrompt from '@/components/PushPrompt';
import FpsCounter from '@/components/FpsCounter';
import type { Match } from '@/lib/api';

type TopScores = { matches: Match[] };
type TodayMatches = { Stages: any[] };

export default function HomePage() {
  const [topScores, setTopScores] = useState<TopScores>({ matches: [] });
  const [todayMatches, setTodayMatches] = useState<TodayMatches>({ Stages: [] });
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // İlk yükleme — sadece bir kez. Component'ler kendi refresh döngülerini yönetiyor.
  useEffect(() => {
    let alive = true;
    const loadInitial = async () => {
      try {
        const [scoresRes, matchesRes] = await Promise.all([
          fetch('/api/scores/top?n=5', { cache: 'no-store' }).catch(() => null),
          fetch('/api/livescore/today', { cache: 'no-store' }).catch(() => null),
        ]);

        if (!alive) return;

        if (scoresRes && scoresRes.ok) {
          const scoresData = await scoresRes.json();
          setTopScores({ matches: scoresData?.matches || [] });
        }
        if (matchesRes && matchesRes.ok) {
          const matchesData = await matchesRes.json();
          setTodayMatches({ Stages: matchesData?.Stages || [] });
        }
      } catch (err) {
        console.warn('İlk veri çekiminde hata:', err);
      } finally {
        if (alive) setInitialFetchDone(true);
      }
    };
    loadInitial();
    return () => { alive = false; };
  }, []);

  return (
    <AuthProvider>
      <SwRegister />
      <PushPrompt />

      <div className="bb-shell" data-testid="app-shell">
        <div className="scanlines" />
        <NotificationCenter />
        <FpsCounter />
        <Header />

        <div className="bb-wrap">
          <div className="bb-grid">
            {/* SOL KOLON — Maç Merkezi + reklam */}
            <aside className="bb-left" id="mac-merkezi" data-testid="left-column">
              <MatchCenter initialStages={todayMatches.Stages} />
              <OkeyBanner />
            </aside>

            {/* ORTA KOLON — Hero skorboard · Günün Maçı · Canlı yayın · Box Office */}
            <main className="bb-center" data-testid="center-column">
              <MatchBanner initialMatches={topScores.matches} />
              <DailyMatchStrip />
              <SponsorBanner />
              <VideoPlayer />
              <CinemaSection />
            </main>

            {/* SAĞ KOLON — Kanallar · Sunucular */}
            <aside className="bb-right" data-testid="right-column">
              <ChannelRail />
              <ServerPanel />
              <LegalPanel />
            </aside>
          </div>

          {/* Alt duyuru kaldırıldı — şerit artık header altında */}
        </div>

        <Sponsors />

        {!initialFetchDone && (
          <div data-testid="initial-loading" style={{ display: 'none' }}>loading</div>
        )}
      </div>
    </AuthProvider>
  );
}
