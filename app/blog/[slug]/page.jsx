import React from 'react'
import BlogPostClient from './BlogPostClient'

const posts = {
  'what-is-whale-tracking': { title: 'What is Whale Tracking? How It Works and Why It Matters', description: 'Understand how whale tracking reveals large on-chain moves and how traders use it for edge.', date: '2025-08-01' },
  'copy-whale-trades': { title: 'How To Copy Whale Trades Safely (Without Chasing Pumps)', description: 'A practical framework to follow whales while managing risk and slippage.', date: '2025-08-05' },
  'real-time-crypto-transactions': { title: 'Real-Time Crypto Transactions Explained', description: 'From mempools to settlement, how data flows into live dashboards and alerts.', date: '2025-08-10' },
  'orca-ai-crypto-trading': { title: 'Orca AI: Next-Generation Crypto Trading Intelligence', description: 'Discover how Orca AI revolutionizes crypto trading with advanced pattern recognition and market analysis.', date: '2025-09-01' },
  'bullish-bearish-sentiment-trading': { title: 'Using Community Sentiment to Trade: Bullish vs Bearish Signals', description: 'Learn how to leverage community sentiment and whale voting patterns for better trades.', date: '2025-11-16' },
  'top-whales-7day-analysis': { title: 'Top 10 Whales This Week: What Are They Trading?', description: 'Deep dive into the most active crypto whales this week and their buy/sell patterns.', date: '2025-11-16' },
  'nansen-vs-sonar-tracker': { title: 'Nansen vs Sonar Tracker: Full Comparison for 2026', description: 'Feature-by-feature breakdown of Nansen ($150+/mo) vs Sonar Tracker ($7.99/mo). Same data, fraction of the cost.', date: '2026-02-24' },
  'best-crypto-whale-tracking-tools-2026': { title: 'Best Crypto Whale Tracking Tools Compared: 2026 Rankings', description: 'We tested every major whale tracking platform. Nansen, Arkham, Whale Alert, DeBank, Santiment ranked.', date: '2026-02-22' },
  'how-to-track-whale-wallets': { title: 'How to Track Whale Wallets: Step-by-Step for Beginners', description: 'Complete tutorial on finding, following, and interpreting crypto whale wallet activity.', date: '2026-02-20' },
  'whale-tracking-predicted-crashes': { title: '5 Times Whale Tracking Predicted Major Crypto Crashes', description: 'Historical examples where on-chain whale data signaled crashes days before they happened.', date: '2026-02-18' },
  'how-ai-changing-crypto-trading': { title: 'How AI Is Revolutionizing Crypto Trading in 2026', description: 'From whale pattern recognition to sentiment analysis, how AI tools give traders an edge.', date: '2026-02-16' },
  'on-chain-analysis-beginners': { title: 'On-Chain Analysis for Beginners: Reading the Blockchain', description: 'Everything about on-chain metrics: whale flows, exchange balances, net inflows, and trading.', date: '2026-02-14' },
  'arkham-vs-sonar-tracker': { title: 'Arkham Intelligence vs Sonar Tracker: Which Is Better?', description: 'Detailed comparison of Arkham and Sonar Tracker. Features, pricing, AI capabilities.', date: '2026-02-12' },
  'free-crypto-analytics-tools-2026': { title: 'Free Crypto Analytics Tools That Actually Work in 2026', description: 'The best free tools for whale tracking, on-chain analysis, and market intelligence.', date: '2026-02-10' },
  'eth-whale-activity-analysis': { title: 'ETH Whale Activity: What Smart Money Is Doing Right Now', description: 'Deep dive into current Ethereum whale movements and what they signal for ETH price.', date: '2026-02-08' },
  'bitcoin-whale-accumulation-patterns': { title: 'Bitcoin Whale Accumulation Patterns: How to Read Them', description: 'Identify when Bitcoin whales are quietly accumulating before major price moves.', date: '2026-02-06' },
  'whale-accumulation-vs-distribution': { title: 'Whale Accumulation vs Distribution: The Only Guide You Need', description: 'How to tell if whales are buying or selling right now using on-chain data.', date: '2026-02-04' },
  'crypto-market-manipulation-detection': { title: 'Crypto Market Manipulation: How to Detect It in Real-Time', description: 'Pump-and-dumps, wash trading, stop hunts. How to spot them before becoming the victim.', date: '2026-02-02' },
  'day-traders-whale-signals': { title: 'How Day Traders Use Whale Signals to Time Entries', description: 'Practical strategies for incorporating whale data into day trading. Real examples.', date: '2026-01-30' },
  'cost-of-missing-whale-signals': { title: 'The Real Cost of Missing Whale Signals (With Examples)', description: 'Three real scenarios where ignoring whale data cost traders 15-40% in missed gains.', date: '2026-01-28' },
  'institutional-traders-on-chain-data': { title: 'How Institutional Traders Use On-Chain Data', description: 'What hedge funds and prop desks look at on the blockchain. Their metrics and strategies.', date: '2026-01-26' },
  'sol-whale-tracker': { title: 'SOL Whale Tracker: Real-Time Solana Whale Movements', description: 'Track Solana whale wallets. Accumulation trends, top holders, and price implications.', date: '2026-01-24' },
  'building-trading-strategy-whale-intelligence': { title: 'Building a Trading Strategy Around Whale Intelligence', description: 'Complete framework for using whale data as your primary signal. Entries, exits, risk management.', date: '2026-01-22' },
  'glassnode-vs-sonar': { title: 'Glassnode vs Sonar: On-Chain Analytics Compared', description: 'Glassnode focuses on Bitcoin metrics. Sonar covers multi-chain whale tracking with AI.', date: '2026-01-20' },
  'custom-whale-alerts-setup': { title: 'How to Set Up Custom Whale Alerts (5 Configs That Work)', description: 'Five proven whale alert configurations for day trading, swing trading, and DeFi.', date: '2026-01-18' },
  'why-crypto-keeps-getting-dumped': { title: 'Why Your Crypto Keeps Getting Dumped On', description: 'The whale distribution patterns that precede every dump. Read the signs first.', date: '2026-01-16' },
}

export async function generateMetadata({ params }) {
  const { slug } = params
  const post = posts[slug] || posts['what-is-whale-tracking']

  return {
    title: `${post.title}`,
    description: post.description,
    alternates: { canonical: `https://www.sonartracker.io/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://www.sonartracker.io/blog/${slug}`,
      type: 'article',
      publishedTime: post.date,
      authors: ['Sonar Tracker Team'],
      siteName: 'Sonar Tracker',
    },
  }
}

function BlogPostSchema({ slug }) {
  const post = posts[slug] || posts['what-is-whale-tracking']
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: '2026-02-24',
    author: { '@type': 'Organization', name: 'Sonar Tracker', url: 'https://www.sonartracker.io' },
    publisher: {
      '@type': 'Organization',
      name: 'Sonar Tracker',
      logo: { '@type': 'ImageObject', url: 'https://www.sonartracker.io/logo2.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://www.sonartracker.io/blog/${slug}` },
    image: 'https://www.sonartracker.io/screenshots/stats-dashboard.png',
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export default function BlogPost({ params }) {
  return (
    <>
      <BlogPostSchema slug={params.slug} />
      <BlogPostClient slug={params.slug} />
    </>
  )
}

export async function generateStaticParams() {
  return Object.keys(posts).map(slug => ({ slug }))
}