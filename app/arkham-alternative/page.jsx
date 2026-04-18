export const metadata = {
  title: 'Arkham Intelligence Alternative 2026 — Affordable On-Chain Analytics',
  description: 'Looking for an Arkham Intelligence alternative? Sonar Tracker offers whale tracking, AI signals, and on-chain analytics at $7.99/mo vs Arkham\'s $300+/mo.',
  keywords: 'arkham alternative, arkham intelligence alternative, arkham alternative free, on chain analytics alternative, whale tracking tool',
  alternates: { canonical: 'https://www.sonartracker.io/arkham-alternative' },
  openGraph: {
    title: 'Arkham Intelligence Alternative 2026 — Sonar Tracker',
    description: 'Whale tracking and on-chain analytics at $7.99/mo. AI-powered analysis included.',
    url: 'https://www.sonartracker.io/arkham-alternative',
    type: 'website',
  },
}

function ComparisonSchema() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Arkham Intelligence Alternative — Sonar Tracker',
    description: 'Feature comparison between Arkham Intelligence and Sonar Tracker for crypto whale tracking.',
    url: 'https://www.sonartracker.io/arkham-alternative',
    mainEntity: {
      '@type': 'SoftwareApplication',
      name: 'Sonar Tracker',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '7.99', priceCurrency: 'USD' },
    },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
}

export default function ArkhamAlternativePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a1621', color: '#e8edf2', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <ComparisonSchema />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '8rem 2rem 4rem' }}>
        <p style={{ color: '#36a6ba', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1rem' }}>Arkham Intelligence Alternative</p>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.5rem', background: 'linear-gradient(135deg, #36a6ba, #5dd5ed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          The Best Arkham Intelligence Alternative for 2026
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#8a9bb0', lineHeight: 1.7, marginBottom: '1rem', maxWidth: '700px' }}>
          Arkham Intelligence is a powerful on-chain analytics platform. Sonar Tracker provides similar whale tracking and AI-powered analysis for <strong style={{ color: '#2ecc71' }}>$7.99/month</strong> with a completely free tier.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '4rem', marginTop: '2rem' }}>
          <div style={{ background: 'rgba(231,76,60,0.05)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ color: '#e74c3c', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Arkham Intelligence</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#e74c3c' }}>$300+<span style={{ fontSize: '1rem', color: '#8a9bb0' }}>/mo</span></div>
            <p style={{ color: '#8a9bb0', fontSize: '0.85rem', marginTop: '0.5rem' }}>Professional plan pricing</p>
          </div>
          <div style={{ background: 'rgba(46,204,113,0.05)', border: '2px solid rgba(46,204,113,0.3)', borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ color: '#2ecc71', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Sonar Tracker</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2ecc71' }}>$7.99<span style={{ fontSize: '1rem', color: '#8a9bb0' }}>/mo</span></div>
            <p style={{ color: '#8a9bb0', fontSize: '0.85rem', marginTop: '0.5rem' }}>Cancel anytime. Free tier available.</p>
          </div>
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '0.75rem' }}>Feature Comparison</h2>
        <p style={{ fontSize: '0.8rem', color: '#5a6a7a', marginBottom: '1.5rem' }}>Comparison based on publicly available information as of April 2026. Features and pricing may change.</p>
        <div style={{ overflowX: 'auto', marginBottom: '4rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(54,166,186,0.3)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#8a9bb0' }}>Feature</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#8a9bb0' }}>Arkham (from $300/mo)</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#2ecc71', fontWeight: 700 }}>Sonar ($7.99/mo)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['On-chain whale tracking', 'Yes', 'Yes'],
                ['Multi-chain support', 'Yes (40+)', 'Yes (10+)'],
                ['Entity labeling', 'Yes (Arkham Intel)', 'Yes (70K+ wallets)'],
                ['Real-time alerts', 'Yes', 'Yes'],
                ['AI-powered analysis', 'Limited', 'Yes (ORCA AI)'],
                ['Portfolio tracking', 'Yes', 'Yes'],
                ['Social sentiment data', 'No', 'Built-in (LunarCrush)'],
                ['AI market narrative', 'No', 'Yes (every 4 hours)'],
                ['News aggregation', 'No', 'AI-curated + scored'],
                ['Token signals (BUY/SELL)', 'No', 'Yes (multi-factor AI)'],
                ['Custom alerts', 'Yes', 'Yes'],
                ['Free tier', 'Limited', 'Yes (full platform access)'],
                ['Monthly billing', 'Annual plans mainly', 'Yes (cancel anytime)'],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(54,166,186,0.08)' }}>
                  <td style={{ padding: '0.65rem 0.75rem', color: '#e8edf2' }}>{row[0]}</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#8a9bb0' }}>{row[1]}</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#2ecc71', fontWeight: 600 }}>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1rem' }}>Why Traders Choose Sonar</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
          {[
            { title: 'AI-Powered Signals', desc: 'ORCA AI analyzes whale flows, derivatives, sentiment, and technicals to generate actionable BUY/SELL signals with confidence scores.' },
            { title: '95% Lower Cost', desc: 'Get institutional-grade whale tracking for $7.99/mo instead of $300+. Or use the free tier with full platform access.' },
            { title: 'Real-Time Market Narrative', desc: 'AI-generated market analysis every 4 hours combining whale activity, funding rates, and sentiment shifts.' },
            { title: 'Built-in Sentiment', desc: 'Social sentiment from X/Twitter, news impact scoring, and community voting built directly into the platform.' },
          ].map((card, i) => (
            <div key={i} style={{ background: 'linear-gradient(135deg, rgba(54,166,186,0.08), rgba(26,40,56,0.6))', border: '1px solid rgba(54,166,186,0.2)', borderRadius: '16px', padding: '2rem' }}>
              <h3 style={{ color: '#36a6ba', fontSize: '1.1rem', marginBottom: '0.75rem' }}>{card.title}</h3>
              <p style={{ color: '#8a9bb0', lineHeight: 1.7, fontSize: '0.9rem' }}>{card.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(54,166,186,0.06)', border: '1px solid rgba(54,166,186,0.15)', borderRadius: '12px', padding: '1.5rem', marginBottom: '3rem' }}>
          <p style={{ color: '#8a9bb0', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: '#e8edf2' }}>Fair note:</strong> Arkham Intelligence has best-in-class entity labeling with their proprietary intelligence engine and a larger team dedicated to wallet identification. If granular entity attribution across 40+ chains is your primary need, Arkham may be the better fit. Sonar focuses on actionable signals, AI analysis, and accessibility at a fraction of the cost.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <a href="/subscribe" style={{ display: 'inline-block', padding: '1rem 2.5rem', borderRadius: '12px', background: 'linear-gradient(135deg, #36a6ba, #5dd5ed)', color: '#fff', fontSize: '1.1rem', fontWeight: 700, textDecoration: 'none' }}>Try Sonar Free</a>
          <p style={{ color: '#5a6a7a', fontSize: '0.85rem', marginTop: '1rem' }}>No credit card required. Free tier available.</p>
        </div>
      </div>
    </div>
  )
}
