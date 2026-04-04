export const metadata = {
  title: 'Ethereum Whale Tracker — Real-Time ETH Whale Alerts | Sonar Tracker',
  description: 'Track Ethereum whale transactions in real-time. Monitor staking flows, DeFi interactions, and exchange deposits. AI-powered ETH whale intelligence from $7.99/mo.',
  keywords: 'ethereum whale tracker, eth whale tracker, ethereum whale alerts, track ethereum whales, eth whale movements, ethereum whale transactions',
  alternates: { canonical: 'https://www.sonartracker.io/ethereum-whale-tracker' },
  openGraph: {
    title: 'Ethereum Whale Tracker — Real-Time ETH Whale Alerts | Sonar Tracker',
    description: 'Track Ethereum whale transactions in real-time. AI-powered ETH whale intelligence from $7.99/mo.',
    url: 'https://www.sonartracker.io/ethereum-whale-tracker',
    type: 'website',
    images: [{ url: '/screenshots/stats-dashboard.png', width: 1200, height: 630, alt: 'Sonar Tracker Ethereum Whale Dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ethereum Whale Tracker — Real-Time ETH Whale Alerts',
    description: 'Track large ETH transactions in real-time. AI-powered whale intelligence.',
    images: ['/screenshots/stats-dashboard.png'],
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is an Ethereum whale tracker?', acceptedAnswer: { '@type': 'Answer', text: 'An Ethereum whale tracker monitors large ETH and ERC-20 token transactions on the Ethereum blockchain. It tracks staking flows, DeFi interactions, exchange deposits, and wallet-to-wallet transfers from addresses holding significant value.' } },
    { '@type': 'Question', name: 'How do ETH staking withdrawals signal whale selling?', acceptedAnswer: { '@type': 'Answer', text: 'When large validators initiate ETH unstaking, the tokens enter a withdrawal queue lasting 1-14 days. Once liquid, if the ETH moves to an exchange, selling is likely imminent. This gives you a predictive window of days — Sonar Tracker monitors both the queue and post-withdrawal movements.' } },
    { '@type': 'Question', name: 'Does Sonar Tracker cover ERC-20 tokens?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Sonar monitors all major ERC-20 tokens alongside native ETH. This includes UNI, LINK, AAVE, MATIC, and hundreds of other Ethereum-based tokens. Whale transactions for any ERC-20 above $10,000 are tracked and classified.' } },
    { '@type': 'Question', name: 'Can I track Ethereum DeFi whale activity?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Sonar Tracker classifies whale interactions with DeFi protocols like Aave, Uniswap, Lido, and Eigenlayer. You can see when whales are borrowing against ETH collateral (leveraging up), withdrawing collateral (deleveraging), or moving between staking protocols.' } },
    { '@type': 'Question', name: 'Which ETH whale signals are most reliable?', acceptedAnswer: { '@type': 'Answer', text: 'Exchange flow direction is the most reliable ETH whale signal. Sustained outflows (5+ days) are strongly bullish. Sudden inflow spikes are reliably bearish. Staking queue events are also high-confidence signals due to their built-in time delays.' } },
  ]
}

