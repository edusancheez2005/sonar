import React from 'react'

const POSTS = {
  'what-is-whale-tracking': {
    title: 'What is Whale Tracking? How It Works and Why It Matters',
    description: 'Understand how whale tracking reveals large on‑chain moves and how traders use it for edge.',
    body: (
      <>
        <p>
          Whale tracking is the practice of monitoring unusually large on‑chain transfers executed by
          high‑value addresses across major blockchains. These movements, often made by long‑tenured funds,
          market makers, treasuries, and early backers, can precede liquidity shifts and regime changes in
          specific tokens or sectors. By measuring net inflows and outflows, traders can spot accumulation,
          distribution, and rotation before it shows up on slower price‑based indicators.
        </p>
        <h2 id="why">Why whales matter</h2>
        <p>
          A single multi‑million dollar buy can seed a trend when it’s part of a broader flow. On Sonar, we
          transform raw transfers into structured signals: side (buy, sell, transfer), USD value, and chain,
          then aggregate these per token across multiple timeframes. The result is a continuously updating
          picture of where large capital is moving. When net USD flow turns positive and stays positive across
          1h→6h→24h windows, it often precedes elevated liquidity and trending behavior.
        </p>
        <h2 id="how">How Sonar tracks whales</h2>
        <ul>
          <li>Ingest real‑time on‑chain transactions from supported networks</li>
          <li>Classify each event’s side and normalize USD value and token metadata</li>
          <li>Aggregate by token, wallet, and chain; compute net flow, buy/sell counts, and unique whales</li>
          <li>Surface leaderboards and recent trades with filters for token, chain, side, and USD ranges</li>
        </ul>
        <p>
          Classification reduces noise. For example, pure internal transfers are separated from clear buy/sell
          activity so the dashboard emphasizes directional intent. You can then slice by minimum USD size to
          focus only on impactful transactions.
        </p>
        <h2 id="use">Practical use cases</h2>
        <ol>
          <li>
            Token discovery: sort by 24h net flow to find where capital is concentrating before price
            discoveries reach social timelines.
          </li>
          <li>
            Confirmation: use steady net inflows as confirmation for technical setups rather than chasing
            single green candles.
          </li>
          <li>
            Risk control: if net flow flips negative, treat it as a de‑risking signal and reduce exposure.
          </li>
        </ol>
        <p>
          Whale tracking is not about blindly mirroring the largest wallet. It’s about understanding
          aggregate behavior of sophisticated participants and aligning with sustained flow, not isolated
          spikes. Explore Statistics to filter by token, chain, side, and USD threshold, and use the token
          pages to review recent trades and chain splits.
        </p>
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--secondary)', paddingTop: '1rem' }}>
          <strong>Quick links:</strong> <a href="#why">Why whales matter</a> · <a href="#how">How we track</a> · <a href="#use">Use cases</a>
        </div>
      </>
    ),
  },
  'copy-whale-trades': {
    title: 'How To Copy Whale Trades Safely (Without Chasing Pumps)',
    description: 'A practical framework to follow whales while managing risk and slippage.',
    body: (
      <>
        <p>
          Copying whales doesn’t mean buying every large green print. The edge lies in distinguishing
          sustained accumulation from opportunistic rebalancing, and entering with rules that control risk.
          Below is a simple, repeatable framework used by many flow‑aware traders.
        </p>
        <h2 id="framework">A practical framework</h2>
        <ol>
          <li>
            Seek sustained net inflow: scan the 24h leaderboard and confirm that net USD flow is climbing
            alongside healthy buy/sell ratios. Avoid one‑off spikes.
          </li>
          <li>
            Wait for structure: rather than market‑buying the first impulse, wait for consolidation or pullbacks
            that keep the positive flow regime intact.
          </li>
          <li>
            Diversify: split risk across the top 2–3 tokens showing the strongest multi‑window net inflow.
          </li>
          <li>
            Define invalidation: if net flow flips negative or unique whale participation drops sharply,
            exit or reduce.
          </li>
        </ol>
        <h2 id="pitfalls">Common pitfalls</h2>
        <ul>
          <li>Chasing single transactions without context</li>
          <li>Ignoring chain splits (inflow on one chain while outflow on another)</li>
          <li>Over‑sizing positions because “whales are buying”</li>
        </ul>
        <p>
          Sonar’s dashboard and token pages are designed to keep you on the right side of flow. Use minimum
          USD filters to ignore noise, and rely on tabular stats instead of social sentiment. Over time, the
          goal is consistency: small edges compounded by disciplined execution.
        </p>
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--secondary)', paddingTop: '1rem' }}>
          <strong>Quick links:</strong> <a href="#framework">Framework</a> · <a href="#pitfalls">Pitfalls</a>
        </div>
      </>
    ),
  },
  'real-time-crypto-transactions': {
    title: 'Real‑Time Crypto Transactions Explained',
    description: 'From mempools to settlement—how data flows into live dashboards and alerts.',
    body: (
      <>
        <p>
          “Real‑time” starts in the mempool. Transactions propagate through peer‑to‑peer networks, are picked
          up by nodes, and then included in candidate blocks. After confirmation, they settle and become part
          of canonical chain history. Sonar consumes these streams, normalizes them across chains, enriches
          them with token metadata and USD value, and classifies side so you can see meaningful signals instead
          of raw noise.
        </p>
        <h2 id="latency">Latency vs. accuracy</h2>
        <p>
          There’s a trade‑off between speed and finality. We surface events quickly and reconcile as blocks
          finalize, ensuring your tables display the latest state while remaining trustworthy. For traders, the
          win is recency without giving up reliability.
        </p>
        <h2 id="watch">What to watch on Sonar</h2>
        <ul>
          <li>24h net flow by token (directional bias)</li>
          <li>Unique whales (breadth of participation)</li>
          <li>Chain split (cross‑chain rotations that foreshadow bridges and liquidity shifts)</li>
        </ul>
        <p>
          Combine these metrics with recent trades to validate if the flow regime is broad‑based or carried by
          a small set of wallets. That context informs whether to hold, add, or fade.
        </p>
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--secondary)', paddingTop: '1rem' }}>
          <strong>Quick links:</strong> <a href="#latency">Latency</a> · <a href="#watch">What to watch</a>
        </div>
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
    <main className="container" style={{ padding: '2rem', maxWidth: 840 }}>
      <article>
        <h1>{post.title}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{post.description}</p>
        <div style={{ display: 'flex', gap: '0.75rem', margin: '0.5rem 0 1rem' }}>
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent('https://www.sonartracker.io/blog/' + params.slug)}`} target="_blank" rel="noopener noreferrer">Share on X</a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://www.sonartracker.io/blog/' + params.slug)}`} target="_blank" rel="noopener noreferrer">Share on LinkedIn</a>
        </div>
        <nav style={{ background: 'var(--background-card)', border: '1px solid var(--secondary)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <strong>On this page:</strong> <a href="#why">Why</a> · <a href="#how">How</a> · <a href="#use">Use cases</a>
        </nav>
        <div>{post.body}</div>
      </article>
    </main>
  )
} 