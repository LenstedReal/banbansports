'use client';

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import Header from '@/components/Header';
import MatchBanner from '@/components/MatchBanner';
import MatchCenter from '@/components/MatchCenter';
import FeaturedBroadcast from '@/components/FeaturedBroadcast';
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

        {/* Öne çıkan yayın — sayfa üstünde rafine hero banner (canlıysa ilgili kanal da yeşile döner) */}
        <FeaturedBroadcast />

        {/* Carousel tarzı tek scoreboard — en büyük maçlar */}
        <MatchBanner initialMatches={topScores.matches} />

        {/* Maç merkezi — tüm günün maçları */}
        <MatchCenter initialStages={todayMatches.Stages} />

        <VideoPlayer />
        <SponsorBanner />
        <Sponsors />

        {!initialFetchDone && (
          <div data-testid="initial-loading" style={{ display: 'none' }}>loading</div>
        )}
      </div>
    </AuthProvider>
  );
}
