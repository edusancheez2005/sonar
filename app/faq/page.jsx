'use client'
import { useState } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1621 0%, #0f1922 50%, #0a1621 100%);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(54, 166, 186, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(46, 204, 113, 0.06) 0%, transparent 50%);
    pointer-events: none;
  }
`

const Content = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 8rem 2rem 4rem;
  position: relative;
  z-index: 1;
`

const Title = styled(motion.h1)`
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary) 0%, #2ecc71 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`

const Subtitle = styled.p`
  text-align: center;
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-bottom: 3rem;
`

const SearchBar = styled.div`
  margin-bottom: 3rem;
`

const SearchInput = styled.input`
  width: 100%;
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  color: var(--text-primary);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(54, 166, 186, 0.15);
  }
`

const FAQItem = styled(motion.div)`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 12px;
  margin-bottom: 1rem;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(54, 166, 186, 0.4);
  }
`

const Question = styled.button`
  width: 100%;
  background: none;
  border: none;
  color: var(--text-primary);
  padding: 1.5rem;
  text-align: left;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: color 0.3s ease;

  &:hover {
    color: var(--primary);
  }

  svg {
    width: 24px;
    height: 24px;
    transition: transform 0.3s ease;
    flex-shrink: 0;
    margin-left: 1rem;
  }

  ${props => props.$isOpen && `
    color: var(--primary);
    
    svg {
      transform: rotate(180deg);
    }
  `}
`

const Answer = styled(motion.div)`
  color: var(--text-secondary);
  padding: 0 1.5rem 1.5rem;
  line-height: 1.8;

  p {
    margin-bottom: 1rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  ul {
    margin: 0.5rem 0;
    padding-left: 2rem;
  }

  li {
    margin-bottom: 0.5rem;
  }

  strong {
    color: var(--text-primary);
  }

  a {
    color: var(--primary);
    text-decoration: none;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }
  }
`

const CategoryTitle = styled.h2`
  color: var(--primary);
  font-size: 1.5rem;
  margin: 2rem 0 1rem;
  font-weight: 600;
`

const NoResults = styled.div`
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  font-size: 1.1rem;
`

