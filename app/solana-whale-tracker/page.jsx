export const metadata = {
  title: 'Solana Whale Tracker — Real-Time SOL Whale Alerts | Sonar Tracker',
  description: 'Track Solana whale transactions in real-time. Monitor large SOL movements, staking flows, and DeFi interactions. AI-powered alerts from ORCA. From $7.99/mo.',
  keywords: 'solana whale tracker, sol whale tracker, solana whale alerts, track solana whales, sol whale movements, solana whale transactions',
  alternates: { canonical: 'https://www.sonartracker.io/solana-whale-tracker' },
  openGraph: {
    title: 'Solana Whale Tracker — Real-Time SOL Whale Alerts | Sonar Tracker',
    description: 'Track Solana whale transactions in real-time. AI-powered SOL whale intelligence from $7.99/mo.',
    url: 'https://www.sonartracker.io/solana-whale-tracker',
    type: 'website',
    images: [{ url: '/screenshots/stats-dashboard.png', width: 1200, height: 630, alt: 'Sonar Tracker Solana Whale Dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Solana Whale Tracker — Real-Time SOL Whale Alerts',
    description: 'Track large SOL transactions in real-time. AI-powered whale intelligence.',
    images: ['/screenshots/stats-dashboard.png'],
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is a Solana whale tracker?', acceptedAnswer: { '@type': 'Answer', text: 'A Solana whale tracker monitors large SOL transactions on the Solana blockchain in real-time. It identifies when major holders are buying, selling, staking, or interacting with DeFi protocols — movements that often precede significant SOL price changes.' } },
    { '@type': 'Question', name: 'How does Sonar Tracker monitor Solana whales?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar Tracker continuously monitors the Solana blockchain for transactions above $10,000. Each transaction is classified as BUY, SELL, TRANSFER, or DEFI using AI. The ORCA AI analyst provides plain-English interpretation of SOL whale activity patterns.' } },
    { '@type': 'Question', name: 'Can I track Solana memecoin whale wallets?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Use the Wallet Tracker to paste any Solana wallet address — including memecoin sniper wallets. You can monitor all their transactions, token swaps on Jupiter and Raydium, and DeFi interactions in real time.' } },
    { '@type': 'Question', name: 'How do Solana staking events affect SOL price?', acceptedAnswer: { '@type': 'Answer', text: 'Large unstaking events are a leading indicator of potential selling. When whales initiate unstaking, SOL tokens become liquid 2-3 days later. If those tokens then move to exchanges, selling is likely imminent. Sonar tracks these events automatically.' } },
    { '@type': 'Question', name: 'What makes Solana whale tracking different from other chains?', acceptedAnswer: { '@type': 'Answer', text: 'Solana has sub-second transaction finality, so whale moves impact prices almost instantly. The chain also has concentrated ownership among VCs and foundations, active memecoin whale culture, and epoch-based staking dynamics that provide unique advance signals.' } },
  ]
}

