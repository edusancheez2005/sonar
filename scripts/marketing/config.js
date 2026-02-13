/**
 * SONAR Marketing Automation — Configuration
 * 
 * Fill in your API keys and customize settings.
 * Copy this to config.local.js for your secrets (gitignored).
 */

module.exports = {
  // ─── SONAR APP ────────────────────────────────────────
  siteUrl: process.env.SONAR_URL || 'https://sonar-app.vercel.app',

  // ─── OPENAI (for caption generation) ──────────────────
  openaiKey: process.env.OPENAI_API_KEY || '',

  // ─── TWITTER / X ─────────────────────────────────────
  twitter: {
    enabled: true,
    apiKey:       process.env.TWITTER_API_KEY || '',
    apiSecret:    process.env.TWITTER_API_SECRET || '',
    accessToken:  process.env.TWITTER_ACCESS_TOKEN || '',
    accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
    // Post schedule (cron expressions)
    schedule: {
      dailyBrief:   '0 8 * * *',    // 8 AM daily
      whaleAlert:   '*/30 * * * *',  // every 30 min (if big whale)
      weeklyRecap:  '0 10 * * 1',   // Monday 10 AM
    },
  },

  // ─── INSTAGRAM (via Facebook Graph API) ───────────────
  instagram: {
    enabled: true,
    accessToken:  process.env.IG_ACCESS_TOKEN || '',
    businessId:   process.env.IG_BUSINESS_ID || '',
    schedule: {
      dailyPost:    '0 12 * * *',   // noon daily
      reels:        '0 18 * * *',   // 6 PM daily (repurposed TikToks)
    },
  },

  // ─── TIKTOK (for posting — requires TikTok for Developers) ─
  tiktok: {
    enabled: false,  // enable when you have API access
    accessToken: process.env.TIKTOK_ACCESS_TOKEN || '',
  },

  // ─── YOUTUBE SHORTS ───────────────────────────────────
  youtube: {
    enabled: false,
    clientId:     process.env.YT_CLIENT_ID || '',
    clientSecret: process.env.YT_CLIENT_SECRET || '',
    refreshToken: process.env.YT_REFRESH_TOKEN || '',
  },

  // ─── BRUTE FORCE: TikTok Repurposing ─────────────────
  repurpose: {
    // Search terms to find trending crypto TikToks
    searchTerms: [
      'crypto whale alert',
      'bitcoin whale',
      'crypto trading signal',
      'altcoin prediction',
      'crypto market today',
      'whale watching crypto',
    ],
    maxVideosPerRun: 5,
    // Branding overlay
    watermark: {
      text: 'SONAR — Whale Intelligence',
      logo: null, // path to logo PNG (optional)
      position: 'bottom-right',
    },
    // Intro/outro bumpers (optional, paths to mp4)
    introBumper: null,
    outroBumper: null,
    // Add CTA text overlay in last 3 seconds
    ctaText: 'Track whales FREE → sonar-app.vercel.app',
  },

  // ─── SCREENSHOT SETTINGS ──────────────────────────────
  screenshots: {
    viewport: { width: 1440, height: 900 },
    // Pages to screenshot for daily content
    pages: [
      { name: 'dashboard',  path: '/dashboard',     selector: '.terminal-body' },
      { name: 'whale-alert', path: '/dashboard',     selector: '.whale-alerts-panel' },
      { name: 'trending',    path: '/trending',      selector: 'main' },
      { name: 'token-btc',   path: '/token/BTC',     selector: 'main' },
      { name: 'token-eth',   path: '/token/ETH',     selector: 'main' },
      { name: 'statistics',  path: '/statistics',    selector: 'main' },
    ],
  },

  // ─── CONTENT TEMPLATES ────────────────────────────────
  templates: {
    outputDir: './scripts/marketing/output',
    // Canva-style HTML templates rendered to PNG
    types: [
      'daily-brief',
      'whale-alert',
      'token-spotlight',
      'weekly-recap',
      'prediction',
    ],
  },

  // ─── CAPTION GENERATION ───────────────────────────────
  captions: {
    model: 'gpt-4o-mini',  // cheaper for captions
    style: 'crypto-twitter', // options: crypto-twitter, professional, casual
    maxHashtags: 8,
    includeEmojis: true,
    cta: 'Track whales for FREE → link in bio 🔗',
  },
};
