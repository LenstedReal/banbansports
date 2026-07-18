'use client';
/* Sponsors + footer — uses original .sponsors-grid, .sponsor-item.sp-* classes */
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    bbSwitchServer?: (idx: number) => void;
    bbServerIndex?: number;
    bbServerCount?: number;
  }
}

const SPONSORS = [
  { id: 'redbull',    href: 'https://www.redbull.com/tr-tr/',                klass: 'sp-redbull',     img: '/logos/redbull_ref.png?v=20260620c',         alt: 'Red Bull' },
  { id: 'samsung',    href: 'https://v3.account.samsung.com/dashboard/intro', klass: 'sp-samsung',     img: '/logos/samsung_galaxy.png?v=20260620c',     alt: 'Samsung Galaxy' },
  { id: 'meritking',  href: 'https://www.mrtkng22xclusive.vip/',                   klass: 'sp-meritking',   img: '/logos/meritking.png?v=20260620c',          alt: 'MeritKing' },
  { id: 'adidas',     href: 'https://www.adidas.com.tr/',                    klass: 'sp-adidas',      img: '/logos/adidas_ref.png?v=20260620c',         alt: 'adidas' },
  { id: 'heineken',   href: 'https://www.heineken.com/tr/',                  klass: 'sp-heineken',    img: '/logos/heineken_ref.png?v=20260620c',       alt: 'Heineken' },
  { id: 'vodafone',   href: 'https://www.vodafone.com.tr/freezone',          klass: 'sp-vodafone',    img: '/logos/vodafone_fz.png?v=20260620c',        alt: 'Vodafone FreeZone' },
  { id: 'papara',     href: 'https://www.papara.com/personal/auth/login/email-phone',                       klass: 'sp-papara',      img: '/logos/papara.png?v=20260620c',             alt: 'Papara' },
  { id: 'nesine',     href: 'https://www.nesine.com/',                       klass: 'sp-nesine',      img: '/logos/nesine.png?v=20260620c',             alt: 'Nesine' },
  { id: 'mastercard', href: 'https://www.masterpassturkiye.com/login',                klass: 'sp-mastercard',  img: '/logos/mastercard_transparent.png?v=20260620c', alt: 'Mastercard' },
  { id: 'togg',       href: 'https://www.togg.com.tr/',                      klass: 'sp-togg',        img: '/logos/togg.png?v=20260620c',               alt: 'Togg' },
  { id: 'turkcell',   href: 'https://fastlogin.com.tr/fastlogin_web_app/webLogin',                  klass: 'sp-turkcell',    img: '/logos/turkcell.png?v=20260620c',           alt: 'Turkcell' },
  { id: 'sixt',       href: 'https://www.sixt.com.tr/',                      klass: 'sp-sixt',        img: '/logos/sixt.png?v=20260620c',               alt: 'SIXT' },
  { id: 'socar',      href: 'https://www.socar.com.tr/',                     klass: 'sp-socar',       img: '/logos/socar.png?v=20260620c',              alt: 'SOCAR' },
  { id: 'thy',        href: 'https://www.turkishairlines.com/',              klass: 'sp-thy',         img: '/logos/turkishairlines.png?v=20260620c',    alt: 'Türk Hava Yolları' },
  { id: 'garanti',    href: 'https://www.garantibbva.com.tr/',               klass: 'sp-garanti',     img: '/logos/garantibbva.png?v=20260620c',        alt: 'Garanti BBVA' },
  { id: 'avis',       href: 'https://www.avis.com.tr/',                      klass: 'sp-avis',        img: '/logos/avis.png?v=20260620c',               alt: 'AVIS' },
  { id: 'terra',      href: 'https://www.terrapizza.com/',                   klass: 'sp-terra',       img: '/logos/terrapizza.png?v=20260620c',         alt: 'Terra Pizza' },
  { id: 'hdi',        href: 'https://www.hdisigorta.com.tr/',                klass: 'sp-hdi',         img: '/logos/hdisigorta.png?v=20260620c',         alt: 'HDI Sigorta' },
  { id: 'trendyol',   href: 'https://www.trendyol.com/',                     klass: 'sp-trendyol',    img: '/logos/trendyol.png?v=20260620c',           alt: 'Trendyol' },
  { id: 'getir',      href: 'https://www.getirfinans.com/',                            klass: 'sp-getir',       img: '/logos/getir.png?v=20260620c',              alt: 'Getir' },
  { id: 'hepsiburada',href: 'https://www.hepsiburada.com/',                  klass: 'sp-hepsiburada', img: '/logos/hepsiburada.png?v=20260620c',        alt: 'Hepsiburada' },
  { id: 'digiturk',   href: 'https://www.todtv.com.tr/kullanici/kayit#',                  klass: 'sp-digiturk',    img: '/logos/digiturk.png?v=20260620c',           alt: 'DigiTürk' },
  { id: 'migros-hemen',href:'https://www.migros.com.tr/hemen',               klass: 'sp-migros',      img: '/logos/migros_hemen.png?v=20260620c',       alt: 'Migros Hemen' },
  { id: 'turknet',    href: 'https://www.turk.net/online-islemler/login',                         klass: 'sp-turknet',     img: '/logos/turknet.png?v=20260620c',             alt: 'TurkNet' },
];

