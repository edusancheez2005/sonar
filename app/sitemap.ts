import { MetadataRoute } from 'next'

const BASE = 'https://www.sonartracker.io'

const blogSlugs = [
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

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString()

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

  // Blog posts (all 33)
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

  return [
    ...corePages,
    ...landingPages,
    ...infoPages,
    ...blogPages,
    ...glossaryPages,
  ]
}
