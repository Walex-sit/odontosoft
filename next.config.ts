import type { NextConfig } from 'next';

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.supabase.co",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' blob: data: https://*.supabase.co https://*.stripe.com https://images.unsplash.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: cspHeader,
  },
];

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  async rewrites() {
    const devRewrites = isDev
      ? [
          {
            // Correção exclusiva para Turbopack em desenvolvimento:
            // O dev server do Turbopack gera chunks internos com sufixo `._.css`.
            // Este rewrite impede que requisições de desenvolvimento retornem 404 text/plain.
            // Isolado para não afetar arquivos CSS legítimos nem o build de produção.
            source: '/_next/static/chunks/:file((?!.*\\._)[^/]+)\\.css',
            destination: '/_next/static/chunks/:file._.css',
          },
        ]
      : [];

    return [
      ...devRewrites,
      {
        source: '/dashboard',
        destination: '/overview',
      },
      {
        source: '/dashboard/:path*',
        destination: '/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    viewTransition: true,
  },
};

export default nextConfig;