export default function EthereumWhaleTrackerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ minHeight: '100vh', background: '#0a1621', color: '#e8edf2', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '8rem 2rem 4rem' }}>
          {/* Hero */}
          <p style={{ color: '#627EEA', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1rem' }}>Ethereum Whale Intelligence</p>
          <h1 style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.5rem', background: 'linear-gradient(135deg, #627EEA, #36a6ba)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Track Ethereum Whale Movements in Real Time
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#8a9bb0', lineHeight: 1.7, marginBottom: '2rem', maxWidth: '700px' }}>
            Monitor large ETH transactions, staking flows, and DeFi whale interactions across the Ethereum ecosystem. ORCA AI interprets every major move so you don&apos;t have to read Etherscan.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '4rem', flexWrap: 'wrap' }}>
            <a href="/subscribe" style={{ display: 'inline-block', padding: '0.9rem 2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #627EEA, #36a6ba)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>Track ETH Whales — $7.99/mo</a>
            <a href="/dashboard" style={{ display: 'inline-block', padding: '0.9rem 2rem', borderRadius: '8px', border: '1px solid rgba(98,126,234,0.3)', color: '#627EEA', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>View Live Dashboard</a>
          </div>

          {/* Features */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>Ethereum Whale Tracking Features</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
            {[
              { title: 'ETH & ERC-20 Tracking', desc: 'Every whale transaction over $10K for native ETH and all major ERC-20 tokens. Classified as BUY, SELL, TRANSFER, or DEFI using AI.' },
              { title: 'Staking Flow Analysis', desc: 'Monitor the Ethereum staking withdrawal queue. See when large validators unstake — a leading indicator of potential selling days in advance.' },
              { title: 'DeFi Whale Intelligence', desc: 'Track whale interactions with Aave, Uniswap, Lido, Eigenlayer, and more. Know when whales are leveraging up or deleveraging.' },
              { title: 'ORCA AI for Ethereum', desc: 'Ask ORCA about ETH whale behavior. Get context on ICO wallets, foundation sells, institutional movements, and DeFi protocol flows.' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(13,33,52,0.6)', border: '1px solid rgba(98,126,234,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#627EEA', marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.9rem', color: '#8a9bb0', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Why ETH */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>Why Track Ethereum Whales?</h2>
          <div style={{ background: 'rgba(13,33,52,0.6)', border: '1px solid rgba(98,126,234,0.15)', borderRadius: '12px', padding: '2rem', marginBottom: '4rem', lineHeight: 1.8, color: '#8a9bb0' }}>
            <p style={{ marginBottom: '1rem' }}>Ethereum has the most developed whale tracking ecosystem in crypto:</p>
            <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#e8edf2' }}>Most labeled wallets</strong> — ETH has more identified whale wallets than any chain: ICO participants, foundations, institutional funds, and ETF issuers.</li>
              <li style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#e8edf2' }}>Staking as a leading indicator</strong> — unstaking queue data gives you 1-14 days advance warning of potential selling. No other chain offers this signal.</li>
              <li style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#e8edf2' }}>Deepest DeFi ecosystem</strong> — whale interactions with Aave, Uniswap, Lido, and Eigenlayer reveal leveraging, deleveraging, and strategic repositioning.</li>
              <li style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#e8edf2' }}>ETF flow transparency</strong> — spot ETH ETF custodial wallets (BlackRock, Fidelity) show institutional demand in real time on-chain.</li>
            </ul>
          </div>

          {/* Blog link */}
          <div style={{ background: 'rgba(98,126,234,0.08)', border: '1px solid rgba(98,126,234,0.2)', borderRadius: '12px', padding: '2rem', marginBottom: '4rem', textAlign: 'center' }}>
            <p style={{ color: '#e8edf2', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Want to learn more?</p>
            <p style={{ color: '#8a9bb0', fontSize: '0.95rem', marginBottom: '1rem' }}>Read our complete guide to Ethereum whale tracking — staking flows, DeFi signals, and top wallets to watch.</p>
            <a href="/blog/ethereum-whale-tracker" style={{ color: '#627EEA', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>Read the Full Ethereum Whale Tracking Guide →</a>
          </div>

          {/* FAQ */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>Frequently Asked Questions</h2>
          <div style={{ marginBottom: '4rem' }}>
            {faqSchema.mainEntity.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid rgba(98,126,234,0.1)', padding: '1.25rem 0' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#e8edf2', marginBottom: '0.5rem' }}>{faq.name}</h3>
                <p style={{ fontSize: '0.9rem', color: '#8a9bb0', lineHeight: 1.6, margin: 0 }}>{faq.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1rem' }}>Start tracking Ethereum whales today.</h2>
            <p style={{ color: '#8a9bb0', fontSize: '1.1rem', marginBottom: '2rem' }}>See staking flows, DeFi interactions, and exchange deposits before prices react.</p>
            <a href="/subscribe" style={{ display: 'inline-block', padding: '1rem 2.5rem', borderRadius: '8px', background: 'linear-gradient(135deg, #627EEA, #36a6ba)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '1.1rem' }}>Start Tracking — Free</a>
          </div>
        </div>
      </div>
    </>
  )
}
