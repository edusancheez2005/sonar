const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is Sonar Tracker?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar Tracker is a real-time cryptocurrency whale transaction monitoring and analytics platform. We track large transactions (over $10,000) across 10+ blockchains including Ethereum, Bitcoin, Solana, Polygon, and BSC. Our AI-powered analyst ORCA provides plain-English interpretation of whale movements to help traders make data-driven decisions.' } },
    { '@type': 'Question', name: 'What is ORCA AI?', acceptedAnswer: { '@type': 'Answer', text: 'ORCA is Sonar Tracker\'s built-in AI analyst purpose-built for on-chain whale intelligence. Unlike generic chatbots, ORCA connects to real-time blockchain data and provides specific, timestamped analysis of whale transactions — including buy/sell classification, pattern recognition, clustering detection, and actionable market interpretation.' } },
    { '@type': 'Question', name: 'How does whale tracking work?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar Tracker continuously monitors blockchain networks for transactions above $10,000. Each transaction is classified as BUY, SELL, TRANSFER, or DEFI using AI. The data is aggregated into dashboards showing net flow direction, whale leaderboards, and buy/sell ratios to reveal whether whales are accumulating or distributing specific tokens.' } },
    { '@type': 'Question', name: 'What blockchains does Sonar Tracker support?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar Tracker monitors whale transactions across Ethereum, Bitcoin, Solana, Polygon, Binance Smart Chain, Tron, Arbitrum, Avalanche, Optimism, and other major blockchains. All chains are tracked in a unified dashboard with the same level of AI-powered classification and analysis.' } },
    { '@type': 'Question', name: 'How much does Sonar Tracker cost?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar Tracker Pro costs $7.99 per month, billed monthly. Cancel anytime with no commitment. This includes full whale tracking, ORCA AI access, custom alerts, CSV data export, and priority support.' } },
    { '@type': 'Question', name: 'Is there a free tier?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Free users can access crypto news, market pulse data, top net inflows/outflows, and basic dashboard views. The Pro plan ($7.99/month) unlocks full whale tracking, ORCA AI analysis, detailed statistics, custom alerts, and CSV export.' } },
    { '@type': 'Question', name: 'What is a crypto whale?', acceptedAnswer: { '@type': 'Answer', text: 'A crypto whale is any wallet or entity holding enough cryptocurrency to significantly influence its price. Thresholds vary by token: typically 1,000+ BTC, 10,000+ ETH, or being in the top 100 holders for altcoins. Whale categories include institutional investors, exchange cold wallets, protocol treasuries, early adopters, and government-seized assets.' } },
    { '@type': 'Question', name: 'How do I track a specific wallet?', acceptedAnswer: { '@type': 'Answer', text: 'Navigate to the Wallet Tracker page and paste any blockchain address. Sonar Tracker will display all transactions from that wallet in real time, including historical activity, DeFi interactions, and token holdings. You can set alerts to be notified when that wallet makes any transaction above your chosen threshold.' } },
    { '@type': 'Question', name: 'Can I get whale alerts on Telegram?', acceptedAnswer: { '@type': 'Answer', text: 'Telegram integration is on our roadmap. Currently, Sonar Tracker delivers whale alerts via email and in-app notifications. For Telegram-based whale alerts, Whale Alert and ClankApp offer this feature, though without AI-powered analysis. Sonar\'s in-app alerts provide more detailed and faster notifications.' } },
    { '@type': 'Question', name: 'How is Sonar Tracker different from Whale Alert?', acceptedAnswer: { '@type': 'Answer', text: 'Whale Alert broadcasts raw large transactions with no context. Sonar Tracker goes further: every transaction is classified as BUY, SELL, TRANSFER, or DEFI using AI. ORCA provides plain-English interpretation explaining what each whale move means. Sonar includes dashboards, net flow analytics, wallet tracking, custom alerts, and sentiment analysis — none of which Whale Alert offers.' } },
    { '@type': 'Question', name: 'How is Sonar Tracker different from Nansen?', acceptedAnswer: { '@type': 'Answer', text: 'Nansen ($150+/month) has deeper wallet labeling with 300M+ labeled addresses and institutional-grade Smart Money tracking. Sonar Tracker ($7.99/month) provides multi-chain whale tracking, ORCA AI analysis, real-time dashboards, and custom alerts at a fraction of the cost. For most retail traders, Sonar delivers 80% of the actionable intelligence at 5% of the price.' } },
    { '@type': 'Question', name: 'Do whale movements affect crypto prices?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Whale transactions affect prices through direct market impact (large sell orders moving price), sentiment cascades (other traders front-running whale moves), and liquidity shifts (whales adding or removing DeFi protocol liquidity). Historical examples include Germany\'s 50,000 BTC liquidation causing a 24% drop and Jump Trading\'s ETH dump contributing to a 35% crash.' } },
    { '@type': 'Question', name: 'How do I know if a whale is buying or selling?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar\'s AI classifies each transaction automatically. Key signals: tokens moving TO exchanges indicate selling intent, tokens moving FROM exchanges indicate accumulation. Net flow positive over multiple days indicates buying. Net flow negative with accelerating volume indicates distribution. ORCA AI provides this analysis on demand for any token.' } },
    { '@type': 'Question', name: 'How often is data updated?', acceptedAnswer: { '@type': 'Answer', text: 'Whale transaction data updates every 15 minutes. Price data from Binance refreshes in real-time. News articles are ingested continuously. ORCA AI accesses the latest data for every query.' } },
    { '@type': 'Question', name: 'Is Sonar Tracker data accurate?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar\'s AI-powered transaction classification achieves high accuracy for buy/sell determination by analyzing DEX interactions, exchange patterns, and historical wallet behavior. Edge cases like OTC deals or complex multi-hop transactions may require additional context. All data comes from verified on-chain sources.' } },
    { '@type': 'Question', name: 'Can I export data from Sonar Tracker?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Pro subscribers can export transaction data as CSV files from the Statistics page. Exports include timestamp, token, transaction type, USD value, blockchain, whale score, address, and transaction hash. Apply any filters first to export exactly the data you need.' } },
    { '@type': 'Question', name: 'What is the minimum transaction size tracked?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar Tracker monitors transactions with a minimum USD value of $10,000. This threshold ensures meaningful whale activity is captured while filtering out retail-level noise.' } },
    { '@type': 'Question', name: 'Can I cancel my subscription?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cancel anytime from your Profile page by clicking Manage Billing. You retain Pro access until the end of your current billing period. No long-term commitments or cancellation fees.' } },
    { '@type': 'Question', name: 'Is my data secure?', acceptedAnswer: { '@type': 'Answer', text: 'All data is encrypted using SSL/TLS. Passwords are hashed with industry-standard algorithms. Authentication is handled by Supabase and payments by Stripe. We never sell personal data to third parties.' } },
    { '@type': 'Question', name: 'Does Sonar Tracker provide financial advice?', acceptedAnswer: { '@type': 'Answer', text: 'No. Sonar Tracker and ORCA AI provide data-backed analysis and interpretation of on-chain whale activity. This is informational content, not financial advice. Always do your own research and consult a financial advisor before making investment decisions.' } },
  ]
}

export const metadata = {
  title: 'Crypto FAQ — Common Questions Answered',
  description: 'Answers to frequently asked questions about Sonar Tracker, whale tracking, ORCA AI, pricing, and crypto analytics. Get help fast.',
  keywords: 'crypto faq, whale tracking questions, sonar tracker help, crypto analytics faq, orca ai questions',
  alternates: { canonical: 'https://www.sonartracker.io/faq' },
  openGraph: {
    title: 'Crypto FAQ — Common Questions Answered | Sonar Tracker',
    description: 'Answers to frequently asked questions about whale tracking, ORCA AI, pricing, and crypto analytics.',
    url: 'https://www.sonartracker.io/faq',
    type: 'website',
  },
}

export default function FaqLayout({ children }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      {children}
    </>
  )
}
