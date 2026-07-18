'use client';
import { useEffect, useRef, useState } from 'react';

/** FPS counter — uses original .fps-counter class with .good/.warn/.crit.
 *  P2 #46-47 fix: localStorage ile hide state persisted; battery-aware throttle.
 *  Gizliyken bile sağ tıkla menüden açma için window event ekledik.
 */
export default function FpsCounter() {
  const [fps, setFps] = useState(60);
  const [hidden, setHidden] = useState(false);
  const [batteryLow, setBatteryLow] = useState(false);
  const frames = useRef(0);
  const last = useRef<number>(0);
  const raf = useRef<number | null>(null);

  // Mount'ta ilk timing kaydı
  useEffect(() => {
    // Not: Kullanıcı talebi — FPS badge tıklanınca kaybolmasın, o yüzden
    // localStorage'dan `bb_fps_hidden` okumasını da kaldırdık. Eski kalıntı flag
    // temizlensin (bir defalık migration).
    try { localStorage.removeItem('bb_fps_hidden'); } catch { /* noop */ }
    last.current = performance.now();
  }, []);

  // Battery API — düşük batarya tespit (UI render hesabı düşür)
  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof (navigator as any).getBattery !== 'function') return;
    let battery: any = null;
    const check = () => {
      if (!battery) return;
      setBatteryLow(!battery.charging && battery.level <= 0.20);
    };
    (navigator as any).getBattery().then((b: any) => {
      battery = b; check();
      b.addEventListener('levelchange', check);
      b.addEventListener('chargingchange', check);
    }).catch(() => {});
    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', check);
        battery.removeEventListener('chargingchange', check);
      }
    };
  }, []);

  // Global window event ile show/hide toggle (debug için: window.bbToggleFps())
  useEffect(() => {
    (window as any).bbToggleFps = () => {
      setHidden((h) => {
        const next = !h;
        try { localStorage.setItem('bb_fps_hidden', next ? '1' : '0'); } catch { /* noop */ }
        return next;
      });
    };
    return () => { try { delete (window as any).bbToggleFps; } catch { /* noop */ } };
  }, []);

  useEffect(() => {
    if (hidden) return; // gizli → rAF döngüsü çalışmasın, CPU yeme
    let mounted = true;
    const tick = (t: number) => {
      frames.current++;
      const elapsed = t - last.current;
      // Düşük bataryada 2sn sample (daha az re-render)
      const sampleInterval = batteryLow ? 2000 : 1000;
      if (elapsed >= sampleInterval) {
        if (mounted) setFps(Math.round((frames.current * 1000) / elapsed));
        frames.current = 0;
        last.current = t;
      }
      if (mounted) raf.current = requestAnimationFrame(tick);
    };
    last.current = performance.now();
    frames.current = 0;
    raf.current = requestAnimationFrame(tick);
    return () => { mounted = false; if (raf.current) cancelAnimationFrame(raf.current); };
  }, [hidden, batteryLow]);

  const handleClick = () => {
    // Kullanıcı talebi: sağ-üst sayfa FPS göstergesi tıklanınca KAYBOLMASIN.
    // (Debug amaçlı gizlemek isteyen console'dan `bbToggleFps()` çağırabilir.)
  };

  if (hidden) return null;
  const cls = fps >= 55 ? 'good' : fps >= 35 ? 'warn' : 'crit';
  return (
    <div className={`fps-counter ${cls}`}
         onClick={handleClick}
         data-testid="fps-counter"
         title="FPS — canlı performans göstergesi">
      <span>{fps}</span><small>FPS</small>
    </div>
  );
}
