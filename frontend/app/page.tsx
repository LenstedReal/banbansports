'use client';

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import Header from '@/components/Header';
import MatchBanner from '@/components/MatchBanner';
import MatchCenter from '@/components/MatchCenter';
import VideoPlayer from '@/components/VideoPlayer';
import SponsorBanner from '@/components/SponsorBanner';
import ModelShowcase from '@/components/ModelShowcase';
import Sponsors from '@/components/Sponsors';
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

      <div className="app-container">
        <div className="scanlines" />
        <NotificationCenter />
        <FpsCounter />
        <Header />

        {/* Carousel tarzı tek scoreboard — en büyük maçlar */}
        <MatchBanner initialMatches={topScores.matches} />

        {/* Maç merkezi — tüm günün maçları */}
        <MatchCenter initialStages={todayMatches.Stages} />

        <VideoPlayer />

        {/* Erişim notu — profesyonel DUYURU ticker'ı (sponsordan boşalan alana taşındı) */}
        <div className="access-notice" data-testid="access-notice">
          <div className="access-ticker">
            <span className="access-ticker-label">
              <span className="access-ticker-dot" aria-hidden="true" />
              DUYURU
            </span>
            <div className="access-marquee-wrap">
              <div className="access-marquee neon-note">
                <span>👉 Bir sonraki alan adımız bir artacaktır; erişim engellendiğinde yeni adresten devam edilir.&nbsp;&nbsp;&nbsp;&nbsp;</span>
                <span aria-hidden="true">👉 Bir sonraki alan adımız bir artacaktır; erişim engellendiğinde yeni adresten devam edilir.&nbsp;&nbsp;&nbsp;&nbsp;</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sponsor + model yan yana */}
        <div className="sponsor-girl-row" data-testid="sponsor-girl-row">
          <SponsorBanner />
          <ModelShowcase />
        </div>

        <Sponsors />

        {!initialFetchDone && (
          <div data-testid="initial-loading" style={{ display: 'none' }}>loading</div>
        )}
      </div>
    </AuthProvider>
  );
}
