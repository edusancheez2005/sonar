export const metadata = {
  title: 'AI Crypto Trading Signals — Powered by ORCA',
  description: 'Get AI-powered crypto trading signals from ORCA 2.0. Analyzes whale movements, news sentiment, and on-chain data to deliver clear buy/sell signals.',
  keywords: 'ai crypto signals, ai crypto trading, crypto prediction ai, ai crypto advisor, crypto intelligence ai, ai trading signals, orca ai crypto',
  alternates: { canonical: 'https://www.sonartracker.io/ai-crypto-signals' },
  openGraph: {
    title: 'AI Crypto Trading Signals — ORCA by Sonar Tracker',
    description: 'AI-powered crypto signals: whale analysis, sentiment scoring, and clear buy/sell recommendations.',
    url: 'https://www.sonartracker.io/ai-crypto-signals',
    type: 'website',
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is ORCA 2.0?', acceptedAnswer: { '@type': 'Answer', text: 'ORCA 2.0 is Sonar Tracker\'s AI crypto advisor trained on millions of on-chain transactions, news articles, and social sentiment data. It analyzes whale movements and market conditions to deliver clear, actionable trading insights in plain English.' } },
    { '@type': 'Question', name: 'How accurate are ORCA\'s signals?', acceptedAnswer: { '@type': 'Answer', text: 'ORCA analyzes real-time data including whale transactions, price momentum, volume patterns, and news sentiment. While no AI can predict markets with certainty, our users report significantly earlier detection of major price movements compared to traditional chart analysis.' } },
    { '@type': 'Question', name: 'What data does ORCA analyze?', acceptedAnswer: { '@type': 'Answer', text: 'ORCA processes real-time whale transactions across 10+ blockchains, AI-curated crypto news with sentiment scoring, social media signals, price and volume data from CoinGecko, and historical whale behavior patterns.' } },
    { '@type': 'Question', name: 'How much does ORCA cost?', acceptedAnswer: { '@type': 'Answer', text: 'ORCA 2.0 is included with Sonar Tracker Pro at $7.99/month. Pro users get 10 AI analysis prompts per day. No additional charges.' } },
    { '@type': 'Question', name: 'Can I ask ORCA about specific tokens?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Ask ORCA about any specific token and it will analyze current whale activity, recent price movements, sentiment from news and social media, and provide a clear assessment with supporting data.' } },
  ]
}

export default function AiCryptoSignalsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ minHeight: '100vh', background: '#0a1621', color: '#e8edf2', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '8rem 2rem 4rem' }}>
          {/* Hero */}
          <p style={{ color: '#9b59b6', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1rem' }}>AI Crypto Intelligence</p>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.5rem', background: 'linear-gradient(90deg, #9b59b6, #f1c40f, #36a6ba)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI Crypto Trading Signals
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#8a9bb0', lineHeight: 1.7, marginBottom: '1rem', maxWidth: '700px' }}>
            ORCA 2.0 analyzes whale movements, news sentiment, and on-chain data across 10+ blockchains — then tells you what it means in plain English.
          </p>
          <p style={{ fontSize: '1rem', color: '#6b7d8f', lineHeight: 1.7, marginBottom: '2.5rem' }}>
            Not a black-box bot. Not vague predictions. Clear analysis grounded in real data, delivered when you need it.
          </p>
          <a href="/subscribe" style={{ display: 'inline-block', padding: '0.9rem 2rem', borderRadius: '8px', background: 'linear-gradient(90deg, #9b59b6, #f1c40f)', color: '#0a1621', fontWeight: 700, textDecoration: 'none', fontSize: '1rem', marginBottom: '4rem' }}>Get ORCA Access — $7.99/mo</a>

          {/* How It Works */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '2rem', marginTop: '2rem' }}>How ORCA Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '4rem' }}>
            {[
              { step: '1', title: 'Data Ingestion', desc: 'ORCA processes millions of whale transactions, news articles, and social signals in real-time across all major blockchains.' },
              { step: '2', title: 'AI Analysis', desc: 'Pattern recognition, sentiment scoring, volume correlation, and whale behavior analysis run in parallel across 8 analysis phases.' },
              { step: '3', title: 'Clear Signal', desc: 'You get a plain-English explanation: what happened, why it matters, and what it could mean for price — with supporting data.' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(13,33,52,0.6)', border: '1px solid rgba(155,89,182,0.2)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(155,89,182,0.2)', border: '2px solid #9b59b6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 700, color: '#9b59b6' }}>{item.step}</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e8edf2', marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#8a9bb0', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* What ORCA Analyzes */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>What ORCA Analyzes</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '4rem' }}>
            {[
              'Real-time whale transactions across 10+ chains',
              'Buy/sell classification with confidence scores',
              'AI-curated news with market impact scoring',
              'Social sentiment from crypto communities',
              'Price momentum and volume patterns',
              'Historical whale behavior for each token',
              'Exchange inflow/outflow trends',
              'Risk and manipulation detection signals',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(13,33,52,0.4)', borderRadius: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#2ecc71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: '0.9rem', color: '#e8edf2' }}>{item}</span>
              </div>
            ))}
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

          {/* CTA */}
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1rem' }}>Trade with intelligence, not guesswork.</h2>
            <p style={{ color: '#8a9bb0', fontSize: '1.1rem', marginBottom: '2rem' }}>10 AI prompts per day. Real-time whale data. Clear signals. $7.99/month.</p>
            <a href="/subscribe" style={{ display: 'inline-block', padding: '1rem 2.5rem', borderRadius: '8px', background: 'linear-gradient(90deg, #9b59b6, #f1c40f)', color: '#0a1621', fontWeight: 700, textDecoration: 'none', fontSize: '1.1rem' }}>Start Free — Get ORCA Access</a>
          </div>
        </div>
      </div>
    </>
  )
}
