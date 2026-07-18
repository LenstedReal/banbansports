/** @type {import('next').NextConfig} */

// NOTE: On Vercel, /api/* is routed by vercel.json directly to the Python
// serverless function (api/index.py). NEXT_PUBLIC_BACKEND_URL is only used
// when running locally (next dev) to proxy to a separate FastAPI dev server.
const backend = process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || '';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Güvenlik ve performans
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },

  experimental: {
    scrollRestoration: true,
  },

  // Local dev only: proxy /api/* to local FastAPI server.
  // In production on Vercel, vercel.json rewrites handle this instead.
  async rewrites() {
    if (!backend) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },

  // Güvenlik Header'ları
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      // Statik dosyalar için uzun cache
      {
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/logos/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

module.exports = nextConfig;
