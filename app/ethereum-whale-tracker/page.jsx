import ChainLandingClient from '../components/ChainLandingClient'

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
      <ChainLandingClient
        chain="ethereum"
        chainName="Ethereum"
        ticker="ETH"
        accentColor="#627EEA"
        secondaryColor="#36a6ba"
        heroTitle="Track Ethereum Whale Movements in Real Time"
        heroSubtitle="Monitor large ETH transactions, staking flows, and DeFi whale interactions across the entire Ethereum ecosystem. ORCA AI interprets every major move so you don't have to read Etherscan."
        stats={[
          { value: '300M+', label: 'labeled wallets' },
          { value: 'ERC-20', label: 'full coverage' },
          { value: '$7.99', label: '/month' },
          { value: 'ORCA AI', label: 'built-in' },
        ]}
        features={[
          { icon: 'diamond', title: 'ETH & ERC-20 Tracking', desc: 'Every whale transaction over $10K for native ETH and all major ERC-20 tokens. AI classifies each as BUY, SELL, TRANSFER, or DEFI automatically.' },
          { icon: 'link', title: 'Staking Flow Analysis', desc: 'Monitor the Ethereum staking withdrawal queue. See when large validators unstake — a leading indicator of potential selling days in advance.' },
          { icon: 'building', title: 'DeFi Whale Intelligence', desc: 'Track whale interactions with Aave, Uniswap, Lido, and Eigenlayer. Know instantly when whales are leveraging up or deleveraging.' },
          { icon: 'cpu', title: 'ORCA AI for Ethereum', desc: 'Ask ORCA about ETH whale behavior. Get context on ICO wallets, foundation sells, institutional movements, and DeFi protocol flows.' },
          { icon: 'trending', title: 'Exchange Flow Tracking', desc: 'Monitor ETH flowing in and out of all major exchanges. Sustained outflows signal accumulation. Sudden inflow spikes signal imminent selling.' },
          { icon: 'bell', title: 'Custom Alerts', desc: 'Set alerts for ETH and any ERC-20 token. Get notified when whale activity exceeds your threshold or when net flow direction changes.' },
        ]}
        steps={[
          { title: 'Sonar monitors every ETH transaction over $10K', desc: 'Our pipeline captures whale movements across native ETH and all major ERC-20 tokens as they confirm on the Ethereum blockchain.' },
          { title: 'AI classifies buy, sell, transfer, and DeFi', desc: 'Machine learning analyzes DEX interactions, exchange patterns, and wallet behavior to determine the intent behind each transaction.' },
          { title: 'ORCA detects staking flows and divergences', desc: 'ORCA tracks the withdrawal queue, ICO wallet movements, foundation sells, and flags when whale behavior contradicts market sentiment.' },
          { title: 'You get institutional-grade intelligence', desc: 'Dashboard views, on-demand AI analysis, custom alerts. The same on-chain data hedge funds use — for $7.99/month.' },
        ]}
        whyTrack={[
          { title: 'Most Labeled Wallets', desc: 'Ethereum has more identified whale wallets than any chain: ICO participants, foundations, institutional funds, and ETF issuers. More labels mean more actionable intelligence.' },
          { title: 'Staking as a Leading Indicator', desc: 'Unstaking queue data gives you 1-14 days advance warning of potential selling. No other chain offers this kind of predictive window built into the protocol.' },
          { title: 'Deepest DeFi Ecosystem', desc: 'Whale interactions with Aave, Uniswap, Lido, and Eigenlayer reveal leveraging, deleveraging, and strategic repositioning before it shows in the price.' },
          { title: 'ETF Flow Transparency', desc: 'Spot ETH ETF custodial wallets (BlackRock, Fidelity) show institutional demand in real time on-chain. Sonar tracks these flows alongside organic whale activity.' },
        ]}
        comparisons={[
          { feature: 'Real-time ETH tracking', sonar: '✓', tool2: '✓', tool3: '✓' },
          { feature: 'AI buy/sell classification', sonar: '✓', tool2: '✗', tool3: '✗' },
          { feature: 'AI analyst (ORCA)', sonar: '✓', tool2: '✗', tool3: '✗' },
          { feature: 'Staking flow monitoring', sonar: '✓', tool2: '✓', tool3: '✗' },
          { feature: 'DeFi interaction tracking', sonar: '✓', tool2: '✓', tool3: 'Limited' },
          { feature: 'Custom alerts', sonar: '✓', tool2: '✓', tool3: '✗' },
          { feature: 'Price/month', sonar: '$7.99', tool2: '$150+', tool3: 'Free' },
        ]}
        compToolNames={['Nansen', 'Etherscan']}
        faqs={[
          { q: 'How do ETH staking withdrawals affect price?', a: 'Large unstaking events signal intent to sell. After the queue processes (1-14 days), ETH becomes liquid. If it moves to an exchange, selling is imminent. Sonar monitors both the withdrawal queue and post-withdrawal exchange deposits.' },
          { q: 'What\'s the difference between ETH and ERC-20 tracking?', a: 'ETH tracking focuses on native Ether — staking flows, exchange deposits, and ETH-specific DeFi. ERC-20 tracking covers all tokens on Ethereum (UNI, LINK, AAVE, etc.). Sonar covers both comprehensively.' },
          { q: 'How accurate is ETH whale buy/sell classification?', a: 'Sonar\'s AI achieves high accuracy by analyzing DEX interactions, exchange patterns, and historical wallet behavior. Edge cases like OTC deals may require additional context from ORCA.' },
          { q: 'Can I track ETF custodial wallets?', a: 'Yes. Sonar monitors known custodial wallets for BlackRock, Fidelity, and other spot ETH ETF issuers. Inflows and outflows from these addresses reflect institutional demand.' },
          { q: 'Which ETH signals are most reliable?', a: 'Exchange flow direction is the single most reliable signal. Sustained outflows (5+ days) are strongly bullish. Sudden inflow spikes are reliably bearish. Staking queue events also offer high-confidence signals.' },
        ]}
        blogSlug="ethereum-whale-tracker"
        demoTxs={[
          { type: 'buy', amount: '$8.2M ETH', addr: '0x1a3...f4d2', time: '8s ago', id: 1 },
          { type: 'sell', amount: '$3.1M ETH', addr: '0x9b7...2e8c', time: '32s ago', id: 2 },
          { type: 'buy', amount: '$12.5M ETH', addr: '0x4d2...a7f1', time: '1m ago', id: 3 },
          { type: 'buy', amount: '$6.8M USDC', addr: '0x8f3...c5b9', time: '2m ago', id: 4 },
          { type: 'sell', amount: '$4.5M ETH', addr: '0x2c1...d6e4', time: '3m ago', id: 5 },
          { type: 'buy', amount: '$15.3M ETH', addr: '0x7e9...b3a8', time: '4m ago', id: 6 },
          { type: 'sell', amount: '$2.1M LINK', addr: '0x5a4...f8c2', time: '5m ago', id: 7 },
          { type: 'buy', amount: '$9.7M ETH', addr: '0x3b6...e1d5', time: '6m ago', id: 8 },
        ]}
        chartData={[
          {value:55},{value:42},{value:65},{value:-20},{value:70},{value:48},{value:-12},{value:62},
          {value:58},{value:75},{value:-8},{value:80},{value:65},{value:50},{value:72},{value:-15},
          {value:82},{value:70},{value:60},{value:85},{value:-5},{value:78},{value:88},{value:92},
        ]}
        tickerItems={[
          { symbol: 'ETH', price: '$2,450', change: '+1.8%' },
          { symbol: 'UNI', price: '$3.13', change: '-2.3%' },
          { symbol: 'LINK', price: '$14.82', change: '+4.1%' },
          { symbol: 'AAVE', price: '$92.50', change: '+2.6%' },
          { symbol: 'LDO', price: '$1.85', change: '-0.9%' },
          { symbol: 'ARB', price: '$0.78', change: '+3.4%' },
          { symbol: 'OP', price: '$1.42', change: '+1.2%' },
          { symbol: 'MKR', price: '$1,580', change: '-1.7%' },
        ]}
      />
    </>
  )
}
