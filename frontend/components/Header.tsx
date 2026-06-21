'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

export default function Header() {
  const { user } = useAuth();
  const [notifOn, setNotifOn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Notification !== 'undefined') setNotifOn(Notification.permission === 'granted');
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const toggleNotif = async () => {
    if (typeof Notification === 'undefined') return showToast('Bu tarayıcı bildirim desteklemiyor.');
    if (Notification.permission === 'granted') {
      // Zaten verilmiş — sadece UI state'i toggle et (kullanıcı görsel olarak "kapattım" zannetsin)
      setNotifOn((v) => !v);
      return;
    }
    if (Notification.permission === 'denied') {
      return showToast('Bildirim izni reddedilmiş. Tarayıcı ayarlarından "site izinleri" üzerinden açabilirsiniz.');
    }
    const p = await Notification.requestPermission();
    setNotifOn(p === 'granted');
    if (p === 'granted') {
      try { new Notification('banbansports', { body: 'Bildirimler açık — yaklaşan maçlar ve canlı skor güncellemeleri push olarak gelecek.', icon: '/icons/info.png' }); } catch { /* noop */ }
    } else if (p === 'denied') {
      showToast('Bildirim reddedildi. İzin vermek için tarayıcı çubuğundaki kilit ikonuna tıklayın.');
    }
  };

  return (
    <header className="header" data-testid="header">
      <div className="header-content">
        <div className="logo-section">
          <div className="logo-wrapper">
            <Link href="/" style={{ textDecoration: 'none' }}>
              <div className="logo glitch" data-text="banbansports" data-testid="logo">banbansports</div>
              <div className="logo-sub">UNDERGROUND HD</div>
            </Link>
          </div>
          <div className="live-badge" data-testid="status-badge">
            <span className="live-dot"></span>
            <span>CANLI</span>
          </div>
        </div>
        <div className="header-right">
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              data-testid="admin-link"
              style={{
                padding: '8px 14px', borderRadius: 6,
                border: '1px solid var(--orange, #ffa600)',
                color: 'var(--orange, #ffa600)',
                fontFamily: 'Orbitron, sans-serif', fontSize: 11, letterSpacing: 2,
                textDecoration: 'none', textShadow: '0 0 8px rgba(255,166,0,0.5)',
              }}
            >
              ADMIN
            </Link>
          )}
          <button
            type="button"
            className="notif-toggle"
            onClick={toggleNotif}
            data-testid="notif-toggle"
            title="Maç bildirimleri"
            data-active={notifOn ? 'on' : 'off'}
          >
            <svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
            <span>BİLDİRİM</span>
            <span className="notif-status">{notifOn ? 'AÇIK' : 'KAPALI'}</span>
          </button>
        </div>
      </div>
      {/* Toast — alert() yerine modern UI (P2 #48 fix) */}
      {toast && (
        <div
          data-testid="header-toast"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 80,
            right: 20,
            zIndex: 9999,
            maxWidth: 360,
            padding: '12px 18px',
            background: 'linear-gradient(135deg, rgba(20,12,28,0.96), rgba(8,4,16,0.96))',
            border: '1px solid var(--cyan, #00f0ff)',
            borderRadius: 8,
            color: 'var(--cyan, #00f0ff)',
            fontFamily: 'VT323, monospace',
            fontSize: 14,
            lineHeight: 1.4,
            letterSpacing: 0.5,
            boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 16px rgba(0,240,255,0.35)',
            animation: 'bb-toast-in 0.25s ease-out',
          }}
        >
          {toast}
        </div>
      )}
    </header>
  );
}
