/** @type {import('next').NextConfig} */
const CONTENT_SECURITY_POLICY = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.com https://*.vercel-insights.com https://js.stripe.com https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://*.stripe.com https://coin-images.coingecko.com https://assets.coingecko.com;
  connect-src 'self' https://fwbwfvqzomipoftgodof.supabase.co https://*.vercel-insights.com https://api.stripe.com https://r.stripe.com https://www.google-analytics.com https://www.googletagmanager.com;
  font-src 'self';
  frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self' https://checkout.stripe.com;
`.replace(/\n/g, '')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
]

const path = require('path')

const nextConfig = {
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  env: {
    PUBLIC_URL: '',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'https://sonartracker.io',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
    ]
  },
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      '@': path.resolve(__dirname),
      'react-router-dom': path.resolve(__dirname, 'app/lib/rrd-adapter.js'),
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
      'react-router-dom': path.resolve(__dirname, 'app/lib/rrd-adapter.js'),
    };
    return config;
  },
};

module.exports = nextConfig;
