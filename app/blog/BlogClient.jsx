'use client'
/**
 * Blog index: the newest guides as featured image cards, every other guide
 * as an image card (cover, or a designed fallback — never an empty slot),
 * and the weekly whale pulse as a compact dated list. Search filters all of
 * them into one list.
 */
import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { T } from '@/lib/ui/tokens'

const Page = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px 64px;
  color: ${T.body};
  font-family: ${T.font.sans};
  @media (max-width: 760px) { padding: 20px 16px 48px; }
`
const Head = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  h1 { margin: 0 0 6px; font-size: 28px; font-weight: 600; color: ${T.ink}; }
  p { margin: 0; font-size: 14px; color: ${T.muted}; max-width: 60ch; }
`
const Search = styled.input`
  width: 280px;
  max-width: 100%;
  height: 36px;
  padding: 0 12px;
  border-radius: ${T.radius.md};
  border: 1px solid ${T.hairlineStrong};
  background: ${T.surface2};
  color: ${T.ink};
  font-size: 13px;
  &:focus { outline: none; border-color: ${T.accent}; }
`
const SectionTitle = styled.h2`
  margin: 32px 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: ${T.muted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(${(p) => p.$cols || 3}, minmax(0, 1fr));
  gap: 16px;
  @media (max-width: 1000px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`
const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  border: 1px solid ${T.hairlineStrong};
  border-radius: ${T.radius.md};
  background: ${T.surface};
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s;
  &:hover { border-color: ${T.accentBorder}; }
  &:hover h3 { color: ${T.accent}; }
  &:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }
`
const Media = styled.div`
  aspect-ratio: 3 / 2;
  background: ${T.surface2};
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`
const Fallback = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  padding: 16px;
  background:
    radial-gradient(120% 90% at 85% 10%, rgba(0, 229, 255, 0.18), transparent 60%),
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px) 0 0 / 24px 24px,
    ${T.bg};
  span { font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${T.accent}; }
`
const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px 16px;
  flex: 1;
  h3 { margin: 0; font-size: 16px; line-height: 1.35; font-weight: 600; color: ${T.ink}; transition: color 0.15s; }
  p { margin: 0; font-size: 13.5px; line-height: 1.5; color: ${T.body}; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
`
const Meta = styled.div`
  margin-top: auto;
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: ${T.muted};
  b { font-weight: 600; color: ${T.body}; }
`
const PulseList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid ${T.hairlineStrong};
  border-radius: ${T.radius.md};
  background: ${T.surface};
  li + li { border-top: 1px solid ${T.hairline}; }
  a { display: flex; gap: 16px; align-items: baseline; padding: 12px 16px; text-decoration: none; color: ${T.ink}; font-size: 14px; }
  a:hover span.t { color: ${T.accent}; }
  time { flex-shrink: 0; width: 96px; font-size: 12px; color: ${T.muted}; font-family: ${T.font.mono}; }
`

const posts = [
  // Pulled 2025-04-21 pending legal review (Lanham Act §43(a) trademark + false-advertising risk).
  // See LEGAL_AUDIT_2025-04-21.md §1.C. Do not re-add without counsel sign-off.
  // Removed slugs: 'whale-alert-alternative', 'nansen-vs-sonar-tracker',
  // 'best-crypto-whale-tracking-tools-2025', 'arkham-vs-sonar-tracker',
  // 'glassnode-vs-sonar'.
  {
    slug: 'how-to-track-crypto-whales',
    title: 'How to Track Crypto Whale Movements: Complete 2025 Guide',
    summary: 'The definitive guide to tracking crypto whales. Step-by-step methods, tools, real examples, and strategies used by professional traders.',
    readTime: '15 min read',
    category: 'Tutorial',
    date: 'Apr 4, 2025'
  },
  {
    slug: 'best-crypto-whale-tracking-tools',
    title: 'Top 10 Crypto Whale Tracking Tools Compared (2025)',
    summary: 'We tested and ranked the 10 best whale tracking platforms. Nansen, Arkham, Sonar Tracker, Glassnode, and more — with pricing, features, and verdicts.',
    readTime: '12 min read',
    category: 'Comparison',
    date: 'Apr 4, 2025'
  },
  {
    slug: 'orca-ai-crypto-analyst',
    title: 'What Is ORCA AI? How Sonar Tracker\'s AI Analyst Reads the Blockchain',
    summary: 'Meet ORCA, the AI crypto analyst built into Sonar Tracker. See how it interprets whale movements and delivers plain-English market intelligence.',
    readTime: '8 min read',
    category: 'AI & Technology',
    date: 'Apr 4, 2025'
  },
  {
    slug: 'solana-whale-tracker',
    title: 'Solana Whale Tracker: How to Monitor Large SOL Transactions in Real Time',
    summary: 'Track Solana whale wallets and large SOL transactions in real time. Top SOL whales to watch, tools, and AI-powered Solana analysis.',
    readTime: '10 min read',
    category: 'Market Analysis',
    date: 'Apr 4, 2025'
  },
  {
    slug: 'ethereum-whale-tracker',
    title: 'Ethereum Whale Tracker: Complete Guide to Tracking ETH Whale Wallets',
    summary: 'Monitor Ethereum whale wallets, staking flows, and DeFi interactions. Complete guide to tracking large ETH transactions with AI analysis.',
    readTime: '10 min read',
    category: 'Market Analysis',
    date: 'Apr 4, 2025'
  },
  {
    slug: 'bitcoin-whale-tracker',
    title: 'Bitcoin Whale Tracker: How to Follow BTC Whale Movements',
    summary: 'Track Bitcoin whale wallets, exchange flows, and miner activity. Learn how BTC whale movements affect price with historical examples.',
    readTime: '10 min read',
    category: 'Market Analysis',
    date: 'Apr 4, 2025'
  },
  {
    slug: 'how-to-track-whale-wallets',
    title: 'How to Track Whale Wallets: Step-by-Step for Beginners',
    summary: 'A complete tutorial on finding, following, and interpreting crypto whale wallet activity using free and paid tools.',
    readTime: '8 min read',
    category: 'Tutorial',
    date: 'Feb 20, 2025'
  },
  {
    slug: 'whale-tracking-predicted-crashes',
    title: '5 Times Whale Tracking Predicted Major Crypto Crashes',
    summary: 'Historical examples where on-chain whale data signaled crashes days before they happened. Real data, real trades, real outcomes.',
    readTime: '9 min read',
    category: 'Market Analysis',
    date: 'Feb 18, 2025'
  },
  {
    slug: 'how-ai-changing-crypto-trading',
    title: 'How AI Is Revolutionizing Crypto Trading in 2025',
    summary: 'From whale pattern recognition to sentiment analysis — how AI tools like ORCA help users summarise on-chain data faster. Informational only.',
    readTime: '8 min read',
    category: 'AI & Technology',
    date: 'Feb 16, 2025'
  },
  {
    slug: 'on-chain-analysis-beginners',
    title: 'On-Chain Analysis for Beginners: Reading the Blockchain',
    summary: 'Everything you need to know about on-chain metrics: whale flows, exchange balances, net inflows, and how to use them for trading.',
    readTime: '10 min read',
    category: 'Basics',
    date: 'Feb 14, 2025'
  },
  {
    slug: 'free-crypto-analytics-tools-2025',
    title: 'Free Crypto Analytics Tools That Actually Work in 2025',
    summary: 'The best free tools for whale tracking, on-chain analysis, and market intelligence. No subscription required for these.',
    readTime: '7 min read',
    category: 'Tools',
    date: 'Feb 10, 2025'
  },
  {
    slug: 'eth-whale-activity-analysis',
    title: 'ETH Whale Activity: What Smart Money Is Doing Right Now',
    summary: 'Deep dive into current Ethereum whale movements. Accumulation vs distribution patterns and what they signal for ETH price.',
    readTime: '8 min read',
    category: 'Market Analysis',
    date: 'Feb 8, 2025'
  },
  {
    slug: 'bitcoin-whale-accumulation-patterns',
    title: 'Bitcoin Whale Accumulation Patterns: How to Read Them',
    summary: 'Learn to identify when Bitcoin whales are quietly accumulating before major price moves. On-chain metrics that matter most.',
    readTime: '9 min read',
    category: 'Market Analysis',
    date: 'Feb 6, 2025'
  },
  {
    slug: 'whale-accumulation-vs-distribution',
    title: 'Whale Accumulation vs Distribution: The Only Guide You Need',
    summary: 'The difference between whales buying and selling — and exactly how to tell which is happening right now using on-chain data.',
    readTime: '8 min read',
    category: 'Strategy',
    date: 'Feb 4, 2025'
  },
  {
    slug: 'crypto-market-manipulation-detection',
    title: 'Crypto Market Manipulation: How to Detect It in Real-Time',
    summary: 'Pump-and-dumps, wash trading, stop hunts, and whale manipulation tactics. How to spot them before you become the victim.',
    readTime: '10 min read',
    category: 'Strategy',
    date: 'Feb 2, 2025'
  },
  {
    slug: 'day-traders-whale-signals',
    title: 'How Day Traders Use Whale Signals to Time Entries',
    summary: 'Practical strategies for incorporating whale transaction data into your day trading workflow. Real examples with entries and exits.',
    readTime: '9 min read',
    category: 'Strategy',
    date: 'Jan 30, 2025'
  },
  {
    slug: 'cost-of-missing-whale-signals',
    title: 'The Real Cost of Missing Whale Signals (With Examples)',
    summary: 'Three real scenarios where ignoring whale data cost traders 15-40% in missed gains or preventable losses. The math is brutal.',
    readTime: '7 min read',
    category: 'Market Analysis',
    date: 'Jan 28, 2025'
  },
  {
    slug: 'institutional-traders-on-chain-data',
    title: 'How Institutional Traders Use On-Chain Data',
    summary: 'What hedge funds and prop desks actually look at on the blockchain. The metrics, strategies, and tools they rely on daily.',
    readTime: '9 min read',
    category: 'Strategy',
    date: 'Jan 26, 2025'
  },
  {
    slug: 'sol-whale-tracker',
    title: 'SOL Whale Tracker: Real-Time Solana Whale Movements',
    summary: 'Track the biggest Solana whale wallets. Current accumulation trends, top holders, and what SOL whale activity means for price.',
    readTime: '7 min read',
    category: 'Market Analysis',
    date: 'Jan 24, 2025'
  },
  {
    slug: 'building-trading-strategy-whale-intelligence',
    title: 'Building a Trading Strategy Around Whale Intelligence',
    summary: 'A complete framework for using whale data as your primary trading signal. Entry rules, exit rules, risk management, and position sizing.',
    readTime: '11 min read',
    category: 'Strategy',
    date: 'Jan 22, 2025'
  },
  {
    slug: 'custom-whale-alerts-setup',
    title: 'How to Set Up Custom Whale Alerts (5 Configs That Work)',
    summary: 'Five proven whale alert configurations for different trading styles: day trading, swing trading, DeFi farming, and more.',
    readTime: '7 min read',
    category: 'Tutorial',
    date: 'Jan 18, 2025'
  },
  {
    slug: 'why-crypto-keeps-getting-dumped',
    title: 'Why Your Crypto Keeps Getting Dumped On (And How to See It Coming)',
    summary: 'The whale distribution patterns that precede every major dump. Learn to read the signs before you become exit liquidity.',
    readTime: '8 min read',
    category: 'Strategy',
    date: 'Jan 16, 2025'
  },
  { 
    slug: 'bullish-bearish-sentiment-trading', 
    title: 'Using Community Sentiment to Trade: Bullish vs Bearish Signals', 
    summary: 'Learn how to leverage community sentiment polls and whale voting patterns to identify high-probability trades and market reversals.',
    readTime: '9 min read',
    category: 'Strategy',
    date: 'Nov 16, 2025'
  },
  { 
    slug: 'top-whales-7day-analysis', 
    title: 'Top 10 Whales This Week: What Are They Trading?', 
    summary: 'Deep dive into the most active crypto whales over the past 7 days, analyzing their buy/sell patterns and top token picks.',
    readTime: '10 min read',
    category: 'Market Analysis',
    date: 'Nov 16, 2025'
  },
  { 
    slug: 'orca-ai-crypto-trading', 
    title: 'Orca AI: Next-Generation Crypto Trading Intelligence', 
    summary: 'Discover how Orca AI revolutionizes crypto trading with advanced pattern recognition and market analysis.',
    readTime: '7 min read',
    category: 'AI & Technology',
    date: 'Sep 18, 2025'
  },
  { 
    slug: 'what-is-whale-tracking', 
    title: 'What is Whale Tracking? How It Works and Why It Matters', 
    summary: 'Understand how whale tracking surfaces large on‑chain moves and how users review the data themselves. Informational only — not financial advice.',
    readTime: '5 min read',
    category: 'Basics',
    date: 'Aug 15, 2025'
  },
  { 
    slug: 'copy-whale-trades', 
    title: 'How To Copy Whale Trades Safely (Without Chasing Pumps)', 
    summary: 'A practical framework to follow whales while managing risk and slippage.',
    readTime: '8 min read',
    category: 'Strategy',
    date: 'Jul 12, 2025'
  },
  { 
    slug: 'real-time-crypto-transactions', 
    title: 'Real‑Time Crypto Transactions Explained', 
    summary: 'From mempools to settlement, how data flows into live dashboards and alerts.',
    readTime: '6 min read',
    category: 'Technical',
    date: 'Jun 10, 2025'
  },
]

const PULSE = 'Whale-report'

function PostCard({ post }) {
  return (
    <Card href={`/blog/${post.slug}`}>
      <Media>
        {post.coverImage
          ? <img src={post.coverImage} alt="" width={1536} height={1024} loading="lazy" decoding="async" />
          : <Fallback aria-hidden><span>{post.category}</span></Fallback>}
      </Media>
      <Body>
        <h3>{post.title}</h3>
        {post.summary && <p>{post.summary}</p>}
        <Meta><b>{post.category}</b><span>{post.date}</span><span>{post.readTime}</span></Meta>
      </Body>
    </Card>
  )
}

export default function BlogClient({ dynamicPosts = [] }) {
  const [searchTerm, setSearchTerm] = useState('')

  // Database posts first (newest first), then the hand-written ones; one card per slug.
  const merged = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const p of [...dynamicPosts, ...posts]) {
      if (!p?.slug || seen.has(p.slug)) continue
      seen.add(p.slug)
      out.push(p)
    }
    return out
  }, [dynamicPosts])

  const q = searchTerm.trim().toLowerCase()
  const matches = (p) => !q || [p.title, p.summary, p.category].some((v) => String(v || '').toLowerCase().includes(q))
  const guides = merged.filter((p) => p.category !== PULSE && matches(p))
  const pulse = merged.filter((p) => p.category === PULSE && matches(p))
  const featured = q ? [] : guides.filter((p) => p.coverImage).slice(0, 3)
  const rest = guides.filter((p) => !featured.includes(p))

  return (
    <Page>
      <Head>
        <div>
          <h1>Crypto Whale Insights</h1>
          <p>Guides to reading on-chain whale activity, and a weekly summary of what the largest wallets did.</p>
        </div>
        <Search
          type="search"
          placeholder="Search guides"
          aria-label="Search the blog"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Head>

      {featured.length > 0 && (
        <>
          <SectionTitle>Latest guides</SectionTitle>
          <Grid $cols={3}>{featured.map((p) => <PostCard key={p.slug} post={p} />)}</Grid>
        </>
      )}

      {rest.length > 0 && (
        <>
          <SectionTitle>{q ? 'Guides' : 'All guides'}</SectionTitle>
          <Grid $cols={3}>{rest.map((p) => <PostCard key={p.slug} post={p} />)}</Grid>
        </>
      )}

      {pulse.length > 0 && (
        <>
          <SectionTitle>Weekly Whale Pulse</SectionTitle>
          <PulseList>
            {pulse.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`}>
                  <time>{p.date}</time>
                  <span className="t">{p.title}</span>
                </Link>
              </li>
            ))}
          </PulseList>
        </>
      )}

      {guides.length === 0 && pulse.length === 0 && (
        <p style={{ marginTop: 32, color: T.muted }}>No articles match “{searchTerm}”.</p>
      )}
    </Page>
  )
}
