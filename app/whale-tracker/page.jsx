export const metadata = {
  title: 'Real-Time Crypto Whale Tracker — Sonar',
  description: 'Track crypto whale transactions in real-time across Ethereum, Bitcoin, and 10+ blockchains. Sub-second alerts and AI on-chain analysis for $7.99/mo. Informational only — not financial advice.',
  keywords: 'crypto whale tracker, whale wallet tracker, real time whale alerts, whale transaction tracker, crypto whale tracking platform, live whale tracking',
  alternates: { canonical: 'https://www.sonartracker.io/whale-tracker' },
  openGraph: {
    title: 'Real-Time Crypto Whale Tracker — Sonar Tracker',
    description: 'Track crypto whale transactions in real-time. Sub-second alerts and AI on-chain analysis.',
    url: 'https://www.sonartracker.io/whale-tracker',
    type: 'website',
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is a crypto whale tracker?', acceptedAnswer: { '@type': 'Answer', text: 'A crypto whale tracker monitors large cryptocurrency transactions (typically over $10,000) across blockchains in real-time. Sonar surfaces descriptive on-chain data; past patterns do not guarantee future price movements.' } },
    { '@type': 'Question', name: 'How does Sonar Tracker detect whale transactions?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar monitors on-chain data across Ethereum, Bitcoin, Tron, Polygon, Avalanche, and other major blockchains. Our system classifies transactions as BUY, SELL, TRANSFER, or DEFI using AI pattern recognition and updates every 15 minutes.' } },
    { '@type': 'Question', name: 'Is Sonar Tracker free?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar offers a free tier with access to news, basic statistics, and market pulse. The Pro plan at $7.99/month unlocks real-time whale tracking, AI-powered signals, custom alerts, CSV export, and full transaction history.' } },
    { '@type': 'Question', name: 'How is Sonar different from Whale Alert?', acceptedAnswer: { '@type': 'Answer', text: 'Whale Alert shows raw transaction data. Sonar adds destination-type classification (exchange-inflow vs outflow vs transfer), wallet activity scores, and AI-powered context via ORCA 2.0. Sonar provides data analysis, not trading recommendations.' } },
    { '@type': 'Question', name: 'Can whale tracking help with market awareness?', acceptedAnswer: { '@type': 'Answer', text: 'Whale transaction data provides additional context about market activity. Large transactions may precede price movements, though this is not guaranteed. Sonar provides data and analytics for informational purposes — it does not constitute financial advice or trading recommendations.' } },
    { '@type': 'Question', name: 'What blockchains does Sonar track?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar tracks whale activity across Ethereum, Bitcoin, Tron, Ripple, Binance Smart Chain, Polygon, Avalanche, Arbitrum, Optimism, and other major networks.' } },
  ]
}

export default function WhaleTrackerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ minHeight: '100vh', background: '#0a1621', color: '#e8edf2', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '8rem 2rem 4rem' }}>
          {/* Hero */}
          <p style={{ color: '#36a6ba', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1rem' }}>Whale Intelligence Platform</p>
          <h1 style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.5rem', background: 'linear-gradient(135deg, #36a6ba, #5dd5ed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Real-Time Crypto Whale Tracker
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#8a9bb0', lineHeight: 1.7, marginBottom: '2rem', maxWidth: '700px' }}>
            Monitor every major crypto wallet in real-time across 10+ blockchains. See where large holders are moving funds. AI summarises the on-chain context. Informational only — not financial advice.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '4rem', flexWrap: 'wrap' }}>
            <a href="/subscribe" style={{ display: 'inline-block', padding: '0.9rem 2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #36a6ba, #2d8a9a)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>Start Tracking Whales — $7.99/mo</a>
            <a href="/statistics" style={{ display: 'inline-block', padding: '0.9rem 2rem', borderRadius: '8px', border: '1px solid rgba(54,166,186,0.3)', color: '#36a6ba', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>Try Free Version</a>
          </div>

          {/* What You Get */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>What You Get</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
            {[
              { title: 'Live Whale Transactions', desc: 'Every transaction over $10K across Ethereum, Bitcoin, Tron, Polygon, Avalanche, BSC, Arbitrum, and more. Updated every 15 minutes.' },
              { title: 'AI Destination Classification', desc: 'Each transaction is labelled by destination type (exchange-inflow, exchange-outflow, transfer, DeFi) using machine learning trained on millions of historical whale moves. Factual classification, not trading instructions.' },
              { title: 'ORCA AI Analysis', desc: 'Ask our AI analysis tool about any token. ORCA summarises whale flows, sentiment, news, and price data in plain English. Informational only.' },
              { title: 'Custom Alerts', desc: 'Set thresholds by token, chain, or USD value. Get notified when whales make moves that match your criteria.' },
              { title: 'Whale Leaderboard', desc: 'See the most active whale wallets ranked by net flow, transaction count, and volume. Track 70,000+ identified wallets.' },
              { title: 'Token Heatmaps & Export', desc: 'Visualize whale activity with heatmaps. Export any data to CSV for your own analysis.' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(13,33,52,0.6)', border: '1px solid rgba(54,166,186,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#36a6ba', marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.9rem', color: '#8a9bb0', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Comparison */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>How Sonar Compares</h2>
          <div style={{ overflowX: 'auto', marginBottom: '4rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(54,166,186,0.3)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#8a9bb0' }}>Feature</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', color: '#36a6ba', fontWeight: 700 }}>Sonar Tracker</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', color: '#8a9bb0' }}>Nansen</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', color: '#8a9bb0' }}>Arkham</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', color: '#8a9bb0' }}>Whale Alert</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Real-time whale tracking', 'Yes', 'Yes', 'Yes', 'Yes'],
                  ['AI inflow/outflow classification', 'Yes', 'No', 'No', 'No'],
                  ['AI analysis tool (ORCA)', 'Yes', 'No', 'No', 'No'],
                  ['Custom alerts', 'Yes', 'Yes', 'Limited', 'Limited'],
                  ['Sentiment analysis', 'Yes', 'No', 'No', 'No'],
                  ['CSV export', 'Yes', 'Yes', 'No', 'No'],
                  ['News intelligence', 'Yes', 'No', 'No', 'No'],
                  ['Price/month', '$7.99', '$150+', 'Free+', 'Free+'],
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(54,166,186,0.08)' }}>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#e8edf2' }}>{row[0]}</td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#2ecc71', fontWeight: 600 }}>{row[1]}</td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#8a9bb0' }}>{row[2]}</td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#8a9bb0' }}>{row[3]}</td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#8a9bb0' }}>{row[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FAQ */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>Frequently Asked Questions</h2>
          <div style={{ marginBottom: '4rem' }}>
            {faqSchema.mainEntity.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid rgba(54,166,186,0.1)', padding: '1.25rem 0' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#e8edf2', marginBottom: '0.5rem' }}>{faq.name}</h3>
                <p style={{ fontSize: '0.9rem', color: '#8a9bb0', lineHeight: 1.6, margin: 0 }}>{faq.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>

          {/* Final CTA */}
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1rem' }}>See the on-chain data.</h2>
            <p style={{ color: '#8a9bb0', fontSize: '1.1rem', marginBottom: '2rem' }}>Join 700+ users who follow whale movements through Sonar. Informational only.</p>
            <a href="/subscribe" style={{ display: 'inline-block', padding: '1rem 2.5rem', borderRadius: '8px', background: 'linear-gradient(135deg, #36a6ba, #2d8a9a)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '1.1rem' }}>Start Tracking Whales — Free</a>
          </div>
        </div>
      </div>
    </>
  )
}
