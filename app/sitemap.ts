import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE = 'https://www.sonartracker.io'

// Fallback hardcoded blog slugs (in case DB is unreachable)
const fallbackBlogSlugs = [
  'what-is-whale-tracking',
  'copy-whale-trades',
  'real-time-crypto-transactions',
  'orca-ai-crypto-trading',
  'bullish-bearish-sentiment-trading',
  'top-whales-7day-analysis',
  'nansen-vs-sonar-tracker',
  'best-crypto-whale-tracking-tools-2026',
  'how-to-track-whale-wallets',
  'whale-tracking-predicted-crashes',
  'how-ai-changing-crypto-trading',
  'on-chain-analysis-beginners',
  'arkham-vs-sonar-tracker',
  'free-crypto-analytics-tools-2026',
  'eth-whale-activity-analysis',
  'bitcoin-whale-accumulation-patterns',
  'whale-accumulation-vs-distribution',
  'crypto-market-manipulation-detection',
  'day-traders-whale-signals',
  'cost-of-missing-whale-signals',
  'institutional-traders-on-chain-data',
  'sol-whale-tracker',
  'building-trading-strategy-whale-intelligence',
  'glassnode-vs-sonar',
  'custom-whale-alerts-setup',
  'why-crypto-keeps-getting-dumped',
  'whale-alert-alternative',
  'how-to-track-crypto-whales',
  'best-crypto-whale-tracking-tools',
  'orca-ai-crypto-analyst',
  'solana-whale-tracker',
  'ethereum-whale-tracker',
  'bitcoin-whale-tracker',
]

const glossaryTerms = [
  'whale', 'accumulation', 'distribution', 'on-chain-analysis', 'smart-money',
  'front-running', 'mempool', 'wash-trading', 'whale-alert', 'gas-fee',
  'net-inflow', 'net-outflow', 'exchange-flow', 'transaction-hash', 'block-explorer',
  'blockchain', 'market-manipulation', 'pump-and-dump', 'cold-wallet', 'hot-wallet',
  'mev', 'sandwich-attack', 'institutional-investor', 'sell-pressure', 'defi',
  'dex', 'slippage', 'liquidity', 'smart-contract', 'token-burn',
  'yield-farming', 'layer-2', 'rollup', 'airdrop', 'staking',
  'liquidity-mining', 'impermanent-loss', 'governance-token', 'utility-token', 'wrapped-token',
  'bridge', 'flash-loan', 'rug-pull', 'bull-trap', 'bear-trap',
  'dead-cat-bounce', 'support-level', 'resistance-level', 'breakout', 'volume-profile',
  'order-flow', 'dark-pool', 'otc-trade', 'stop-hunt', 'liquidation',
  'hodl', 'fud', 'fomo', 'diamond-hands', 'paper-hands',
  'market-maker', 'token-flow', 'whale-score',
]

export const revalidate = 3600 // Regenerate sitemap hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString()

  // Initialize Supabase for dynamic content
  const sb = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null

  // Core pages
  const corePages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/statistics`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/dashboard`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/tokens`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/news`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE}/trending`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE}/ai-advisor`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/whales`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE}/whales/leaderboard`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE}/whales/entities`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/wallet-tracker`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/backtest`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/community`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
  ]

  // SEO landing pages
  const landingPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/whale-tracker`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/nansen-alternative`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/arkham-alternative`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/ai-crypto-signals`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/solana-whale-tracker`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/ethereum-whale-tracker`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/bitcoin-whale-tracker`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
  ]

  // Info & legal pages
  const infoPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/subscribe`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/glossary`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/careers`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/press`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/changelog`, lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Blog posts: combine static fallback + dynamic AI-generated posts
  let blogSlugs = [...fallbackBlogSlugs]
  if (sb) {
    try {
      const { data: dynamicBlogs } = await sb
        .from('blog_posts')
        .select('slug, updated_at')
        .order('created_at', { ascending: false })
        .limit(500)
      if (dynamicBlogs) {
        const dynamicSlugs = dynamicBlogs.map((b: any) => b.slug)
        blogSlugs = Array.from(new Set([...blogSlugs, ...dynamicSlugs]))
      }
    } catch (_) { /* fall back to hardcoded */ }
  }
  const blogPages: MetadataRoute.Sitemap = blogSlugs.map(slug => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Glossary terms (all 63)
  const glossaryPages: MetadataRoute.Sitemap = glossaryTerms.map(term => ({
    url: `${BASE}/glossary/${term}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  // Programmatic SEO: top whale addresses
  let whalePages: MetadataRoute.Sitemap = []
  if (sb) {
    try {
      const { data: whales } = await sb
        .from('addresses')
        .select('address')
        .not('entity_name', 'is', null)
        .limit(2000)
      if (whales) {
        whalePages = whales.map((w: any) => ({
          url: `${BASE}/whale/${encodeURIComponent(w.address)}`,
          lastModified: now,
          changeFrequency: 'daily' as const,
          priority: 0.6,
        }))
      }
    } catch (_) { /* skip */ }
  }

  // Programmatic SEO: top tokens
  let tokenPages: MetadataRoute.Sitemap = []
  if (sb) {
    try {
      const { data: tokens } = await sb
        .from('all_whale_transactions')
        .select('token_symbol')
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .not('token_symbol', 'is', null)
        .limit(10000)
      if (tokens) {
        const uniqueSymbols = Array.from(new Set(tokens.map((t: any) => t.token_symbol).filter(Boolean))).slice(0, 500)
        tokenPages = uniqueSymbols.map((sym: any) => ({
          url: `${BASE}/token/${encodeURIComponent(sym)}`,
          lastModified: now,
          changeFrequency: 'daily' as const,
          priority: 0.7,
        }))
      }
    } catch (_) { /* skip */ }
  }

  return [
    ...corePages,
    ...landingPages,
    ...infoPages,
    ...blogPages,
    ...glossaryPages,
    ...whalePages,
    ...tokenPages,
  ]
}