export default function SolanaWhaleTrackerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ minHeight: '100vh', background: '#0a1621', color: '#e8edf2', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '8rem 2rem 4rem' }}>
          {/* Hero */}
          <p style={{ color: '#9945FF', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1rem' }}>Solana Whale Intelligence</p>
          <h1 style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.5rem', background: 'linear-gradient(135deg, #9945FF, #14F195)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Track Solana Whale Movements in Real Time
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#8a9bb0', lineHeight: 1.7, marginBottom: '2rem', maxWidth: '700px' }}>
            Monitor every large SOL transaction as it happens. See which whales are accumulating, which are distributing, and what it means for SOL price — powered by ORCA AI analysis.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '4rem', flexWrap: 'wrap' }}>
            <a href="/subscribe" style={{ display: 'inline-block', padding: '0.9rem 2rem', borderRadius: '8px', background: 'linear-gradient(135deg, #9945FF, #14F195)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>Track SOL Whales — $7.99/mo</a>
            <a href="/dashboard" style={{ display: 'inline-block', padding: '0.9rem 2rem', borderRadius: '8px', border: '1px solid rgba(153,69,255,0.3)', color: '#9945FF', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>View Live Dashboard</a>
          </div>

          {/* Features */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>Solana Whale Tracking Features</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
            {[
              { title: 'Real-Time SOL Transactions', desc: 'Every Solana whale transaction over $10K tracked and classified as BUY, SELL, TRANSFER, or DEFI. Sub-second chain finality means you see moves when they happen.' },
              { title: 'Staking Flow Monitoring', desc: 'Track large SOL unstaking events that signal potential selling 2-3 days ahead. Epoch-based lock periods give you a predictive window no other chain offers.' },
              { title: 'ORCA AI for Solana', desc: 'Ask ORCA about Solana-specific whale activity. Get plain-English analysis of staking events, DEX flows on Jupiter and Raydium, and memecoin whale movements.' },
              { title: 'Wallet Tracker', desc: 'Follow any Solana wallet address — VC funds, protocol treasuries, even memecoin snipers. Monitor all their transactions and DeFi interactions in real time.' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(13,33,52,0.6)', border: '1px solid rgba(153,69,255,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#9945FF', marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.9rem', color: '#8a9bb0', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Why SOL */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>Why Track Solana Whales?</h2>
          <div style={{ background: 'rgba(13,33,52,0.6)', border: '1px solid rgba(153,69,255,0.15)', borderRadius: '12px', padding: '2rem', marginBottom: '4rem', lineHeight: 1.8, color: '#8a9bb0' }}>
            <p style={{ marginBottom: '1rem' }}>Solana has unique characteristics that make whale tracking especially valuable:</p>
            <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#e8edf2' }}>Sub-second finality</strong> — whale moves impact prices almost instantly. Real-time monitoring is essential, not optional.</li>
              <li style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#e8edf2' }}>Concentrated ownership</strong> — Solana Foundation, VC funds, and former FTX/Alameda wallets hold significant supply. Their movements are market-moving events.</li>
              <li style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#e8edf2' }}>Memecoin whale culture</strong> — Solana&apos;s low fees make it the home of memecoin trading. Tracking sniper wallets helps you avoid rug pulls and identify early trends.</li>
              <li style={{ marginBottom: '0.8rem' }}><strong style={{ color: '#e8edf2' }}>Active DeFi ecosystem</strong> — Jupiter, Raydium, Marinade, and Jito whale interactions reveal strategic positioning before it hits the market.</li>
            </ul>
          </div>

          {/* Blog link */}
          <div style={{ background: 'rgba(153,69,255,0.08)', border: '1px solid rgba(153,69,255,0.2)', borderRadius: '12px', padding: '2rem', marginBottom: '4rem', textAlign: 'center' }}>
            <p style={{ color: '#e8edf2', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Want to learn more?</p>
            <p style={{ color: '#8a9bb0', fontSize: '0.95rem', marginBottom: '1rem' }}>Read our complete guide to Solana whale tracking — tools, strategies, and top wallets to watch.</p>
            <a href="/blog/solana-whale-tracker" style={{ color: '#9945FF', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>Read the Full Solana Whale Tracking Guide →</a>
          </div>

          {/* FAQ */}
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1.5rem' }}>Frequently Asked Questions</h2>
          <div style={{ marginBottom: '4rem' }}>
            {faqSchema.mainEntity.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid rgba(153,69,255,0.1)', padding: '1.25rem 0' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#e8edf2', marginBottom: '0.5rem' }}>{faq.name}</h3>
                <p style={{ fontSize: '0.9rem', color: '#8a9bb0', lineHeight: 1.6, margin: 0 }}>{faq.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e8edf2', marginBottom: '1rem' }}>Start tracking Solana whales today.</h2>
            <p style={{ color: '#8a9bb0', fontSize: '1.1rem', marginBottom: '2rem' }}>Join traders who see SOL whale movements before they hit the charts.</p>
            <a href="/subscribe" style={{ display: 'inline-block', padding: '1rem 2.5rem', borderRadius: '8px', background: 'linear-gradient(135deg, #9945FF, #14F195)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '1.1rem' }}>Start Tracking — Free</a>
          </div>
        </div>
      </div>
    </>
  )
}
