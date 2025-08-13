import React from 'react'

const POSTS = {
  'what-is-whale-tracking': {
    title: 'What is Whale Tracking? How It Works and Why It Matters',
    description: 'Understand how whale tracking reveals large on‑chain moves and how traders use it for edge.',
    body: (
      <>
        <p>Whale tracking is the practice of monitoring large on‑chain transfers made by high‑value wallets across major blockchains. These movements can signal accumulation, distribution, or rotation between tokens and chains.</p>
        <h2>Why whales matter</h2>
        <p>Large transfers often precede liquidity shifts. By watching buys vs sells and net USD flow per token, you can identify where capital is moving and avoid being late.</p>
        <h2>How we track</h2>
        <ul>
          <li>Ingest real‑time on‑chain transactions</li>
          <li>Classify side (buy/sell/transfer) and USD value</li>
          <li>Aggregate per token, wallet, and chain for 1h/6h/24h windows</li>
        </ul>
        <p>Use the Statistics page to filter by token, chain, side, and USD range to find actionable flows.</p>
      </>
    ),
  },
  'copy-whale-trades': {
    title: 'How To Copy Whale Trades Safely (Without Chasing Pumps)',
    description: 'A practical framework to follow whales while managing risk and slippage.',
    body: (
      <>
        <p>Copying whales doesn’t mean market‑buying every transfer. It means building rules that keep you on the right side of sustained flows.</p>
        <h2>Framework</h2>
        <ol>
          <li>Confirm sustained net inflow into a token (e.g., 24h net flow rising across chains)</li>
          <li>Wait for a pullback or consolidation rather than chasing a spike</li>
          <li>Size positions small and diversify across 2–3 strongest tokens</li>
          <li>Set invalidation: if net flow flips negative, exit</li>
        </ol>
        <p>Our dashboard surfaces token leaderboards and recent trades so you can apply this consistently.</p>
      </>
    ),
  },
  'real-time-crypto-transactions': {
    title: 'Real‑Time Crypto Transactions Explained',
    description: 'From mempools to settlement—how data flows into live dashboards and alerts.',
    body: (
      <>
        <p>Real‑time dashboards start at the mempool. Transactions propagate to nodes, get included in blocks, and settle. We consume this data, normalize it, and enrich with USD values and side classification.</p>
        <h2>Latency and accuracy</h2>
        <p>There’s a trade‑off between speed and certainty. We show events quickly, then reconcile with finalized data so you always see the latest state.</p>
        <h2>What to watch</h2>
        <ul>
          <li>24h net flow by token</li>
          <li>Unique whales active</li>
          <li>Chain split and cross‑chain rotations</li>
        </ul>
      </>
    ),
  },
}

export async function generateMetadata({ params }) {
  const post = POSTS[params.slug]
  if (!post) return { title: 'Blog' }
  const url = `https://www.sonartracker.io/blog/${params.slug}`
  return {
    title: `${post.title} — Sonar Tracker`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: { title: post.title, description: post.description, url },
    twitter: { title: post.title, description: post.description },
  }
}

export default function BlogPost({ params }) {
  const post = POSTS[params.slug]
  if (!post) return <main className="container" style={{ padding: '2rem' }}><h1>Not found</h1></main>
  return (
    <main className="container" style={{ padding: '2rem' }}>
      <article>
        <h1>{post.title}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{post.description}</p>
        <div>{post.body}</div>
      </article>
    </main>
  )
} 