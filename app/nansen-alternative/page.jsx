export const metadata = {
  title: 'Nansen Alternative 2026 — Affordable Whale Tracking',
  description: 'Looking for a Nansen alternative? Sonar Tracker offers whale tracking and on-chain analytics at $7.99/mo. Different approach, accessible pricing.',
  keywords: 'nansen alternative, nansen alternative free, nansen alternative cheap, whale tracking alternative, on chain analytics alternative',
  alternates: { canonical: 'https://www.sonartracker.io/nansen-alternative' },
  openGraph: {
    title: 'Nansen Alternative 2026 — Sonar Tracker',
    description: 'Whale tracking and on-chain analytics at $7.99/mo. AI-powered market analysis included.',
    url: 'https://www.sonartracker.io/nansen-alternative',
    type: 'website',
  },
}

export default function NansenAlternativePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a1621', color: '#e8edf2', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '8rem 2rem 4rem' }}>
        {/* Hero */}
        <p style={{ color: '#36a6ba', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1rem' }}>Nansen Alternative</p>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.5rem', background: 'linear-gradient(135deg, #36a6ba, #5dd5ed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          The Best Nansen Alternative for 2026
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#8a9bb0', lineHeight: 1.7, marginBottom: '1rem', maxWidth: '700px' }}>
          Nansen charges $150+/month for whale tracking. Sonar Tracker delivers the same institutional-grade on-chain analytics for <strong style={{ color: '#2ecc71' }}>$7.99/month</strong> — with an AI advisor included.
        </p>
        <p style={{ fontSize: '1.1rem', color: '#6b7d8f', lineHeight: 1.7, marginBottom: '2rem' }}>
          We built Sonar because we believed retail traders deserve the same data institutions use — without the institutional price tag.
        </p>

        {/* Price Comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '4rem' }}>
          <div style={{ background: 'rgba(231,76,60,0.05)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ color: '#e74c3c', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Nansen</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#e74c3c' }}>$150+<span style={{ fontSize: '1rem', color: '#8a9bb0' }}>/mo</span></div>
            <p style={{ color: '#8a9bb0', fontSize: '0.85rem', marginTop: '0.5rem' }}>Billed annually at $1,800/yr</p>
          </div>
          <div style={{ background: 'rgba(46,204,113,0.05)', border: '2px solid rgba(46,204,113,0.3)', borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ color: '#2ecc71', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Sonar Tracker</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2ecc71' }}>$7.99<span style={{ fontSize: '1rem', color: '#8a9bb0' }}>/mo</span></div>
            <p style={{ color: '#8a9bb0', fontSize: '0.85rem', marginTop: '0.5rem' }}>Cancel anytime. No annual lock-in.</p>
          </div>
        </div>

        {/* Feature Comparison */}
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '0.75rem' }}>Feature Comparison</h2>
        <p style={{ fontSize: '0.8rem', color: '#5a6a7a', marginBottom: '1.5rem' }}>Comparison based on publicly available information as of April 2026. Features and pricing may change. We recommend verifying directly with each provider.</p>
        <div style={{ overflowX: 'auto', marginBottom: '4rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(54,166,186,0.3)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#8a9bb0' }}>Feature</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#8a9bb0' }}>Nansen (from $150/mo)</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#2ecc71', fontWeight: 700 }}>Sonar ($7.99/mo)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['On-chain whale tracking', 'Yes', 'Yes'],
                ['Multi-chain support', 'Yes (70+)', 'Yes (10+)'],
                ['Wallet labeling', 'Yes (proprietary, 300M+)', 'Yes (70K+ wallets)'],
                ['Token analytics', 'Yes', 'Yes'],
                ['AI-powered analysis', 'Yes (Nansen AI)', 'Yes (ORCA)'],
                ['Transaction classification', 'Yes', 'Yes (AI-powered)'],
                ['Social/sentiment data', 'Via partners', 'Built-in'],
                ['News aggregation', 'Limited', 'AI-curated'],
                ['Custom alerts', 'Yes', 'Yes'],
                ['CSV data export', 'Yes', 'Yes'],
                ['Free tier available', 'Limited', 'Yes (full access)'],
                ['Monthly billing option', 'Annual plans available', 'Yes (monthly, cancel anytime)'],
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

        {/* Why Switch */}
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>Why Traders Choose Sonar</h2>
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '4rem' }}>
          {[
            { title: 'Accessible pricing', desc: 'Sonar Pro costs $7.99/month with no annual commitment. Designed for individual traders and smaller teams who need whale intelligence without enterprise pricing.' },
            { title: 'AI that explains what moves mean', desc: 'ORCA analyses whale activity, derivatives data, and market sentiment — then summarises it in plain English. Ask questions, get context.' },
            { title: 'No lock-in', desc: 'Month-to-month. Try it, cancel anytime. No long-term contracts or annual fees required.' },
            { title: 'Built for accessibility', desc: 'Clean interface, straightforward analytics, fast alerts. Sonar focuses on making on-chain data understandable, not overwhelming.' },
          ].map((item, i) => (
            <div key={i} style={{ background: 'rgba(13,33,52,0.6)', border: '1px solid rgba(54,166,186,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#36a6ba', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ fontSize: '0.9rem', color: '#8a9bb0', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer instead of fake testimonial */}
        <div style={{ background: 'rgba(255,171,0,0.04)', border: '1px solid rgba(255,171,0,0.12)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '4rem', fontSize: '0.8rem', color: '#8a9bb0', lineHeight: 1.6 }}>
          <strong style={{ color: '#ffab00' }}>Note:</strong> Nansen is a well-established platform with deeper wallet labeling coverage (300M+ addresses) and institutional-grade research tools. Sonar offers a different approach focused on accessibility, AI-powered analysis, and affordable pricing. Both platforms serve different user needs. This page is for informational comparison only.
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1rem' }}>Try Sonar</h2>
          <p style={{ color: '#8a9bb0', fontSize: '1.1rem', marginBottom: '2rem' }}>Free to start. No credit card required.</p>
          <a href="/subscribe" style={{ display: 'inline-block', padding: '1rem 2.5rem', borderRadius: '8px', background: 'linear-gradient(135deg, #36a6ba, #2d8a9a)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '1.1rem' }}>Start Free — Upgrade Anytime</a>
        </div>
      </div>
    </div>
  )
}
