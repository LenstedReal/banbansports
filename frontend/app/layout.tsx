import './globals.css';
import type { Metadata, Viewport } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://banbansports.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'banbansports — UNDERGROUND HD · Canlı Maç, Skor ve Yayın',
    template: '%s | banbansports',
  },
  description:
    'Canlı maç skorları, beIN Sports 1 / S Sport / TRT 1 / TV8 yayınları, Süper Lig & Avrupa kupaları — banbansports UNDERGROUND HD. Hız, kalite ve gerçek zamanlı skor.',
  keywords: [
    'canlı maç', 'canlı skor', 'bein sports 1', 's sport', 'trt 1', 'tv 8',
    'süper lig', 'şampiyonlar ligi', 'avrupa ligi', 'banbansports', 'futbol yayını',
  ],
  applicationName: 'banbansports',
  authors: [{ name: 'banbansports' }],
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: SITE_URL,
    siteName: 'banbansports UNDERGROUND HD',
    title: 'banbansports — Canlı Maç & Skor',
    description: 'Canlı maç skorları + Premium yayınlar — tamamen bedava.',
    images: ['/peaky_splash.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'banbansports — Canlı Maç & Skor',
    description: 'Canlı maç skorları + Premium yayınlar — tamamen bedava.',
    images: ['/peaky_splash.jpg'],
  },
  icons: {
    icon: '/logos/full_ref.png',
    apple: '/logos/full_ref.png',
  },
  manifest: '/manifest.json',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#07070b',
  width: '1280',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* Telefonda da masaüstü düzeni: viewport'u kalıcı olarak width=1280'e sabitle.
            Next hydration sonrası etiketi geri yazsa bile MutationObserver anında düzeltir. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){function fix(){var ms=document.querySelectorAll('meta[name=viewport]');if(!ms.length){var m=document.createElement('meta');m.name='viewport';m.setAttribute('content','width=1280');document.head.appendChild(m);return;}ms.forEach(function(m){if(m.getAttribute('content')!=='width=1280'){m.setAttribute('content','width=1280');}});}try{fix();new MutationObserver(fix).observe(document.head,{childList:true,subtree:true,attributes:true,attributeFilter:['content','name']});}catch(e){}})();",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.sofascore.com" />
        <link rel="dns-prefetch" href="https://prod-public-api.livescore.com" />
        {/* Google Cast Sender SDK — Chromecast / Android TV / Beko Android TV vs.
            Yakındaki cast cihazlarını otomatik discover eder. (Bug #2 fix) */}
        <script async src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" />
      </head>
      <body className="min-h-screen text-ink-high antialiased" data-testid="app-root">
        {children}
      </body>
    </html>
  );
}
