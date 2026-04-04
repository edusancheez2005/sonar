import ChainLandingClient from '../components/ChainLandingClient'

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
      <ChainLandingClient
        chain="solana"
        chainName="Solana"
        ticker="SOL"
        accentColor="#9945FF"
        secondaryColor="#14F195"
        heroTitle="Track Solana Whale Movements in Real Time"
        heroSubtitle="Monitor every large SOL transaction as it happens. See which whales are accumulating, distributing, or interacting with DeFi — powered by ORCA AI that tells you what each move means."
        stats={[
          { value: '< 1s', label: 'chain finality' },
          { value: '10+', label: 'chains tracked' },
          { value: '$7.99', label: '/month' },
          { value: 'ORCA AI', label: 'built-in' },
        ]}
        features={[
          { icon: '⚡', title: 'Real-Time SOL Transactions', desc: 'Every Solana whale transaction over $10K tracked and classified as BUY, SELL, TRANSFER, or DEFI. Sub-second chain finality means you see moves the instant they happen.' },
          { icon: '🔓', title: 'Staking Flow Monitoring', desc: 'Track large SOL unstaking events that signal potential selling 2-3 days ahead. Epoch-based lock periods give you a predictive window no other chain offers.' },
          { icon: '🤖', title: 'ORCA AI for Solana', desc: 'Ask ORCA about SOL-specific whale activity. Get plain-English analysis of staking events, DEX flows on Jupiter and Raydium, and memecoin whale movements.' },
          { icon: '👁️', title: 'Wallet Tracker', desc: 'Follow any Solana wallet — VC funds, protocol treasuries, even memecoin snipers. Monitor all their transactions and DeFi interactions in real time.' },
          { icon: '🔔', title: 'Custom Alerts', desc: 'Set alerts for SOL transactions above any threshold. Get notified when whale activity matches your criteria via email or in-app notifications.' },
          { icon: '📊', title: 'Net Flow Analytics', desc: 'See whether SOL whales are accumulating or distributing across 1h, 6h, 24h, and 7d timeframes. Spot trend changes before they hit the price.' },
        ]}
        steps={[
          { title: 'Sonar ingests every SOL transaction over $10K', desc: 'Our pipeline monitors the Solana blockchain continuously, capturing whale movements the moment they confirm on-chain.' },
          { title: 'AI classifies each transaction', desc: 'Machine learning determines whether each transaction is a buy, sell, transfer, or DeFi interaction — turning raw data into directional signals.' },
          { title: 'ORCA analyses the pattern', desc: 'ORCA looks at whale clustering, net flow direction, staking queue events, and historical wallet behavior to identify what matters.' },
          { title: 'You get actionable intelligence', desc: 'View it on the dashboard, ask ORCA directly, or receive alerts. Plain English, not hex addresses.' },
        ]}
        whyTrack={[
          { title: 'Sub-Second Finality', desc: 'SOL transactions confirm in under 400ms. When a whale sells, the market impact is nearly instant. Real-time monitoring is essential, not optional.' },
          { title: 'Concentrated Ownership', desc: 'Solana Foundation, early VCs, and former FTX/Alameda wallets hold significant supply. Their movements are market-moving events that Sonar tracks automatically.' },
          { title: 'Memecoin Whale Culture', desc: 'Solana\'s low fees make it the home of memecoin trading. Tracking sniper wallets helps you avoid rug pulls and identify early trends before they go viral.' },
          { title: 'Active DeFi Ecosystem', desc: 'Jupiter, Raydium, Marinade, and Jito whale interactions reveal strategic positioning. Large liquidity events foreshadow market movements.' },
        ]}
        comparisons={[
          { feature: 'Real-time SOL tracking', sonar: '✓', tool2: '✓', tool3: '✓' },
          { feature: 'AI buy/sell classification', sonar: '✓', tool2: '✗', tool3: '✗' },
          { feature: 'AI analyst (ORCA)', sonar: '✓', tool2: '✗', tool3: '✗' },
          { feature: 'Staking flow monitoring', sonar: '✓', tool2: 'Limited', tool3: '✗' },
          { feature: 'Memecoin whale tracking', sonar: '✓', tool2: '✓', tool3: '✗' },
          { feature: 'Custom alerts', sonar: '✓', tool2: 'Limited', tool3: '✓' },
          { feature: 'Price/month', sonar: '$7.99', tool2: '$150+', tool3: 'Free' },
        ]}
        compToolNames={['Nansen', 'Solscan']}
        faqs={[
          { q: 'What is the minimum SOL transaction tracked?', a: 'Sonar Tracker monitors Solana transactions with a minimum USD value of $10,000. This threshold captures meaningful whale activity while filtering out retail noise.' },
          { q: 'Can I track Solana memecoin whale wallets?', a: 'Yes. Use the Wallet Tracker to paste any Solana wallet address — including known memecoin sniper wallets. You\'ll see all their transactions, token swaps, and DeFi interactions in real time.' },
          { q: 'How do staking events affect SOL price?', a: 'Large unstaking events are a leading indicator of potential selling. When whales initiate unstaking, tokens become liquid 2-3 days later. If those tokens then move to exchanges, selling is imminent. Sonar tracks these events automatically.' },
          { q: 'Does Sonar cover Solana SPL tokens?', a: 'Yes. Sonar monitors SOL and SPL tokens (Solana\'s token standard) including JUP, RAY, BONK, and other popular Solana ecosystem tokens.' },
          { q: 'How does SOL whale tracking compare to ETH?', a: 'Solana has faster finality (sub-second vs 12+ seconds) so whale impact is more immediate. Ethereum has more labeled wallets and deeper historical data. Sonar covers both chains with the same level of real-time monitoring and AI analysis.' },
        ]}
        blogSlug="solana-whale-tracker"
      />
    </>
  )
}
