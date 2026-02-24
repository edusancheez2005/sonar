const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is Sonar Tracker?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar Tracker is a real-time cryptocurrency whale transaction monitoring and analytics platform. We track large transactions across multiple blockchains and provide AI-powered insights via ORCA 2.0 to help traders make informed decisions.' } },
    { '@type': 'Question', name: 'How much does Premium cost?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar Tracker Pro costs $7.99 per month, billed monthly. Cancel anytime. Free tier includes news, market pulse, and basic dashboard views.' } },
    { '@type': 'Question', name: 'What is whale activity?', acceptedAnswer: { '@type': 'Answer', text: 'Whale activity refers to large cryptocurrency transactions made by individuals or entities holding significant crypto. Sonar tracks transactions over $10,000 across multiple blockchains including Ethereum, Bitcoin, Tron, and more.' } },
    { '@type': 'Question', name: 'What is Orca 2.0?', acceptedAnswer: { '@type': 'Answer', text: 'Orca 2.0 is our AI-powered market advisor that analyzes whale activity, price momentum, trading volume, and news sentiment to generate actionable crypto trading insights.' } },
    { '@type': 'Question', name: 'Which blockchains do you support?', acceptedAnswer: { '@type': 'Answer', text: 'Sonar Tracker monitors whale transactions across Ethereum, Bitcoin, Tron, Ripple, Binance Smart Chain, Polygon, Avalanche, and other major blockchains.' } },
    { '@type': 'Question', name: 'How often is data updated?', acceptedAnswer: { '@type': 'Answer', text: 'Whale transaction data is updated every 15 minutes. Premium whale alerts sync every 10 minutes. Price data from CoinGecko is updated every 15 minutes. News is fetched continuously.' } },
    { '@type': 'Question', name: 'Can I export data?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Premium subscribers can export transaction data as CSV files from the Statistics page with filters for timestamp, token, type, USD value, blockchain, whale score, and address.' } },
    { '@type': 'Question', name: 'Can I cancel my subscription?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, cancel anytime from your Profile page. You retain Premium access until the end of your current billing period.' } },
    { '@type': 'Question', name: 'Is my data secure?', acceptedAnswer: { '@type': 'Answer', text: 'All data is encrypted using SSL/TLS. Passwords are hashed with industry-standard algorithms. We use Supabase for authentication and Stripe for payment processing.' } },
    { '@type': 'Question', name: 'How do you calculate whale scores?', acceptedAnswer: { '@type': 'Answer', text: 'Whale scores (0-100) factor in transaction size, wallet history, token holdings, frequency of large transactions, and interaction with known DEX/CEX addresses.' } },
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