export default function SponsorsFooter() {
  const [activeServer, setActiveServer] = useState(0);
  const [serverCount, setServerCount] = useState(1);
  useEffect(() => {
    // P2 #45 fix: setInterval(700ms) → event-based polling. CPU/battery tasarrufu.
    const tick = () => {
      setActiveServer(window.bbServerIndex ?? 0);
      setServerCount(window.bbServerCount ?? 1);
    };
    tick();
    // Custom event ile VideoPlayer'dan değişimi dinle (önerilen modern yöntem)
    const onChange = () => tick();
    window.addEventListener('bb:server-changed', onChange);
    // Fallback: yine de 3sn'de bir tick et (event dispatch'i unutulmuşsa)
    const id = setInterval(tick, 3000);
    return () => {
      window.removeEventListener('bb:server-changed', onChange);
      clearInterval(id);
    };
  }, []);
  const handleServerClick = (i: number) => {
    if (i >= serverCount) return;
    if (typeof window.bbSwitchServer === 'function') {
      window.bbSwitchServer(i);
    }
  };
  return (
    <footer className="footer" data-testid="footer">
      <div className="brand-tagline" data-testid="brand-tagline">KALİTENİN ZİRVESİNDEYİZ</div>
      <div className="sponsors-section">
        <div className="sponsors-title">Bu platform aşağıdaki şirketlerin destekleriyle kurulmuştur</div>
        <div className="sponsors-grid" data-testid="sponsors-grid">
          {SPONSORS.map(s => (
            <a key={s.id}
               className={`sponsor-item ${s.klass}`}
               href={s.href} target="_blank" rel="noopener noreferrer"
               aria-label={s.alt}
               data-testid={`sponsor-${s.id}`}>
              <img loading="lazy" decoding="async" src={s.img} alt={s.alt}/>
            </a>
          ))}
        </div>
      </div>
      <div className="sponsor">by <span className="sponsor-name">lenstedreal</span> ❤️‍🩹</div>
      <div className="footer-social">
        <a href="https://www.instagram.com/lenstedreal/" target="_blank" rel="noopener noreferrer" className="footer-ig" data-testid="ig-link">
          <svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.5.4 1.1.4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.5.2-1.1.4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.5-.4-1.1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.5-.2 1.1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2M12 0C8.7 0 8.3 0 7.1.1 5.8.1 4.9.3 4.2.6c-.8.3-1.5.7-2.1 1.4C1.4 2.6.9 3.3.6 4.2.3 4.9.1 5.8.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.1 1.3.2 2.2.5 2.9.3.8.8 1.5 1.4 2.1.6.6 1.3 1.1 2.1 1.4.8.3 1.6.5 2.9.5 1.3.1 1.7.1 4.9.1s3.7 0 4.9-.1c1.3-.1 2.2-.2 2.9-.5.8-.3 1.5-.8 2.1-1.4.6-.6 1.1-1.3 1.4-2.1.3-.8.5-1.6.5-2.9.1-1.3.1-1.7.1-4.9s0-3.7-.1-4.9c-.1-1.3-.2-2.2-.5-2.9-.3-.8-.8-1.5-1.4-2.1C21.4 1.4 20.7.9 19.8.6 19.1.3 18.2.1 16.9.1 15.7 0 15.3 0 12 0zm0 5.8C8.6 5.8 5.8 8.6 5.8 12s2.8 6.2 6.2 6.2 6.2-2.8 6.2-6.2S15.4 5.8 12 5.8zm0 10.2c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm6.4-11.8c-.8 0-1.4.6-1.4 1.4s.6 1.4 1.4 1.4 1.4-.6 1.4-1.4c.1-.8-.6-1.4-1.4-1.4z"/></svg>
          <span>@lenstedreal</span>
        </a>
      </div>
      <div className="footer-copyright" data-testid="footer-copyright">® 2026 banbansports UNDERGROUND HD · TÜM HAKLARI SAKLIDIR</div>

      {/* Telegram destek / iletişim hattı */}
      <a
        href="https://t.me/swearty8_bot"
        target="_blank"
        rel="noopener noreferrer"
        className="footer-telegram"
        data-testid="telegram-support"
        aria-label="Telegram Destek"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="currentColor" d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.14-3.05-1.99 1.93c-.22.22-.4.4-.83.4z"/>
        </svg>
        <span>Sorun / Destek için Telegram'dan bize yazın</span>
      </a>

      <div className="footer-infra neon-note" data-testid="footer-infra">
        <p>Bu sitenin altyapısı <strong>lenstedreal Stremradar</strong> tarafından yapılmıştır.</p>
        <p>Bir sonraki alan adımız bir artacaktır; erişim engellendiğinde yeni adresten devam edilir.</p>
        <p>En iyi izleme deneyimi için <strong>Opera</strong> tarayıcısı kullanmanız önerilir.</p>
      </div>

      <div className="server-selector" style={{marginTop:20}} data-testid="server-selector">
        <div className="server-title">SUNUCULAR</div>
        <div className="server-grid">
          {[
            { i:0, name:'Sunucu 1 (TR)' },
            { i:1, name:'Sunucu 2 (Yedek)' },
            { i:2, name:'Sunucu 3 (EU)' },
            { i:3, name:'Sunucu 4' },
            { i:4, name:'Sunucu 5' },
            { i:5, name:'Sunucu 6' },
          ].map(s => {
            const usable = s.i < serverCount;
            const isActive = usable && s.i === activeServer;
            return (
              <div
                key={s.i}
                className={`server-item ${isActive ? 'active' : ''}`}
                data-testid={`server-${s.i}`}
                onClick={() => handleServerClick(s.i)}
                style={{
                  cursor: usable ? 'pointer' : 'not-allowed',
                  opacity: usable ? 1 : 0.4,
                }}
              >
                <span>{s.name}</span>
                <span className={`server-status ${usable ? 'online' : ''}`}></span>
              </div>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
