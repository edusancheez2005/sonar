export const metadata = {
  title: { absolute: 'Best Free Whale Tracker — Track Crypto Whales Free | Sonar Tracker' },
  description: "Looking for the best free whale tracker? Sonar Tracker's free tier shows real-time crypto whale transactions across 10+ blockchains — no card required. Pro from $7.99/mo.",
  alternates: { canonical: 'https://www.sonartracker.io/best-free-whale-tracker' },
  openGraph: {
    title: 'Best Free Whale Tracker — Track Crypto Whales Free',
    description: "Sonar Tracker's free tier shows real-time crypto whale transactions across 10+ blockchains. No credit card required.",
    url: 'https://www.sonartracker.io/best-free-whale-tracker',
    type: 'website',
    images: [{ url: '/screenshots/stats-dashboard.png', width: 1200, height: 630, alt: 'Sonar Tracker free whale tracking dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Free Whale Tracker — Track Crypto Whales Free',
    description: 'Real-time crypto whale transactions across 10+ blockchains. Free tier, no card required.',
    images: ['/screenshots/stats-dashboard.png'],
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Is there a free whale tracker for crypto?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Sonar Tracker offers a free tier that shows real-time crypto whale transactions across 10+ blockchains, plus market statistics, a news feed, and a market pulse — with no credit card required. Sonar provides descriptive on-chain data for informational purposes, not financial advice.' } },
    { '@type': 'Question', name: 'What should a good free whale tracker include?', acceptedAnswer: { '@type': 'Answer', text: 'Look for real-time (or near real-time) updates, coverage across multiple blockchains, clear classification of transactions (buy, sell, transfer, DeFi), the ability to filter by token and USD size, and no paywall on the core feed. Sonar Tracker covers each of these on its free tier.' } },
    { '@type': 'Question', name: 'Do I need an account to track whales for free?', acceptedAnswer: { '@type': 'Answer', text: 'You can browse public pages — statistics, news, and the whale feed — without an account. Creating a free account adds a personalised dashboard, a watchlist, and saved filters. The core analytics stay free.' } },
    { '@type': 'Question', name: 'How is the free tier different from Sonar Pro?', acceptedAnswer: { '@type': 'Answer', text: 'The free tier covers the live whale feed, statistics, news, and market pulse. Sonar Pro ($7.99/month) adds custom real-time whale alerts, unlimited ORCA AI research conversations, CSV export, and full transaction history. You can use the free tier indefinitely.' } },
    { '@type': 'Question', name: 'Which blockchains can I track for free?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar Tracker covers whale activity across Ethereum, Bitcoin, Solana, BNB Smart Chain, Polygon, Avalanche, Arbitrum, Optimism, Tron, and other major networks — more than 10 chains in total.' } },
  ],
}

const link = { color: '#36a6ba', textDecoration: 'none', fontWeight: 600 }
const card = { padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(54,166,186,0.18)', background: 'rgba(54,166,186,0.04)' }

export default function BestFreeWhaleTrackerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ minHeight: '100vh', background: '#0a1621', color: '#e8edf2', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '8rem 2rem 4rem' }}>
          <p style={{ color: '#36a6ba', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1rem' }}>Free Whale Tracking</p>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.5rem', background: 'linear-gradient(135deg, #36a6ba, #5dd5ed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            The Best Free Whale Tracker for Crypto
          </h1>

          {/* Front-loaded answer for featured snippets / AI citation */}
          <p style={{ fontSize: '1.25rem', color: '#c2cfdb', lineHeight: 1.7, marginBottom: '2rem', maxWidth: '760px' }}>
            The best free whale tracker shows real-time, multi-chain whale transactions with clear buy/sell context and no paywall on the basics. <strong style={{ color: '#e8edf2' }}>Sonar Tracker&apos;s free tier</strong> does exactly that: live whale movements across 10+ blockchains, market statistics, and a news feed — free, with no credit card required. Informational only — not financial advice.
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '4rem', flexWrap: 'wrap' }}>
            <a href="/statistics" style={{ display: 'inline-block', padding: '0.9rem 2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #36a6ba, #2d8a9a)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>Start Tracking Free</a>
            <a href="/subscribe" style={{ display: 'inline-block', padding: '0.9rem 2rem', borderRadius: '8px', border: '1px solid rgba(54,166,186,0.3)', color: '#36a6ba', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>Compare Free vs Pro</a>
          </div>

          <h2 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '1rem' }}>What makes a whale tracker genuinely free?</h2>
          <p style={{ color: '#8a9bb0', lineHeight: 1.7, marginBottom: '1rem' }}>
            &quot;Free&quot; should mean the core feed is usable without a card or trial clock. When you evaluate a free whale tracker, check that it offers:
          </p>
          <ul style={{ color: '#c2cfdb', lineHeight: 1.8, marginBottom: '3rem', paddingLeft: '1.25rem' }}>
            <li><strong>Real-time or near real-time updates</strong> — stale data is worthless for whale watching.</li>
            <li><strong>Multi-chain coverage</strong> — whales move across Ethereum, Bitcoin, Solana and more.</li>
            <li><strong>Transaction context</strong> — buy / sell / transfer / DeFi classification, not just raw hashes.</li>
            <li><strong>Useful filters</strong> — by token, USD size, and chain.</li>
            <li><strong>No paywall on the basics</strong> — the live feed stays free.</li>
          </ul>

          <h2 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '1.5rem' }}>What you get with Sonar&apos;s free tier</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
            <div style={card}><h3 style={{ marginBottom: '0.5rem', fontSize: '1.05rem' }}>Live whale feed</h3><p style={{ color: '#8a9bb0', lineHeight: 1.6, margin: 0 }}>Every transaction over $10K across 10+ chains, classified by type.</p></div>
            <div style={card}><h3 style={{ marginBottom: '0.5rem', fontSize: '1.05rem' }}>Market statistics</h3><p style={{ color: '#8a9bb0', lineHeight: 1.6, margin: 0 }}>Token leaderboards, net flows, and 24h/7d activity at a glance.</p></div>
            <div style={card}><h3 style={{ marginBottom: '0.5rem', fontSize: '1.05rem' }}>News &amp; market pulse</h3><p style={{ color: '#8a9bb0', lineHeight: 1.6, margin: 0 }}>Curated crypto news with on-chain context, updated through the day.</p></div>
          </div>

          <h2 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '1rem' }}>When it&apos;s worth upgrading to Pro</h2>
          <p style={{ color: '#8a9bb0', lineHeight: 1.7, marginBottom: '3rem' }}>
            The free tier is enough to watch the market. <a href="/subscribe" style={link}>Sonar Pro</a> ($7.99/month) adds custom real-time whale alerts, unlimited <a href="/ai-advisor" style={link}>ORCA AI</a> research conversations, CSV export, and full transaction history — for when you want to act on what you see, not just watch it.
          </p>

          <h2 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '1rem' }}>Track whales by chain</h2>
          <p style={{ color: '#8a9bb0', lineHeight: 1.7, marginBottom: '1rem' }}>
            Start with a single chain or watch them all:
          </p>
          <ul style={{ color: '#c2cfdb', lineHeight: 1.9, marginBottom: '3rem', paddingLeft: '1.25rem' }}>
            <li><a href="/bitcoin-whale-tracker" style={link}>Bitcoin whale tracker</a> — BTC exchange flows and dormant-wallet moves.</li>
            <li><a href="/ethereum-whale-tracker" style={link}>Ethereum whale tracker</a> — ETH staking flows and DeFi whale activity.</li>
            <li><a href="/solana-whale-tracker" style={link}>Solana whale tracker</a> — fast SOL moves and memecoin whales.</li>
            <li><a href="/whale-tracker" style={link}>All-chain whale tracker</a> — the full real-time feed across 10+ networks.</li>
            <li><a href="/chains" style={link}>All supported chains</a> — the full directory of networks Sonar tracks.</li>
          </ul>

          <h2 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '1.5rem' }}>Frequently asked questions</h2>
          {faqSchema.mainEntity.map((q) => (
            <div key={q.name} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e8edf2', marginBottom: '0.4rem' }}>{q.name}</h3>
              <p style={{ color: '#8a9bb0', lineHeight: 1.7, margin: 0 }}>{q.acceptedAnswer.text}</p>
            </div>
          ))}

          <div style={{ marginTop: '3rem', padding: '2rem', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(54,166,186,0.12), rgba(54,166,186,0.04))', border: '1px solid rgba(54,166,186,0.2)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Start tracking whales for free</h2>
            <p style={{ color: '#8a9bb0', lineHeight: 1.7, marginBottom: '1.25rem' }}>No credit card. Browse the live whale feed and market statistics in seconds.</p>
            <a href="/statistics" style={{ display: 'inline-block', padding: '0.9rem 2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #36a6ba, #2d8a9a)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>Open the free whale tracker</a>
          </div>
        </div>
      </div>
    </>
  )
}
