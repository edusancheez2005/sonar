export const metadata = {
  title: { absolute: 'Crypto Whale Tracker by Chain — All Supported Blockchains | Sonar Tracker' },
  description: 'Track crypto whales across 10+ blockchains in one place. Dedicated real-time trackers for Bitcoin, Ethereum, and Solana, plus whale coverage on BNB Chain, Polygon, Avalanche, Arbitrum and more. Free tier; Pro $7.99/mo.',
  alternates: { canonical: 'https://www.sonartracker.io/chains' },
  openGraph: {
    title: 'Crypto Whale Tracker by Chain — All Supported Blockchains',
    description: 'Real-time whale tracking across 10+ blockchains. Dedicated trackers for Bitcoin, Ethereum, and Solana.',
    url: 'https://www.sonartracker.io/chains',
    type: 'website',
    images: [{ url: '/screenshots/stats-dashboard.png', width: 1200, height: 630, alt: 'Sonar Tracker multi-chain whale dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crypto Whale Tracker by Chain',
    description: 'Real-time whale tracking across 10+ blockchains.',
    images: ['/screenshots/stats-dashboard.png'],
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Which blockchains does Sonar Tracker support?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar Tracker monitors whale activity across more than 10 blockchains, including Bitcoin, Ethereum, Solana, BNB Smart Chain, Polygon, Avalanche, Arbitrum, Optimism, and Tron. Bitcoin, Ethereum, and Solana have dedicated tracker pages; all chains appear in the unified whale feed.' } },
    { '@type': 'Question', name: 'Can I track whales on more than one chain at once?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. The all-chain whale tracker shows large transactions across every supported network in a single feed, so you can watch cross-chain capital flows. You can also filter by a specific chain on the statistics page.' } },
    { '@type': 'Question', name: 'Is multi-chain whale tracking free?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar offers a free tier covering the live whale feed, statistics, and news across all supported chains. Sonar Pro ($7.99/month) adds custom real-time alerts, ORCA AI research, CSV export, and full history. Informational only — not financial advice.' } },
  ],
}

const link = { color: '#36a6ba', textDecoration: 'none', fontWeight: 600 }
const card = { display: 'block', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(54,166,186,0.18)', background: 'rgba(54,166,186,0.04)', textDecoration: 'none', color: 'inherit' }

const dedicated = [
  { href: '/bitcoin-whale-tracker', name: 'Bitcoin (BTC)', dot: '#F7931A', desc: 'Exchange flows, miner activity, and dormant-wallet movements that precede major BTC moves.' },
  { href: '/ethereum-whale-tracker', name: 'Ethereum (ETH)', dot: '#627EEA', desc: 'ETH staking-queue flows, ERC-20 whale transfers, and DeFi positioning across Aave, Uniswap, and Lido.' },
  { href: '/solana-whale-tracker', name: 'Solana (SOL)', dot: '#9945FF', desc: 'Sub-second SOL moves, memecoin sniper wallets, and Jupiter/Raydium DeFi whale activity.' },
]

const alsoTracked = [
  'BNB Smart Chain (BNB)', 'Polygon (MATIC)', 'Avalanche (AVAX)',
  'Arbitrum (ARB)', 'Optimism (OP)', 'Tron (TRX)', 'Ripple (XRP)',
]

export default function ChainsHubPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ minHeight: '100vh', background: '#0a1621', color: '#e8edf2', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '8rem 2rem 4rem' }}>
          <p style={{ color: '#36a6ba', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1rem' }}>Whale Tracking by Chain</p>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.5rem', background: 'linear-gradient(135deg, #36a6ba, #5dd5ed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Crypto Whale Tracker by Chain
          </h1>

          {/* Front-loaded answer */}
          <p style={{ fontSize: '1.2rem', color: '#c2cfdb', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '760px' }}>
            Sonar Tracker monitors large transactions across <strong style={{ color: '#e8edf2' }}>10+ blockchains</strong> in real time. Start with a dedicated tracker for Bitcoin, Ethereum, or Solana, or watch every network at once in the unified whale feed. Informational only — not financial advice.
          </p>

          <h2 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '1.25rem' }}>Dedicated chain trackers</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
            {dedicated.map((c) => (
              <a key={c.href} href={c.href} style={card}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
                  {c.name}
                </span>
                <span style={{ display: 'block', color: '#8a9bb0', lineHeight: 1.6 }}>{c.desc}</span>
              </a>
            ))}
          </div>

          <h2 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '1rem' }}>Also tracked in the all-chain feed</h2>
          <p style={{ color: '#8a9bb0', lineHeight: 1.7, marginBottom: '1rem' }}>
            These networks appear in the unified <a href="/whale-tracker" style={link}>real-time whale tracker</a> and on the <a href="/statistics" style={link}>statistics</a> page:
          </p>
          <ul style={{ color: '#c2cfdb', lineHeight: 1.9, marginBottom: '3rem', paddingLeft: '1.25rem', columns: 2 }}>
            {alsoTracked.map((c) => <li key={c}>{c}</li>)}
          </ul>

          <h2 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '1rem' }}>How multi-chain whale tracking works</h2>
          <p style={{ color: '#8a9bb0', lineHeight: 1.7, marginBottom: '0.75rem' }}>
            Sonar ingests large transactions (typically $10K+) on each supported chain, classifies every move as buy, sell, transfer, or DeFi, and surfaces the result in one feed. <a href="/ai-advisor" style={link}>ORCA AI</a> adds plain-English context so you don&apos;t have to read a dozen block explorers.
          </p>
          <p style={{ color: '#8a9bb0', lineHeight: 1.7, marginBottom: '3rem' }}>
            New to this? Start with the <a href="/best-free-whale-tracker" style={link}>best free whale tracker</a> guide or the <a href="/glossary/whale" style={link}>whale</a> glossary entry.
          </p>

          <h2 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '1.5rem' }}>Frequently asked questions</h2>
          {faqSchema.mainEntity.map((q) => (
            <div key={q.name} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e8edf2', marginBottom: '0.4rem' }}>{q.name}</h3>
              <p style={{ color: '#8a9bb0', lineHeight: 1.7, margin: 0 }}>{q.acceptedAnswer.text}</p>
            </div>
          ))}

          <div style={{ marginTop: '3rem', padding: '2rem', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(54,166,186,0.12), rgba(54,166,186,0.04))', border: '1px solid rgba(54,166,186,0.2)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Watch every chain in one feed</h2>
            <p style={{ color: '#8a9bb0', lineHeight: 1.7, marginBottom: '1.25rem' }}>Open the live whale tracker free — no credit card required.</p>
            <a href="/statistics" style={{ display: 'inline-block', padding: '0.9rem 2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #36a6ba, #2d8a9a)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>Open the whale tracker</a>
          </div>
        </div>
      </div>
    </>
  )
}
