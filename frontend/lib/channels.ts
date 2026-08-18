export type Channel = { id: string; name: string; status: 'online' | 'maintenance' | 'checking' | 'coming_soon'; premium?: boolean; src?: string; badge?: string; logo?: string; accent?: string; short?: string };

// Her kanal için yedek sunucu listesi — 1. seçenek başarısız olursa otomatik 2., 3. denenir
export const CHANNEL_SOURCES: Record<string, string[]> = {
  tivibuspor: ['/api/stream/tivibuspor/stream.m3u8'],
  trt1:       ['/api/stream/trt1/stream.m3u8'],
  trtspor:    ['/api/stream/trtspor/stream.m3u8'],
  trthaber:   ['/api/stream/trthaber/stream.m3u8'],
  tv8:        ['/api/stream/tv8/stream.m3u8'],
  ssport:     [
    '/api/stream/ssport/stream.m3u8',
    '/api/ssport/stream.m3u8',
    '/api/stream/ssport/stream.m3u8?via=tivibu',
  ],
};

export const CHANNELS: Channel[] = [
  { id: 'tivibuspor', name: 'TİVİBU SPOR',     short: 'TİVİBU\nSPOR', status: 'online',       src: CHANNEL_SOURCES.tivibuspor[0], logo: '/logos/channels/tivibuspor.png', accent: '#00a0e3' },
  { id: 'trt1',      name: 'TRT 1',              short: 'TRT 1',     status: 'maintenance',  src: CHANNEL_SOURCES.trt1[0],        logo: '/logos/channels/trt1.png',       accent: '#e30a17' },
  { id: 'trtspor',   name: 'TRT SPOR',           short: 'TRT SPOR',  status: 'maintenance',  src: CHANNEL_SOURCES.trtspor[0],     logo: '/logos/channels/trtspor.png',    accent: '#7cd400' },
  { id: 'trthaber',  name: 'TRT HABER',          short: 'TRT HABER', status: 'online',       src: CHANNEL_SOURCES.trthaber[0],    logo: '/logos/channels/trthaber.png',   accent: '#1f6feb' },
  { id: 'tv8',       name: 'TV 8',               short: 'TV 8',      status: 'online',       src: CHANNEL_SOURCES.tv8[0],         logo: '/logos/channels/tv8.png',        accent: '#cfcfcf' },
  { id: 'bein1',     name: 'beIN SPORTS 1',      short: 'beIN 1',    status: 'maintenance',  premium: true,                       logo: '/logos/channels/bein1.png',      accent: '#8b4d9e' },
  { id: 'ssport',    name: 'S SPORT',            short: 'S SPORT',   status: 'online',       premium: true, src: CHANNEL_SOURCES.ssport[0], logo: '/logos/channels/ssport.png', accent: '#c0223a' },
  { id: 'atv',       name: 'ATV',                short: 'ATV',       status: 'maintenance',                                       logo: '/logos/channels/atv.png',        accent: '#ff7a00' },
];
