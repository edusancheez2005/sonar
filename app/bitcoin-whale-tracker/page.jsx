import ChainLandingClient from '../components/ChainLandingClient'

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
    { '@type': 'Question', name: 'Which Bitcoin whale metrics does Sonar surface?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar surfaces exchange flow direction (net inflows vs net outflows over 5+ days), miner wallet outflows to exchanges, and dormant wallet reactivations. These are descriptive on-chain observations, not trading recommendations. Past on-chain patterns do not guarantee future price movement.' } },
    { '@type': 'Question', name: 'Can I track Bitcoin miner wallet activity?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Sonar Tracker monitors miner wallet outflows to exchanges. Post-halving periods often coincide with elevated miner outflows as less-efficient operations wind down. This is descriptive data; it does not predict price.' } },
    { '@type': 'Question', name: 'What happens when a dormant Bitcoin wallet moves?', acceptedAnswer: { '@type': 'Answer', text: 'When a long-dormant BTC wallet (5+ years inactive) suddenly transfers Bitcoin, the destination address (exchange vs new cold wallet) is recorded. ORCA AI describes the on-chain context. This is informational only and not a recommendation to buy, sell, or hold any asset.' } },
  ]
}

export default function BitcoinWhaleTrackerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <ChainLandingClient
        chain="bitcoin"
        chainName="Bitcoin"
        ticker="BTC"
        accentColor="#F7931A"
        secondaryColor="#FFD93D"
        heroTitle="Track Bitcoin Whale Movements in Real Time"
        heroSubtitle="Monitor large BTC transactions, exchange flows, miner activity, and dormant wallet movements. ORCA AI describes the on-chain context for each event. Informational only — not financial advice."
        stats={[
          { value: '#1', label: 'most tracked chain' },
          { value: 'UTXO', label: 'deep analysis' },
          { value: '$7.99', label: '/month' },
          { value: 'ORCA AI', label: 'built-in' },
        ]}
        features={[
          { icon: 'building', title: 'Exchange Flow Monitoring', desc: 'Track BTC moving in and out of all major exchanges. Sonar reports net inflow / net outflow magnitudes — descriptive metrics, not trading instructions.' },
          { icon: 'pickaxe', title: 'Miner Activity Tracking', desc: 'Monitor miner wallet outflows to exchanges. Sonar surfaces these flows in real time. Past miner-flow patterns do not predict future prices.' },
          { icon: 'moon', title: 'Dormant Wallet Alerts', desc: 'Get flagged when long-dormant Bitcoin wallets (5+ years inactive) suddenly move BTC. ORCA AI describes the destination (exchange vs new cold wallet) — context only.' },
          { icon: 'cpu', title: 'ORCA AI for Bitcoin', desc: 'Ask ORCA about BTC-specific on-chain data: exchange reserves, miner outflows, government wallet movements, and UTXO age distribution.' },
          { icon: 'database', title: 'UTXO Age Analysis', desc: 'Track Coin Days Destroyed and HODL Waves metrics. Movement of long-dormant coins is a descriptive on-chain observation, not a directional indicator.' },
          { icon: 'bell', title: 'Custom BTC Alerts', desc: 'Set alerts for BTC transactions above any threshold. Get notified when government wallets, miners, or dormant whales transact.' },
        ]}
        steps={[
          { title: 'Sonar monitors every BTC transaction over $10K', desc: 'Our pipeline captures Bitcoin whale movements across the UTXO model, tracking address clusters rather than individual accounts for accurate entity mapping.' },
          { title: 'AI classifies the destination of each transaction', desc: 'Machine learning labels BTC movements by destination type: exchange deposit, withdrawal to cold wallet, or wallet-to-wallet transfer. These are factual classifications, not trading signals.' },
          { title: 'ORCA describes exchange flows and coin age', desc: 'ORCA reports exchange reserve trends, miner outflows, dormant wallet reactivations, and macro context. Output is descriptive only.' },
          { title: 'Professional-grade on-chain data at consumer pricing', desc: 'The same public exchange-flow and whale data many professional traders review — with AI summarisation, for $7.99/month. Informational only.' },
        ]}
        whyTrack={[
          { title: 'Headline-Generating Whale Activity', desc: 'Large BTC transfers regularly generate news coverage. Government liquidations, treasury buys, and dormant wallet movements are reported here as data points.' },
          { title: 'Exchange Reserves Are a Watched Metric', desc: 'Net BTC flowing off exchanges is one of the most-discussed on-chain metrics. Sonar surfaces it in real time. Past correlations do not guarantee future price moves.' },
          { title: 'Miner Behavior as Context', desc: 'Miner outflow magnitudes and hashrate changes are reported. Historical patterns are educational context only — not predictive of future cycles.' },
          { title: 'Coin Age — Unique to Bitcoin', desc: 'Bitcoin\'s UTXO model uniquely allows tracking how long coins have been dormant. Movement of old coins is a descriptive metric, not a buy or sell instruction.' },
        ]}
        comparisons={[
          { feature: 'Real-time BTC tracking', sonar: '✓', tool2: '✓', tool3: '✓' },
          { feature: 'AI inflow/outflow classification', sonar: '✓', tool2: '✗', tool3: '✗' },
          { feature: 'AI analyst (ORCA)', sonar: '✓', tool2: '✗', tool3: '✗' },
          { feature: 'Exchange flow monitoring', sonar: '✓', tool2: '✓', tool3: 'Limited' },
          { feature: 'Miner activity tracking', sonar: '✓', tool2: '✓', tool3: '✗' },
          { feature: 'Multi-chain coverage', sonar: '10+ chains', tool2: 'BTC only', tool3: '✗' },
          { feature: 'Price/month', sonar: '$7.99', tool2: '$29+', tool3: 'Free' },
        ]}
        compToolNames={['Glassnode', 'Mempool']}
        faqs={[
          { q: 'Why is Bitcoin whale tracking different from Ethereum?', a: 'Bitcoin\'s UTXO model means one entity can control hundreds of addresses. BTC lacks smart contracts, so whale behavior is buy/hold/sell rather than complex DeFi interactions. Exchange flow and coin age are the most reliable BTC-specific signals.' },
          { q: 'What happens when a Satoshi-era wallet moves?', a: 'Old-coin movements typically generate news coverage regardless of the amount. ORCA AI describes the magnitude and destination of the transfer. Informational only — not a recommendation.' },
          { q: 'How does the halving affect whale behavior?', a: 'Halvings reduce miner revenue by 50%, increasing sell pressure as less-efficient operations wind down. Post-halving periods typically see 3-6 months of miner capitulation followed by supply reduction and price appreciation.' },
          { q: 'Can I track Bitcoin whale wallets for free?', a: 'Use blockchain.com or mempool.space for free individual address tracking. For aggregated whale intelligence with AI analysis, Sonar Pro at $7.99/month is the most cost-effective option.' },
          { q: 'Which Bitcoin whale metric does Sonar emphasise?', a: 'Exchange flow direction — particularly sustained outflows (5+ days). Sonar surfaces this metric in real time. It is descriptive on-chain data; past correlations do not guarantee future price movements.' },
        ]}
        blogSlug="bitcoin-whale-tracker"
        demoTxs={[
          { type: 'buy', amount: '$18.5M BTC', addr: 'bc1q...x7k4', time: '15s ago', id: 1 },
          { type: 'sell', amount: '$5.2M BTC', addr: '3FZb...Q9nR', time: '48s ago', id: 2 },
          { type: 'buy', amount: '$42.0M BTC', addr: 'bc1q...m3p8', time: '1m ago', id: 3 },
          { type: 'buy', amount: '$11.3M BTC', addr: '1P5Z...Kd7w', time: '3m ago', id: 4 },
          { type: 'sell', amount: '$7.8M BTC', addr: 'bc1q...r2v5', time: '4m ago', id: 5 },
          { type: 'buy', amount: '$25.1M BTC', addr: '3Cbq...Lf9x', time: '5m ago', id: 6 },
          { type: 'sell', amount: '$3.4M BTC', addr: 'bc1q...h6n1', time: '7m ago', id: 7 },
          { type: 'buy', amount: '$55.0M BTC', addr: '1FeX...Wp4z', time: '8m ago', id: 8 },
        ]}
        chartData={[
          {value:60},{value:50},{value:70},{value:-25},{value:75},{value:55},{value:-10},{value:68},
          {value:62},{value:80},{value:-5},{value:85},{value:72},{value:55},{value:78},{value:-12},
          {value:88},{value:75},{value:65},{value:90},{value:-3},{value:82},{value:92},{value:95},
        ]}
        tickerItems={[
          { symbol: 'BTC', price: '$63,420', change: '+2.1%' },
          { symbol: 'WBTC', price: '$63,380', change: '+2.0%' },
          { symbol: 'STX', price: '$1.82', change: '+5.4%' },
          { symbol: 'ORDI', price: '$38.50', change: '-3.2%' },
          { symbol: 'RUNE', price: '$4.15', change: '+1.7%' },
          { symbol: 'SATS', price: '$0.00032', change: '+8.3%' },
          { symbol: 'MSTR', price: '$1,245', change: '+1.4%' },
          { symbol: 'GBTC', price: '$58.20', change: '+0.9%' },
        ]}
      />
    </>
  )
}
