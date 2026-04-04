export const metadata = {
  title: 'Bitcoin Whale Tracker — Real-Time BTC Whale Alerts | Sonar Tracker',
  description: 'Track Bitcoin whale transactions in real-time. Monitor exchange flows, miner activity, and dormant wallet movements. AI-powered BTC whale intelligence from $7.99/mo.',
  keywords: 'bitcoin whale tracker, btc whale tracker, bitcoin whale alerts, track bitcoin whales, btc whale movements, bitcoin whale transactions',
  alternates: { canonical: 'https://www.sonartracker.io/bitcoin-whale-tracker' },
  openGraph: {
    title: 'Bitcoin Whale Tracker — Real-Time BTC Whale Alerts | Sonar Tracker',
    description: 'Track Bitcoin whale transactions in real-time. AI-powered BTC whale intelligence from $7.99/mo.',
    url: 'https://www.sonartracker.io/bitcoin-whale-tracker',
    type: 'website',
    images: [{ url: '/screenshots/stats-dashboard.png', width: 1200, height: 630, alt: 'Sonar Tracker Bitcoin Whale Dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bitcoin Whale Tracker — Real-Time BTC Whale Alerts',
    description: 'Track large BTC transactions in real-time. AI-powered whale intelligence.',
    images: ['/screenshots/stats-dashboard.png'],
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is a Bitcoin whale tracker?', acceptedAnswer: { '@type': 'Answer', text: 'A Bitcoin whale tracker monitors large BTC transactions on the Bitcoin blockchain in real-time. It identifies when major holders, miners, exchanges, and institutional wallets are moving Bitcoin — movements that historically precede significant BTC price changes.' } },
    { '@type': 'Question', name: 'Why is Bitcoin whale tracking different from other chains?', acceptedAnswer: { '@type': 'Answer', text: 'Bitcoin uses a UTXO (Unspent Transaction Output) model instead of accounts. This means one entity can control hundreds of addresses, making tracking more complex. Coin age analysis (how long BTC has been dormant) is a unique and powerful signal only available on Bitcoin.' } },
    { '@type': 'Question', name: 'What are the most reliable Bitcoin whale signals?', acceptedAnswer: { '@type': 'Answer', text: 'Exchange flow direction is the most reliable. Sustained BTC outflows from exchanges (5+ days) are strongly bullish — holders are moving to self-custody. Sudden inflow spikes are reliably bearish. Miner selling patterns and dormant wallet movements are also high-conviction signals.' } },
    { '@type': 'Question', name: 'Can I track Bitcoin miner wallet activity?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Sonar Tracker monitors miner wallet outflows to exchanges. Post-halving periods often see elevated miner selling as less-efficient operations wind down. Tracking miner capitulation events has historically helped identify local price bottoms.' } },
    { '@type': 'Question', name: 'What happens when a dormant Bitcoin wallet moves?', acceptedAnswer: { '@type': 'Answer', text: 'When a long-dormant BTC wallet (5+ years inactive) suddenly transfers Bitcoin, the market often overreacts on sentiment alone. The actual impact depends on whether the BTC moves to an exchange (sell signal) or to a new cold wallet (reorganization). ORCA AI helps distinguish the intent.' } },
  ]
}

export default function BitcoinWhaleTrackerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ minHeight: '100vh', background: '#0a1621', color: '#e8edf2', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '8rem 2rem 4rem' }}>
          {/* Hero */}
          <p style={{ color: '#F7931A', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1rem' }}>Bitcoin Whale Intelligence</p>
          <h1 style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.5rem', background: 'linear-gradient(135deg, #F7931A, #FFD93D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Track Bitcoin Whale Movements in Real Time
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#8a9bb0', lineHeight: 1.7, marginBottom: '2rem', maxWidth: '700px' }}>
            Monitor large BTC transactions, exchange flows, miner activity, and dormant wallet movements. ORCA AI explains what each whale move means for Bitcoin price.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '4rem', flexWrap: 'wrap' }}>
            <a href="/subscribe" style={{ display: 'inline-block', padding: '0.9rem 2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #F7931A, #FFD93D)', color: '#0a1621', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>Track BTC Whales — $7.99/mo</a>
            <a href="/dashboard" style={{ display: 'inline-block', padding: '0.9rem 2rem', borderRadius: '8px', border: '1px solid rgba(247,147,26,0.3)', color: '#F7931A', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>View Live Dashboard</a>
          </div>

          {/* Features */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>Bitcoin Whale Tracking Features</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
            {[
              { title: 'Exchange Flow Monitoring', desc: 'Track BTC flowing in and out of all major exchanges. Net exchange outflows are the most reliable bullish signal in crypto. Inflow spikes signal imminent selling.' },
              { title: 'Miner Activity Tracking', desc: 'Monitor miner wallet outflows to exchanges. Post-halving miner capitulation events historically mark local price bottoms — catch them in real time.' },
              { title: 'Dormant Wallet Alerts', desc: 'Get notified when long-dormant Bitcoin wallets (5+ years inactive) suddenly move BTC. ORCA AI distinguishes between reorganization and sell-intent.' },
              { title: 'ORCA AI for Bitcoin', desc: 'Ask ORCA about BTC-specific whale behavior: exchange reserves, miner selling rates, government wallet movements, and UTXO age distribution signals.' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(13,33,52,0.6)', border: '1px solid rgba(247,147,26,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F7931A', marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.9rem', color: '#8a9bb0', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Why BTC */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>Why Track Bitcoin Whales?</h2>
          <div style={{ background: 'rgba(13,33,52,0.6)', border: '1px solid rgba(247,147,26,0.15)', borderRadius: '12px', padding: '2rem', marginBottom: '4rem', lineHeight: 1.8, color: '#8a9bb0' }}>
            <p style={{ marginBottom: '1rem' }}>Bitcoin whale tracking has the longest proven track record of any on-chain signal:</p>
            <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#e8edf2' }}>Most market-moving whale activity</strong> — a single large BTC transfer can move billions in market cap within hours. Government liquidations, institutional buys, and dormant wallet movements generate outsized price reactions.</li>
              <li style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#e8edf2' }}>Exchange reserves at historic lows</strong> — BTC continuously leaving exchanges signals a supply squeeze. This metric has preceded every major Bitcoin rally in the past 5 years.</li>
              <li style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#e8edf2' }}>Miner behavior as a cycle indicator</strong> — post-halving miner capitulation (high selling + hashrate drops) marks local bottoms. Miner accumulation signals the start of bull phases.</li>
              <li style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#e8edf2' }}>Coin age analysis</strong> — Bitcoin&apos;s UTXO model uniquely allows tracking how long coins have been dormant. Old coins moving is a high-conviction signal.</li>
            </ul>
          </div>

          {/* Blog link */}
          <div style={{ background: 'rgba(247,147,26,0.08)', border: '1px solid rgba(247,147,26,0.2)', borderRadius: '12px', padding: '2rem', marginBottom: '4rem', textAlign: 'center' }}>
            <p style={{ color: '#e8edf2', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Want to learn more?</p>
            <p style={{ color: '#8a9bb0', fontSize: '0.95rem', marginBottom: '1rem' }}>Read our complete guide to Bitcoin whale tracking — UTXO analysis, exchange flows, and historical examples.</p>
            <a href="/blog/bitcoin-whale-tracker" style={{ color: '#F7931A', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>Read the Full Bitcoin Whale Tracking Guide →</a>
          </div>

          {/* FAQ */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>Frequently Asked Questions</h2>
          <div style={{ marginBottom: '4rem' }}>
            {faqSchema.mainEntity.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid rgba(247,147,26,0.1)', padding: '1.25rem 0' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#e8edf2', marginBottom: '0.5rem' }}>{faq.name}</h3>
                <p style={{ fontSize: '0.9rem', color: '#8a9bb0', lineHeight: 1.6, margin: 0 }}>{faq.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1rem' }}>Start tracking Bitcoin whales today.</h2>
            <p style={{ color: '#8a9bb0', fontSize: '1.1rem', marginBottom: '2rem' }}>See exchange flows, miner activity, and dormant wallet movements before prices react.</p>
            <a href="/subscribe" style={{ display: 'inline-block', padding: '1rem 2.5rem', borderRadius: '8px', background: 'linear-gradient(135deg, #F7931A, #FFD93D)', color: '#0a1621', fontWeight: 700, textDecoration: 'none', fontSize: '1.1rem' }}>Start Tracking — Free</a>
          </div>
        </div>
      </div>
    </>
  )
}
