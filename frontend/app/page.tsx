'use client';

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import Header from '@/components/Header';
import MatchBanner from '@/components/MatchBanner';
import MatchCenter from '@/components/MatchCenter';
import VideoPlayer from '@/components/VideoPlayer';
import SponsorBanner from '@/components/SponsorBanner';
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

        <SponsorBanner />

        {/* Akan bilgi şeridi — alan adı duyurusu (etiket ikonu, yazı yok) */}
        <div className="access-notice" data-testid="access-notice">
          <div className="access-ticker">
            <span className="access-ticker-label" aria-label="Duyuru">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 10v4a1 1 0 0 0 1 1h2l3.5 3.5A1 1 0 0 0 11.2 18V6a1 1 0 0 0-1.7-.7L6 9H4a1 1 0 0 0-1 1zm12.5 2a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 15.5 12zM13 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            </span>
            <div className="access-marquee-wrap">
              <div className="access-marquee neon-note">
                <span>👉 Bir sonraki alan adımız bir artacaktır; erişim engellendiğinde yeni adresten devam edilir.&nbsp;&nbsp;&nbsp;&nbsp;</span>
                <span aria-hidden="true">👉 Bir sonraki alan adımız bir artacaktır; erişim engellendiğinde yeni adresten devam edilir.&nbsp;&nbsp;&nbsp;&nbsp;</span>
              </div>
            </div>
          </div>
        </div>

        <Sponsors />

        {!initialFetchDone && (
          <div data-testid="initial-loading" style={{ display: 'none' }}>loading</div>
        )}
      </div>
    </AuthProvider>
  );
}
