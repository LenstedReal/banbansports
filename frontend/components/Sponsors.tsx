'use client';
/* Sponsors + footer — kompakt panel grid (prototip düzeni). Tüm metin ve linkler AYNEN korunur. */
import { useEffect, useRef, useState } from 'react';

const SPONSORS = [
  { id: 'redbull',    href: 'https://www.redbull.com/tr-tr/',                klass: 'sp-redbull',     img: '/logos/redbull_ref.png?v=20260810w',         alt: 'Red Bull' },
  { id: 'samsung',    href: 'https://v3.account.samsung.com/dashboard/intro', klass: 'sp-samsung',     img: '/logos/samsung_galaxy.png?v=20260810hd',     alt: 'Samsung Galaxy' },
  { id: 'meritking',  href: 'https://www.mrtkng22xclusive.vip/',                   klass: 'sp-meritking',   img: '/logos/meritking.png?v=20260620c',          alt: 'MeritKing' },
  { id: 'heineken',   href: 'https://www.heineken.com/tr/',                  klass: 'sp-heineken',    img: '/logos/heineken_ref.png?v=20260620c',       alt: 'Heineken' },
  { id: 'vodafone',   href: 'https://www.vodafone.com.tr/freezone',          klass: 'sp-vodafone',    img: '/logos/vodafone_freezone.png?v=20260810trans',        alt: 'Vodafone FreeZone' },
  { id: 'papara',     href: 'https://www.papara.com/personal/auth/login/email-phone',                       klass: 'sp-papara',      img: '/logos/papara.png?v=20260620c',             alt: 'Papara' },
  { id: 'powerade',   href: 'https://www.powerade.com/',                     klass: 'sp-powerade',    img: '/logos/powerade.png?v=20260810blue',        alt: 'Powerade' },
  { id: 'nesine',     href: 'https://www.nesine.com/',                       klass: 'sp-nesine',      img: '/logos/nesine.png?v=20260810wm',             alt: 'Nesine' },
  { id: 'mastercard', href: 'https://www.masterpassturkiye.com/login',                klass: 'sp-mastercard',  img: '/logos/mastercard_transparent.png?v=20260620c', alt: 'Mastercard' },
  { id: 'togg',       href: 'https://www.togg.com.tr/',                      klass: 'sp-togg',        img: '/logos/togg.png?v=20260810hd',               alt: 'Togg' },
  { id: 'turkcell',   href: 'https://www.turkcell.com.tr/',                  klass: 'sp-turkcell',    img: '/logos/turkcell.png?v=20260810vec',           alt: 'Turkcell' },
  { id: 'sixt',       href: 'https://www.sixt.com.tr/',                      klass: 'sp-sixt',        img: '/logos/sixt.png?v=20260810w',               alt: 'SIXT' },
  { id: 'socar',      href: 'https://www.socar.com.tr/',                     klass: 'sp-socar',       img: '/logos/socar.png?v=20260810w',              alt: 'SOCAR' },
  { id: 'gspara',     href: 'https://www.gspara.com.tr/',                    klass: 'sp-gspara',      img: '/logos/gspara.png?v=20260810',              alt: 'GSPara' },
  { id: 'qnb',        href: 'https://www.qnb.com.tr/',                       klass: 'sp-qnb',         img: '/logos/qnb.png?v=20260810org',                 alt: 'QNB' },
  { id: 'axess',      href: 'https://www.axess.com.tr/',                     klass: 'sp-axess',       img: '/logos/axess.png?v=20260810t',               alt: 'Axess' },
  { id: 'maximum',    href: 'https://www.maximum.com.tr/',                   klass: 'sp-maximum',     img: '/logos/maximum.png?v=20260810r3',             alt: 'Maximum' },
  { id: 'lidio',      href: 'https://www.lidio.com/',                        klass: 'sp-lidio',       img: '/logos/lidio.png?v=20260810m',               alt: 'Lidio' },
  { id: 'thy',        href: 'https://www.turkishairlines.com/',              klass: 'sp-thy',         img: '/logos/turkishairlines.png?v=20260810w',    alt: 'Türk Hava Yolları' },
  { id: 'garanti',    href: 'https://www.garantibbva.com.tr/',               klass: 'sp-garanti',     img: '/logos/garantibbva.png?v=20260810w',        alt: 'Garanti BBVA' },
  { id: 'avis',       href: 'https://www.avis.com.tr/',                      klass: 'sp-avis',        img: '/logos/avis.png?v=20260810hd',               alt: 'AVIS' },
  { id: 'terra',      href: 'https://www.terrapizza.com.tr/',                   klass: 'sp-terra',       img: '/logos/terrapizza.png?v=20260810svg',         alt: 'Terra Pizza' },
  { id: 'hdi',        href: 'https://www.hdisigorta.com.tr/',                klass: 'sp-hdi',         img: '/logos/hdisigorta.png?v=20260810w',         alt: 'HDI Sigorta' },
  { id: 'trendyol',   href: 'https://www.trendyol.com/',                     klass: 'sp-trendyol',    img: '/logos/trendyol.png?v=20260810o',           alt: 'Trendyol' },
  { id: 'getir',      href: 'https://www.getirfinans.com/',                            klass: 'sp-getir',       img: '/logos/getir.png?v=20260810w',              alt: 'Getir' },
  { id: 'hepsiburada',href: 'https://www.hepsiburada.com/',                  klass: 'sp-hepsiburada', img: '/logos/hepsiburada.png?v=20260620c',        alt: 'Hepsiburada' },
  { id: 'digiturk',   href: 'https://www.todtv.com.tr/kullanici/kayit#',                  klass: 'sp-digiturk',    img: '/logos/digiturk.png?v=20260810big',           alt: 'DigiTürk' },
  { id: 'migros-hemen',href:'https://www.migros.com.tr/hemen',               klass: 'sp-migros',      img: '/logos/migros_hemen.png?v=20260620c',       alt: 'Migros Hemen' },
  { id: 'turknet',    href: 'https://www.turk.net/online-islemler/login',                         klass: 'sp-turknet',     img: '/logos/turknet.png?v=20260620c',             alt: 'TurkNet' },
  { id: '1xbet',      href: 'https://crppd.net/j3pj8',                       klass: 'sp-1xbet',       img: '/logos/1xbet.png?v=20260809',               alt: '1xBet' },
  { id: 'yemeksepeti',href: 'https://www.yemeksepeti.com/',                  klass: 'sp-yemeksepeti', img: '/logos/yemeksepeti.png?v=20260809',         alt: 'Yemeksepeti' },
];