const faqData = [
  {
    category: 'Getting Started',
    items: [
      {
        question: 'What is Sonar Tracker?',
        answer: 'Sonar Tracker is a real-time cryptocurrency whale transaction monitoring and analytics platform. We track large transactions (over $10,000) across multiple blockchains and provide AI-powered insights to help traders make informed decisions. Our platform includes whale activity tracking, sentiment analysis, market statistics, and our AI advisor Orca 2.0.'
      },
      {
        question: 'How do I sign up?',
        answer: 'Click the "Login" button in the top navigation bar, then click "Sign up" on the login page. Enter your email and create a secure password. You\'ll be instantly logged in and can start exploring whale activity data immediately.'
      },
      {
        question: 'What is whale activity?',
        answer: 'Whale activity refers to large cryptocurrency transactions made by individuals or entities holding significant amounts of crypto (known as "whales"). These transactions can indicate market sentiment and potential price movements. Sonar Tracker monitors transactions over $10,000 across multiple blockchains. Premium subscribers also get access to real-time whale alerts for transactions over $500k from exchanges and known whale addresses.'
      },
      {
        question: 'Do I need a subscription to use Sonar Tracker?',
        answer: 'Free users can access news, market pulse, top net inflows/outflows, and basic dashboard views. A Premium subscription ($7.99/month) unlocks full access to advanced analytics, real-time whale alerts, Orca 2.0 AI advisor, detailed statistics, CSV exports, custom notifications, and priority support.'
      }
    ]
  },
  {
    category: 'Features & Functionality',
    items: [
      {
        question: 'What data does Sonar Tracker provide?',
        answer: 'Sonar Tracker provides: Real-time whale transactions with transaction hashes and addresses; Buy/Sell classification powered by AI; Token-specific analytics including volume, net flow, and whale counts; Market sentiment analysis; Live price data from CoinGecko; Cryptocurrency news from CryptoPanic; Interactive charts and visualizations; CSV data export for Premium users.'
      },
      {
        question: 'How accurate is the buy/sell classification?',
        answer: 'Our AI-powered classification system analyzes transaction patterns, DEX interactions, and on-chain data to classify transactions as BUY, SELL, TRANSFER, or DEFI. The system has been trained on historical whale activity and achieves high accuracy. However, blockchain data can be complex, and some edge cases may require manual verification.'
      },
      {
        question: 'What is Orca 2.0?',
        answer: 'Orca 2.0 is our AI-powered market advisor that provides in-depth token analysis. It analyzes whale activity, price momentum, trading volume, and news sentiment to generate actionable insights. Premium users get access to advanced queries and personalized recommendations.'
      },
      {
        question: 'How often is data updated?',
        answer: 'Whale transaction data is updated every 15 minutes to ensure near real-time accuracy. Premium whale alerts sync every 10 minutes with Whale Alert API for the latest large transactions. Price data from CoinGecko is updated every 15 minutes. News articles from CryptoPanic are fetched continuously and displayed as they\'re published.'
      },
      {
        question: 'Can I export data?',
        answer: 'Yes! Premium subscribers can export transaction data as CSV files from the Statistics page. Click the "Export CSV" button after applying your desired filters. Exports include timestamp, token, transaction type, USD value, blockchain, whale score, address, and transaction hash.'
      }
    ]
  },
  {
    category: 'Subscriptions & Billing',
    items: [
      {
        question: 'How much does Premium cost?',
        answer: 'Sonar Tracker Pro costs $7.99 per month, billed monthly. You can cancel anytime with no long-term commitment. All payments are processed securely through Stripe.'
      },
      {
        question: 'How do I subscribe to Premium?',
        answer: 'Visit the <a href="/pricing">Pricing page</a> and click "Go Premium". You\'ll be redirected to a secure Stripe checkout page where you can enter your payment information. Once payment is confirmed, you\'ll instantly gain access to all Premium features.'
      },
      {
        question: 'Can I cancel my subscription?',
        answer: 'Yes, you can cancel your subscription at any time from your <a href="/profile">Profile page</a>. Click "Manage Billing & Subscription" to access the Stripe customer portal where you can cancel. You\'ll continue to have Premium access until the end of your current billing period.'
      },
      {
        question: 'Do you offer refunds?',
        answer: 'All fees are non-refundable except as required by law. If you cancel your subscription, you\'ll retain Premium access until the end of your current billing period, but no refunds will be issued for partial months.'
      },
      {
        question: 'Will my subscription auto-renew?',
        answer: 'Yes, subscriptions automatically renew monthly unless cancelled. You\'ll be charged $7.99 on the same day each month. You can cancel at any time before your next billing date to avoid being charged.'
      }
    ]
  },
  {
    category: 'Technical & Data Questions',
    items: [
      {
        question: 'Which blockchains do you support?',
        answer: 'Sonar Tracker monitors whale transactions across Ethereum (ERC-20 tokens), Bitcoin, Tron, Ripple, Binance Smart Chain, Polygon, Avalanche, and other major blockchains. Our whale alert system tracks large transactions ($500k+) from exchanges, known whale addresses, and significant wallet movements. Premium subscribers get real-time access to verified whale transactions powered by Whale Alert API.'
      },
      {
        question: 'What is the minimum transaction size tracked?',
        answer: 'Sonar Tracker monitors transactions with a minimum USD value of $10,000. This threshold ensures we\'re capturing meaningful whale activity that can impact market sentiment and price movements.'
      },
      {
        question: 'How do you calculate whale scores?',
        answer: 'Whale scores (0-100) are calculated based on multiple factors including transaction size, wallet history, token holdings, frequency of large transactions, and interaction with known DEX/CEX addresses. Higher scores indicate more influential whale wallets.'
      },
      {
        question: 'What does "sentiment" mean?',
        answer: 'Sentiment (Bullish, Neutral, Bearish) is determined by analyzing the ratio of buy vs. sell transactions, net capital flow, whale participation, recent momentum, price changes, and news sentiment. Each token has a dynamically calculated sentiment score updated in real-time.'
      },
      {
        question: 'Why do some tokens show $0 or "No data"?',
        answer: 'Tokens showing $0 or "No data" have not had any whale transactions (over $10k) in the selected timeframe. For popular tokens without whale data, we display market data from CoinGecko including 24h volume, market cap, and price changes as a fallback.'
      }
    ]
  },
  {
    category: 'Account & Privacy',
    items: [
      {
        question: 'Is my data secure?',
        answer: 'Yes. We take security seriously. All data transmitted between your device and our servers is encrypted using SSL/TLS. Passwords are hashed and salted using industry-standard algorithms. We use Supabase for secure authentication and database management, and Stripe for payment processing.'
      },
      {
        question: 'Do you sell my data?',
        answer: 'No, we never sell your personal information to third parties. We only share data with essential service providers (hosting, payment processing) who are contractually obligated to protect your information. Read our full <a href="/privacy">Privacy Policy</a> for details.'
      },
      {
        question: 'How can I delete my account?',
        answer: 'To delete your account, please contact us at <a href="mailto:eduardo@sonartracker.io">eduardo@sonartracker.io</a> with your request. We\'ll process your account deletion within 30 days in accordance with GDPR regulations.'
      },
      {
        question: 'How do you use cookies?',
        answer: 'We use essential cookies to keep you logged in and remember your preferences. We also use analytics cookies to understand usage patterns and improve our service. You can control cookies through your browser settings, but disabling them may affect functionality.'
      }
    ]
  },
  {
    category: 'Troubleshooting',
    items: [
      {
        question: 'Why isn\'t the dashboard showing data?',
        answer: 'If the dashboard shows no data, try: Hard refreshing your browser (Ctrl+Shift+R or Cmd+Shift+R); Clearing your browser cache; Checking if you\'re logged in to a Premium account; Verifying your internet connection. If the issue persists, contact support.'
      },
      {
        question: 'I forgot my password. How do I reset it?',
        answer: 'Password reset functionality is coming soon. For now, if you\'ve forgotten your password, please contact us at <a href="mailto:eduardo@sonartracker.io">eduardo@sonartracker.io</a> and we\'ll help you regain access to your account.'
      },
      {
        question: 'Why am I seeing "No whale activity" for a token?',
        answer: 'This means no transactions over $10,000 have been detected for that token in the selected timeframe. This is normal for smaller tokens or during low-activity periods. Try expanding your time range (e.g., from 24h to 7d) to see more data.'
      },
      {
        question: 'The page is loading slowly. What can I do?',
        answer: 'Slow loading can be caused by: High server traffic during market volatility; Large datasets being processed; Slow internet connection. Try refreshing the page, reducing your time range filter, or contacting support if the issue persists.'
      }
    ]
  }
]

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const toggleFAQ = (categoryIndex, itemIndex) => {
    const index = `${categoryIndex}-${itemIndex}`
    setOpenIndex(openIndex === index ? null : index)
  }

  const filteredFAQ = faqData.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0)

  return (
    <PageContainer>
      <Content>
        <Title
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Frequently Asked Questions
        </Title>
        <Subtitle>Find answers to common questions about Sonar Tracker</Subtitle>

        <SearchBar>
          <SearchInput
            type="text"
            placeholder="Search FAQs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchBar>

        {filteredFAQ.length === 0 ? (
          <NoResults>
            No results found for "{searchTerm}". Try a different search term or <a href="/contact" style={{ color: 'var(--primary)' }}>contact us</a> for help.
          </NoResults>
        ) : (
          filteredFAQ.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <CategoryTitle>{category.category}</CategoryTitle>
              {category.items.map((item, itemIndex) => {
                const index = `${categoryIndex}-${itemIndex}`
                const isOpen = openIndex === index

                return (
                  <FAQItem
                    key={itemIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: categoryIndex * 0.1 + itemIndex * 0.05, duration: 0.3 }}
                  >
                    <Question
                      onClick={() => toggleFAQ(categoryIndex, itemIndex)}
                      $isOpen={isOpen}
                    >
                      {item.question}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Question>
                    <AnimatePresence>
                      {isOpen && (
                        <Answer
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div dangerouslySetInnerHTML={{ __html: item.answer }} />
                        </Answer>
                      )}
                    </AnimatePresence>
                  </FAQItem>
                )
              })}
            </div>
          ))
        )}

        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Still have questions?
          </p>
          <a
            href="/contact"
            style={{
              display: 'inline-block',
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, var(--primary) 0%, #2ecc71 100%)',
              color: 'white',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 600,
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Contact Support
          </a>
        </div>
      </Content>
    </PageContainer>
  )
}
