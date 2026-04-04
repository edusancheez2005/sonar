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
    { '@type': 'Question', name: 'What are the most reliable Bitcoin whale signals?', acceptedAnswer: { '@type': 'Answer', text: 'Exchange flow direction is the most reliable. Sustained BTC outflows from exchanges (5+ days) are strongly bullish — holders are moving to self-custody. Sudden inflow spikes are reliably bearish. Miner selling patterns and dormant wallet movements are also high-conviction signals.' } },
    { '@type': 'Question', name: 'Can I track Bitcoin miner wallet activity?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Sonar Tracker monitors miner wallet outflows to exchanges. Post-halving periods often see elevated miner selling as less-efficient operations wind down. Tracking miner capitulation events has historically helped identify local price bottoms.' } },
    { '@type': 'Question', name: 'What happens when a dormant Bitcoin wallet moves?', acceptedAnswer: { '@type': 'Answer', text: 'When a long-dormant BTC wallet (5+ years inactive) suddenly transfers Bitcoin, the market often overreacts on sentiment alone. The actual impact depends on whether the BTC moves to an exchange (sell signal) or to a new cold wallet (reorganization). ORCA AI helps distinguish the intent.' } },
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
        heroSubtitle="Monitor large BTC transactions, exchange flows, miner activity, and dormant wallet movements. ORCA AI explains what each whale move means for Bitcoin price."
        stats={[
          { value: '#1', label: 'most tracked chain' },
          { value: 'UTXO', label: 'deep analysis' },
          { value: '$7.99', label: '/month' },
          { value: 'ORCA AI', label: 'built-in' },
        ]}
        features={[
          { icon: 'building', title: 'Exchange Flow Monitoring', desc: 'Track BTC flowing in and out of all major exchanges. Net exchange outflows are the most reliable bullish signal in crypto. Inflow spikes signal imminent selling.' },
          { icon: 'pickaxe', title: 'Miner Activity Tracking', desc: 'Monitor miner wallet outflows to exchanges. Post-halving miner capitulation events historically mark local price bottoms — catch them in real time.' },
          { icon: 'moon', title: 'Dormant Wallet Alerts', desc: 'Get flagged when long-dormant Bitcoin wallets (5+ years inactive) suddenly move BTC. ORCA AI distinguishes between reorganization and sell-intent.' },
          { icon: 'cpu', title: 'ORCA AI for Bitcoin', desc: 'Ask ORCA about BTC-specific whale behavior: exchange reserves, miner selling rates, government wallet movements, and UTXO age distribution signals.' },
          { icon: 'database', title: 'UTXO Age Analysis', desc: 'Track Coin Days Destroyed and HODL Waves metrics. When old coins move, it signals conviction shifts among long-term holders — a high-confidence indicator.' },
          { icon: 'bell', title: 'Custom BTC Alerts', desc: 'Set alerts for BTC transactions above any threshold. Get notified when government wallets, miners, or dormant whales make moves.' },
        ]}
        steps={[
          { title: 'Sonar monitors every BTC transaction over $10K', desc: 'Our pipeline captures Bitcoin whale movements across the UTXO model, tracking address clusters rather than individual accounts for accurate entity mapping.' },
          { title: 'AI classifies intent behind each transaction', desc: 'Machine learning determines if BTC is moving to an exchange (sell signal), cold wallet (accumulation), or between wallets (neutral) — context that raw explorers miss.' },
          { title: 'ORCA analyses exchange flows and coin age', desc: 'ORCA tracks exchange reserve trends, miner behavior, dormant wallet reactivations, and cross-references with macro events for complete BTC intelligence.' },
          { title: 'You get signals hedge funds pay $10K+/month for', desc: 'The same exchange flow and whale data that institutional desks monitor — with AI interpretation, for $7.99/month.' },
        ]}
        whyTrack={[
          { title: 'Most Market-Moving Whale Activity', desc: 'A single large BTC transfer can move billions in market cap within hours. Government liquidations, institutional buys, and dormant wallet movements generate outsized price reactions.' },
          { title: 'Exchange Reserves at Historic Lows', desc: 'BTC continuously leaving exchanges signals a supply squeeze. This metric has preceded every major Bitcoin rally in the past 5 years. Sonar tracks it in real time.' },
          { title: 'Miner Behavior as a Cycle Indicator', desc: 'Post-halving miner capitulation (high selling + hashrate drops) marks local bottoms. Miner accumulation signals the start of bull phases. Sonar monitors both.' },
          { title: 'Coin Age — Unique to Bitcoin', desc: 'Bitcoin\'s UTXO model uniquely allows tracking how long coins have been dormant. Old coins moving is a high-conviction signal no other chain can provide.' },
        ]}
        comparisons={[
          { feature: 'Real-time BTC tracking', sonar: '✓', tool2: '✓', tool3: '✓' },
          { feature: 'AI buy/sell classification', sonar: '✓', tool2: '✗', tool3: '✗' },
          { feature: 'AI analyst (ORCA)', sonar: '✓', tool2: '✗', tool3: '✗' },
          { feature: 'Exchange flow monitoring', sonar: '✓', tool2: '✓', tool3: 'Limited' },
          { feature: 'Miner activity tracking', sonar: '✓', tool2: '✓', tool3: '✗' },
          { feature: 'Multi-chain coverage', sonar: '10+ chains', tool2: 'BTC only', tool3: '✗' },
          { feature: 'Price/month', sonar: '$7.99', tool2: '$29+', tool3: 'Free' },
        ]}
        compToolNames={['Glassnode', 'Mempool']}
        faqs={[
          { q: 'Why is Bitcoin whale tracking different from Ethereum?', a: 'Bitcoin\'s UTXO model means one entity can control hundreds of addresses. BTC lacks smart contracts, so whale behavior is buy/hold/sell rather than complex DeFi interactions. Exchange flow and coin age are the most reliable BTC-specific signals.' },
          { q: 'What happens when a Satoshi-era wallet moves?', a: 'The market typically overreacts. Old-coin movements generate headlines and speculative selling even if the amount is small. ORCA AI helps distinguish between symbolic moves (50 BTC from 2009) and market-moving events (50,000 BTC government liquidation).' },
          { q: 'How does the halving affect whale behavior?', a: 'Halvings reduce miner revenue by 50%, increasing sell pressure as less-efficient operations wind down. Post-halving periods typically see 3-6 months of miner capitulation followed by supply reduction and price appreciation.' },
          { q: 'Can I track Bitcoin whale wallets for free?', a: 'Use blockchain.com or mempool.space for free individual address tracking. For aggregated whale intelligence with AI analysis, Sonar Pro at $7.99/month is the most cost-effective option.' },
          { q: 'What is the most reliable Bitcoin whale signal?', a: 'Exchange flow direction — particularly sustained outflows (5+ days). When BTC consistently leaves exchanges, holders are moving to self-custody with no intent to sell. This has preceded every major BTC rally in the past 5 years.' },
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