export function trackSponsorClick(sponsorId: string, name: string) {
  try {
    const payload = JSON.stringify({ sponsor_id: sponsorId, name });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/sponsors/click', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/sponsors/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}

// Tıklamada hafif mavimsi parıltı — kısa süreli .sp-clicked class'ı
function flashGlow(e: { currentTarget: HTMLAnchorElement | EventTarget & Element }) {
  const el = e.currentTarget as HTMLElement;
  el.classList.remove('sp-clicked');
  void el.offsetWidth; // reflow → animasyon yeniden tetiklensin
  el.classList.add('sp-clicked');
  window.setTimeout(() => el.classList.remove('sp-clicked'), 650);
}

// Neon sosyal butonlar — sponsor tıklaması gibi güçlü parıltı
function snFlash(e: { currentTarget: EventTarget & Element }) {
  const el = e.currentTarget as HTMLElement;
  el.classList.remove('sn-clicked');
  void el.offsetWidth;
  el.classList.add('sn-clicked');
  window.setTimeout(() => el.classList.remove('sn-clicked'), 950);
}

/* Yasal metin — İÇERİK AYNEN KORUNDU, sekmeli görünüm sadece SUNUM katmanı */
const LEGAL_PARAGRAPHS: { tag: string; head?: string; body: React.ReactNode }[] = [
  { tag: 'all', body: <p><b>YASAL UYARI, KVKK BİLGİLENDİRME, AYDINLATMA VE SORUMLULUK REDDİ</b><br/>© 2025 BanbanSports • Tüm hakları saklıdır. Producer/Geliştirici: LenstedReal</p> },
  { tag: 'yasal', body: <p><b>BanbanSports Nedir?</b> BanbanSports; canlı maç yayınları, maç merkezi, skor, fikstür, istatistik, spor haberleri ve üçüncü taraf kaynaklardan sağlanan gömülü (embed) yayın ve medya içeriklerini yalnızca bilgilendirme ve eğlence amacıyla sunan bir internet platformudur.</p> },
  { tag: 'yasal', body: <p><b>1. BAHİS VE YASAL SORUMLULUK:</b> BanbanSports bahis oynatmaz, bahis kabul etmez, bahis hesabı açmaz, bahis işlemlerine veya para transferlerine aracılık etmez ve bahis hizmeti satmaz. Sitedeki hiçbir içerik, bağlantı, reklam veya yönlendirme yasa dışı bahse davet, teşvik, yönlendirme veya kazanç garantisi olarak değerlendirilmemelidir. BanbanSports üzerinden gerçekleştirilmeyen bahis, ödeme, para transferi, üyelik, hesap açma veya benzeri işlemlerden ve bunların sonuçlarından BanbanSports sorumlu değildir.</p> },
  { tag: 'yasal', body: <p><b>2. ÜÇÜNCÜ TARAF SİTELER, REKLAMLAR VE GÖMÜLÜ İÇERİKLER:</b> Sitede yer alan reklamlar, sponsor içerikleri, bağlantılar, yönlendirmeler, iframe, embed ve diğer üçüncü taraf içerikler BanbanSports tarafından işletilmeyebilir veya kontrol edilmeyebilir. Bu kaynakların içerikleri, faaliyetleri, güvenliği, hizmetleri, hukuka uygunluğu veya kullanıcılarla gerçekleştirdiği işlemlerden BanbanSports sorumlu değildir. Kullanıcının reklam, bağlantı veya yönlendirme aracılığıyla üçüncü taraf bir platforma erişmesiyle başlayan işlemler ilgili platformun sorumluluğundadır; BanbanSports bu işlemlere taraf değildir ve sorumluluk kabul etmez. Gömülü içerikler üzerinde BanbanSports mülkiyet veya hak sahipliği iddiasında bulunmaz. Hak sahiplerinden gelen hukuka uygun bildirimler mevcut mevzuat ve teknik imkânlar kapsamında değerlendirilir.</p> },
  { tag: 'yasal', body: <p><b>3. KULLANICI TARAFINDAN OLUŞTURULAN VE PAYLAŞILAN İÇERİKLER:</b> Kullanıcıların BanbanSports hakkında veya BanbanSports içeriklerini kullanarak oluşturduğu yorum, paylaşım, ekran görüntüsü, video, kayıt, bağlantı, görsel, yeniden düzenlenmiş içerik ve yapay zekâ araçlarıyla oluşturulan benzeri materyallerin hukuki sorumluluğu, içeriği oluşturan veya paylaşan kişiye aittir. Bu içerikler BanbanSports&apos;un resmî görüşünü, tavsiyesini veya beyanını temsil etmez. Kullanıcıların BanbanSports&apos;u başka kişilere önermesi, site bağlantılarını paylaşması veya üçüncü kişileri siteye yönlendirmesi sonucunda gerçekleşen işlemlerden BanbanSports sorumlu değildir. Kullanıcılar; BanbanSports&apos;a ait içerik, görsel, bağlantı, marka veya diğer materyalleri kullanırken telif, fikri mülkiyet, kişilik hakları ve üçüncü kişilerin diğer yasal haklarına uymakla yükümlüdür. BanbanSports; kendi içeriklerinin izinsiz, hukuka aykırı, yanıltıcı veya hak ihlaline neden olacak şekilde kullanılmasına karşı içeriğin kaldırılmasını talep etme, erişimi kısıtlama ve gerekli hukuki veya teknik işlemleri başlatma hakkını saklı tutar.</p> },
  { tag: 'telif', body: <p><b>4. YAYIN VE TELİF HAKLARI:</b> BanbanSports, üçüncü taraf yayın ve medya içeriklerinin hak sahibi olduğunu iddia etmez. Sitedeki bazı yayınlar üçüncü taraf kaynakların teknik araçları kullanılarak gömülü (embed) şekilde sunulabilir. İçeriklerin BanbanSports sunucularında barındırılıp barındırılmadığı ilgili içeriğin teknik yapısına göre değişebilir. Telif veya fikri mülkiyet hakkı iddiasında bulunan hak sahipleri BanbanSports ile iletişime geçebilir; bildirimler yürürlükteki mevzuat ve mevcut teknik imkânlar kapsamında değerlendirilir.</p> },
  { tag: 'yasal', body: <p><b>5. BİLGİLERİN DOĞRULUĞU:</b> Sitedeki skor, fikstür, kadro, sakatlık, transfer, istatistik, haber ve benzeri bilgilerin eksiksiz, hatasız veya güncel olduğu garanti edilmez. Bilgiler anlık olarak değişebilir veya üçüncü taraf kaynaklardan sağlanabilir. Kullanıcı, ihtiyaç duyduğu bilgileri doğrulamakla ve bu bilgilere dayanarak aldığı kararların sonuçlarından kendisi sorumlu olmakla yükümlüdür.</p> },
  { tag: 'yasal', body: <p><b>6. ALAN ADI, SUNUCULAR VE ERİŞİM:</b> BanbanSports&apos;un alan adı, sunucu altyapısı veya erişim adresleri değişebilir. Teknik bakım, hizmet kesintisi, sunucu veya veri sağlayıcı sorunları, erişim kısıtlamaları, alan adı değişiklikleri veya üçüncü taraf altyapı sorunlarından kaynaklanan kesintilerden BanbanSports sorumlu değildir. Güncel erişim adreslerini site kopyalarından mağdur olmamak amacıyla takip etmek her zaman kullanıcının sorumluluğundadır.</p> },
  { tag: 'yasal', body: <p><b>7. KABUL:</b> BanbanSports&apos;u ziyaret eden, kullanan veya içeriklerine erişen her kullanıcı, bu metni okuduğunu, anladığını ve siteyi kendi sorumluluğu altında kullandığını kabul etmiş sayılır. Kullanıcı, site üzerinden gerçekleştirdiği işlemlerin ve aldığı kararların sonuçlarından kendisi sorumludur. BanbanSports bu metni önceden bildirimde bulunmaksızın güncelleme veya değiştirme hakkını saklı tutar.</p> },
  { tag: 'yasal', body: <p><b>8. SPONSORLAR, REKLAMLAR VE MARKALAR:</b> Sitede yer alan sponsor, reklam, marka, logo, tanıtım veya üçüncü taraf bağlantıların bulunması; ilgili kişi, kurum veya platform ile BanbanSports arasında resmî ortaklık, temsil, yetkilendirme veya sürekli ticari ilişki bulunduğu anlamına gelmez. Üçüncü taraflara ait marka, logo ve içeriklerin hakları ilgili hak sahiplerine aittir. BanbanSports bu üçüncü tarafların hizmetlerinden, beyanlarından veya faaliyetlerinden sorumlu değildir.</p> },
  { tag: 'yasal', body: <p><b>9. TEKNİK ALTYAPI VE HİZMET SÜREKLİLİĞİ:</b> BanbanSports; skor, fikstür, istatistik ve benzeri bilgileri kendi sistemleri veya üçüncü taraf veri kaynakları aracılığıyla sağlayabilir. Bu bilgilerin veya hizmetlerin kesintisiz, eksiksiz, hatasız ya da gerçek zamanlı sunulacağı garanti edilmez. Sunucu, veri sağlayıcı, yayın kaynağı, teknik altyapı veya diğer hizmetlerde meydana gelen arıza, bakım, güncelleme, erişim kısıtlaması veya üçüncü taraf kaynaklı sorunlardan doğan kesintilerden BanbanSports sorumlu değildir.</p> },
  { tag: 'kvkk', body: <p><b>KVKK VE BİLGİLENDİRME:</b> Bu metin KVKK ve genel bilgilendirme niteliğindedir. Kişisel verilerin işlenmesine ilişkin uygulamalar yürürlükteki mevzuat ve BanbanSports&apos;un ilgili politikaları kapsamında yürütülür. Gerekli durumlarda kullanıcıların ayrıca ilgili KVKK, gizlilik, çerez ve kullanım koşullarını incelemesi gerekir.</p> },
  { tag: 'sorumluluk', body: <p><b>GENEL SORUMLULUK REDDİ:</b> BanbanSports; site, yayınlar, içerikler, üçüncü taraf kaynaklar, reklamlar, bağlantılar, teknik altyapı veya kullanıcıların gerçekleştirdiği işlemlerden kaynaklanan sonuçlardan sorumluluk kabul etmez. BanbanSports hiçbir üçüncü taraf işleminin tarafı değildir. Kullanıcı, siteyi ve site üzerinden erişilen içerikleri kendi sorumluluğu altında kullanır.</p> },
  { tag: 'all', body: <p>Lütfen sitemizde yürürlükteki yasalara ve topluluk kurallarına uyarak topluluğumuzu güvenli ve düzenli tutmamıza yardımcı olun. Bu metni siteyi kullanan her kullanıcının okuduğu ve anladığı kabul edilir. Son güncelleme: 2026</p> },
];

const LEGAL_TABS = [
  { id: 'tumu', label: 'TÜMÜ' },
  { id: 'yasal', label: 'YASAL UYARI' },
  { id: 'kvkk', label: 'KVKK' },
  { id: 'telif', label: 'TELİF' },
  { id: 'sorumluluk', label: 'SORUMLULUK REDDİ' },
];

export function LegalPanel() {
  const [tab, setTab] = useState('tumu');
  const scrollRef = useRef<HTMLDivElement>(null);
  const halfRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  // JS marquee — TÜM metin akar, yarı-kopya yüksekliğinde kusursuz loop (hover'da durur)
  useEffect(() => {
    if (tab !== 'tumu') return;
    let raf = 0;
    let off = 0;
    let last = performance.now();
    const SPEED = 34; // px/sn
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const half = halfRef.current?.offsetHeight || 0;
      if (!pausedRef.current && half > 0) {
        off = (off + SPEED * dt) % half;
        if (scrollRef.current) scrollRef.current.style.transform = `translateY(${-off}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [tab]);

  const shown = tab === 'tumu'
    ? LEGAL_PARAGRAPHS
    : LEGAL_PARAGRAPHS.filter((p) => p.tag === tab || p.tag === 'all');
  return (
    <div className="pnl ft2-legal" data-testid="legal-credits" aria-label="Yasal bilgilendirme">
      <div className="pnl-head">
        <span className="pnl-title" data-testid="legal-panel-head">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ marginRight: 6, verticalAlign: -1 }}><path d="M12 3L4 6v5c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V6l-8-3zm0 2.2l6 2.2v3.6c0 4-2.6 7.9-6 9.1-3.4-1.2-6-5.1-6-9.1V7.4l6-2.2z"/></svg>
          YASAL BİLGİLENDİRME
        </span>
      </div>
      <div className="ft2-legal-tabs" role="tablist">
        {LEGAL_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`ft2-legal-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            data-testid={`legal-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        className={`ft2-legal-body ${tab === 'tumu' ? 'rolling' : 'static'}`}
        data-testid="legal-body"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        {tab === 'tumu' ? (
          <div className="ft2-legal-scroll" ref={scrollRef}>
            <div ref={halfRef}>
              {LEGAL_PARAGRAPHS.map((p, i) => <div key={`a-${i}`}>{p.body}</div>)}
            </div>
            <div aria-hidden="true">
              {LEGAL_PARAGRAPHS.map((p, i) => <div key={`b-${i}`}>{p.body}</div>)}
            </div>
          </div>
        ) : shown.map((p, i) => <div key={`${tab}-${i}`}>{p.body}</div>)}
      </div>
    </div>
  );
}

/* Yatay kaydırmalı sponsor sırası — yanlarda ok butonları (prototip) */
function SponsorRow({ items, rowId }: { items: typeof SPONSORS; rowId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  return (
    <div className="spx-row-wrap">
      <button className="spx-arrow" onClick={() => scroll(-1)} aria-label="Geri kaydır" data-testid={`sponsor-row-${rowId}-prev`}>‹</button>
      <div className="spx-row" ref={ref} data-testid={`sponsor-row-${rowId}`}>
        {items.map((s) => (
          <a key={s.id}
             className={`sponsor-item ${s.klass}`}
             href={s.href} target="_blank" rel="noopener noreferrer"
             aria-label={s.alt}
             onClick={(e) => { flashGlow(e); trackSponsorClick(s.id, s.alt); }}
             data-testid={`sponsor-${s.id}`}>
            <img loading="lazy" decoding="async" src={s.img} alt={s.alt}/>
          </a>
        ))}
      </div>
      <button className="spx-arrow" onClick={() => scroll(1)} aria-label="İleri kaydır" data-testid={`sponsor-row-${rowId}-next`}>›</button>
    </div>
  );
}

export default function SponsorsFooter() {
  const half = Math.ceil(SPONSORS.length / 2);
  return (
    <footer className="footer" id="sponsorlar" data-testid="footer">
      <div className="ft2-wrap">
        <div className="brand-tagline" data-testid="brand-tagline">KALİTENİN ZİRVESİNDEYİZ</div>
        <div className="sponsors-section">
          <div className="sponsors-heading-v2" data-testid="sponsors-heading">
            <span className="glitch" data-text="SPONSORLARIMIZ">SPONSORLARIMIZ</span>
          </div>
          <div className="sponsors-title">Bu platform aşağıdaki şirketlerin destekleriyle kurulmuştur</div>
          <SponsorRow rowId="1" items={SPONSORS.slice(0, half)} />
          <SponsorRow rowId="2" items={SPONSORS.slice(half)} />
        </div>

        {/* Footer panel grid — 2 kolon */}
        <div className="ft2-grid">
          {/* SOSYAL MEDYA & DESTEK — birleşik panel */}
          <div className="pnl ft2-social" data-testid="footer-socials">
            <div className="pnl-head"><span className="pnl-title t-pink">SOSYAL MEDYA &amp; DESTEK</span></div>
            <div className="ft2-social-body">
              <div className="social-neon" data-testid="social-neon" aria-label="Sosyal medya hesapları">
                <img src="/logos/social_neon.gif" alt="Instagram · TikTok · Spotify · X — lenstedreal" className="social-neon-gif" loading="lazy" decoding="async" />
                <a href="https://www.instagram.com/lenstedreal" target="_blank" rel="noopener noreferrer" onClick={snFlash} className="social-neon-hit sn-tl" data-testid="ig-link" aria-label="Instagram @lenstedreal" />
                <a href="https://www.tiktok.com/@lenstedreal" target="_blank" rel="noopener noreferrer" onClick={snFlash} className="social-neon-hit sn-tr" data-testid="tiktok-link" aria-label="TikTok @lenstedreal" />
                <a href="https://open.spotify.com/user/31mrl6zezfs7zd4cbtkwczb6fvqe?si=K7QgCpC_Tluzk_QUSpdBkQ" target="_blank" rel="noopener noreferrer" onClick={snFlash} className="social-neon-hit sn-bl" data-testid="spotify-link" aria-label="Spotify Lenstedreal" />
                <a href="https://x.com/lenstedreal" target="_blank" rel="noopener noreferrer" onClick={snFlash} className="social-neon-hit sn-br" data-testid="x-link" aria-label="X @querte" />
              </div>
              <a
                href="https://t.me/swearty8_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-neon ft2-tg-btn"
                data-testid="telegram-support"
                aria-label="Telegram Destek"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                  <path fill="currentColor" d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.14-3.05-1.99 1.93c-.22.22-.4.4-.83.4z"/>
                </svg>
                <span>Sorun / Destek için Telegram&apos;dan bize yazın</span>
              </a>
              <div className="ft2-infra neon-note" data-testid="footer-infra">
                <p className="access-opera" data-testid="opera-recommend">En iyi izleme deneyimi için <strong>Opera</strong> tarayıcısı kullanmanız önerilir.</p>
              </div>
            </div>
          </div>

          {/* FOOTBALL SUPPLIERS + DMCA + 5G */}
          <div className="pnl ft2-suppliers" data-testid="footer-suppliers">
            <div className="pnl-head"><span className="pnl-title">FOOTBALL SUPPLIERS</span></div>
            <div className="ft2-sup-body">
              <div className="fs-head" data-testid="fs-head">[ FOOTBALL•SUPPLIERS // 2026–27 ]</div>
              <div className="fs-sub">FOOTBALL APPAREL &amp; EQUIPMENT&ensp;/&ensp;<span className="fs-verified">CERTIFICA · VERIFIED</span></div>
              <div className="fs-cards" data-testid="fs-cards">
                <div className="fs-card fs-brands" title="adidas · Nike · Puma">
                  <img src="/logos/football_suppliers.webp" alt="adidas · Nike · Puma" loading="lazy" decoding="async" draggable={false} />
                </div>
                <div className="fs-card fs-team" title="Galatasaray" data-testid="fs-team-gs"><img src="/footy/teams/galatasaray-logo-footylogos.svg?v=2" alt="Galatasaray" loading="lazy" decoding="async" draggable={false} /><span className="fs-team-name">Galatasaray</span></div>
                <div className="fs-card fs-team" title="Fenerbahçe" data-testid="fs-team-fb"><img src="/footy/teams/fenerbahce-logo-footylogos.svg?v=2" alt="Fenerbahçe" loading="lazy" decoding="async" draggable={false} /><span className="fs-team-name">Fenerbahçe</span></div>
                <div className="fs-card fs-team" title="Beşiktaş" data-testid="fs-team-bjk"><img src="/footy/teams/besiktas-logo-footylogos.svg?v=2" alt="Beşiktaş" loading="lazy" decoding="async" draggable={false} /><span className="fs-team-name">Beşiktaş</span></div>
                <div className="fs-card fs-team" title="Trabzonspor" data-testid="fs-team-ts"><img src="/footy/teams/trabzonspor-logo-footylogos.svg?v=2" alt="Trabzonspor" loading="lazy" decoding="async" draggable={false} /><span className="fs-team-name">Trabzonspor</span></div>
              </div>
              <div className="fs-legal">ALL TRADEMARKS, LOGOS &amp; BRAND NAMES ARE PROPERTY OF THEIR RESPECTIVE OWNERS.</div>
            </div>
          </div>
        </div>

        <div className="ft2-bottom" data-testid="footer-bottom">
          <div className="ft2-bottom-row">
            <img src="/logos/dmca_protected.webp" alt="DMCA Protected" className="dmca-badge" loading="lazy" decoding="async" draggable={false} data-testid="footer-dmca" />
            <div className="ft2-copy" data-testid="footer-copyright">® 2024–2027 banbansports UNDERGROUND HD · TÜM HAKLARI SAKLIDIR · by <span className="sponsor-name">lenstedreal</span> ❤️‍🩹</div>
          </div>
          <div className="ft2-infra-line" data-testid="footer-infra-line">Bu sitenin altyapısı <strong>lenstedreal StreamRadar</strong> tarafından yapılmıştır.</div>
        </div>
      </div>
    </footer>
  );
}
