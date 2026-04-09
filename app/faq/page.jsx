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
    category: 'About Sonar Tracker',
    items: [
      {
        question: 'What is Sonar Tracker?',
        answer: 'Sonar Tracker is a real-time cryptocurrency whale transaction monitoring and analytics platform. We track large transactions (over $10,000) across 10+ blockchains including Ethereum, Bitcoin, Solana, Polygon, and BSC. Our AI analyst <a href="/ai-advisor">ORCA</a> provides plain-English interpretation of whale movements to help traders make data-driven decisions. Over 500 traders use Sonar for whale intelligence.'
      },
      {
        question: 'What is ORCA AI?',
        answer: 'ORCA is Sonar Tracker\'s purpose-built AI analyst for on-chain whale intelligence. Unlike generic chatbots (ChatGPT, Claude), ORCA connects to real-time blockchain data and provides specific, timestamped analysis — including buy/sell classification, pattern recognition, whale clustering detection, and actionable market interpretation. <a href="/ai-advisor">Try ORCA here</a>.'
      },
      {
        question: 'What is a crypto whale?',
        answer: 'A crypto whale is any wallet or entity holding enough cryptocurrency to significantly influence its price through a single transaction. Thresholds vary: typically 1,000+ BTC ($60M+), 10,000+ ETH ($25M+), or top 100 holders for altcoins. Whale categories include institutional investors (hedge funds, VCs), exchange cold wallets, protocol treasuries, early adopters, and government-seized assets.'
      },
      {
        question: 'How does whale tracking work?',
        answer: 'Sonar continuously monitors blockchain networks for transactions above $10,000. Each transaction is classified as BUY, SELL, TRANSFER, or DEFI using AI. Data is aggregated into <a href="/dashboard">dashboards</a> showing net flow direction, <a href="/whales/leaderboard">whale leaderboards</a>, and buy/sell ratios — revealing whether whales are accumulating or distributing specific tokens.'
      },
      {
        question: 'Do whale movements actually affect crypto prices?',
        answer: 'Yes. Whale transactions affect prices through three mechanisms: direct market impact (large orders moving price), sentiment cascades (other traders front-running whale moves), and liquidity shifts (DeFi liquidity additions/removals). Real examples include Germany\'s 50,000 BTC liquidation causing a 24% drop in July 2024 and Jump Trading\'s ETH dump contributing to a 35% crash in August 2024.'
      }
    ]
  },
  {
    category: 'Features & Functionality',
    items: [
      {
        question: 'What blockchains does Sonar Tracker support?',
        answer: 'Sonar monitors whale transactions across Ethereum, Bitcoin, Solana, Polygon, Binance Smart Chain, Tron, Arbitrum, Avalanche, Optimism, and other major blockchains. All chains are tracked in a unified <a href="/dashboard">dashboard</a> with AI-powered classification and analysis.'
      },
      {
        question: 'How do I track a specific wallet?',
        answer: 'Navigate to the <a href="/wallet-tracker">Wallet Tracker</a> page and paste any blockchain address. Sonar will display all transactions in real time, including historical activity, DeFi interactions, and token holdings. You can set alerts to be notified when that wallet makes any transaction above your threshold.'
      },
      {
        question: 'How accurate is the buy/sell classification?',
        answer: 'Sonar\'s AI classification achieves high accuracy by analyzing DEX interactions, exchange deposit/withdrawal patterns, and historical wallet behavior. Edge cases like OTC deals or complex multi-hop transactions may require additional context. ORCA AI can provide deeper interpretation when needed.'
      },
      {
        question: 'How often is data updated?',
        answer: 'Whale transaction data updates every 15 minutes. Price data from Binance refreshes in real-time. News articles are ingested continuously. ORCA AI accesses the latest data for every query.'
      },
      {
        question: 'Can I export data?',
        answer: 'Yes. Pro subscribers can export transaction data as CSV files from the <a href="/statistics">Statistics page</a>. Exports include timestamp, token, transaction type, USD value, blockchain, whale score, address, and transaction hash. Apply filters first to get exactly the data you need.'
      },
      {
        question: 'How do I know if a whale is buying or selling?',
        answer: 'Sonar\'s AI classifies each transaction automatically. Key signals: tokens moving TO exchanges indicate selling intent, tokens moving FROM exchanges indicate accumulation. Net flow positive over multiple days = buying. Net flow negative with accelerating volume = distribution. Ask <a href="/ai-advisor">ORCA AI</a> for instant analysis on any token.'
      },
      {
        question: 'What is the minimum transaction size tracked?',
        answer: 'Sonar tracks transactions with a minimum USD value of $10,000. This threshold captures meaningful whale activity while filtering retail-level noise.'
      },
      {
        question: 'Can I get whale alerts on Telegram?',
        answer: 'Telegram integration is on our roadmap. Currently, Sonar delivers alerts via email and in-app notifications. For Telegram-based whale alerts, Whale Alert and ClankApp offer this feature, though without AI analysis. Sonar\'s in-app alerts are faster and more detailed.'
      },
      {
        question: 'Can I get whale alerts on Twitter?',
        answer: 'Sonar currently delivers alerts via email and in-app notifications. For public whale alerts on Twitter/X, follow <a href="https://twitter.com/whale_alert" target="_blank" rel="noopener noreferrer">@whale_alert</a> and <a href="https://twitter.com/lookonchain" target="_blank" rel="noopener noreferrer">@lookonchain</a>. Sonar provides deeper analysis than social-based alerts.'
      }
    ]
  },
  {
    category: 'Comparisons',
    items: [
      {
        question: 'How is Sonar Tracker different from Whale Alert?',
        answer: 'Whale Alert broadcasts raw large transactions with no context. Sonar classifies every transaction as BUY, SELL, TRANSFER, or DEFI using AI. ORCA provides plain-English interpretation of what each move means. Sonar includes <a href="/dashboard">dashboards</a>, net flow analytics, <a href="/wallet-tracker">wallet tracking</a>, custom alerts, and sentiment analysis — none of which Whale Alert offers. <a href="/blog/whale-alert-alternative">Read our full comparison</a>.'
      },
      {
        question: 'How is Sonar Tracker different from Nansen?',
        answer: 'Nansen ($150+/month) has deeper wallet labeling with 300M+ labeled addresses and institutional-grade Smart Money tracking. Sonar ($7.99/month) provides multi-chain whale tracking, ORCA AI analysis, real-time dashboards, and custom alerts at a fraction of the cost. For most retail traders, Sonar delivers 80% of the actionable intelligence at 5% of the price. <a href="/blog/whale-alert-alternative">Read our comparison guide</a>.'
      },
      {
        question: 'How does Sonar compare to Arkham Intelligence?',
        answer: 'Arkham excels at entity identification and visual transaction graphs with a generous free tier. Sonar offers AI-powered classification via ORCA, real-time dashboards, and wallet tracking at $7.99/month. Arkham\'s premium features require ARKM token staking. Both are strong — many traders use Arkham for research and Sonar for real-time whale intelligence and AI analysis.'
      }
    ]
  },
  {
    category: 'Pricing & Billing',
    items: [
      {
        question: 'How much does Sonar Tracker cost?',
        answer: 'Sonar Tracker Pro costs $7.99 per month, billed monthly. Cancel anytime with no commitment. This includes full whale tracking, ORCA AI access (10 queries/day), custom alerts, CSV data export, and priority support. Visit the <a href="/subscribe">pricing page</a> to subscribe.'
      },
      {
        question: 'Is there a free tier?',
        answer: 'Yes. Free users can access crypto news, market pulse data, top net inflows/outflows, and basic dashboard views. The Pro plan ($7.99/month) unlocks full whale tracking, ORCA AI, detailed statistics, custom alerts, and CSV export.'
      },
      {
        question: 'Can I cancel my subscription?',
        answer: 'Yes. Cancel anytime from your <a href="/profile">Profile page</a> by clicking "Manage Billing & Subscription." You retain Pro access until the end of your current billing period. No cancellation fees.'
      },
      {
        question: 'Will my subscription auto-renew?',
        answer: 'Yes. Subscriptions automatically renew monthly at $7.99 unless cancelled. Cancel before your next billing date to avoid being charged. All payments are processed securely through Stripe.'
      }
    ]
  },
  {
    category: 'Security & Privacy',
    items: [
      {
        question: 'Is my data secure?',
        answer: 'All data is encrypted using SSL/TLS in transit. Passwords are hashed with industry-standard algorithms. We use Supabase for secure authentication and Stripe for payment processing. We never store raw credit card information.'
      },
      {
        question: 'Do you sell my data?',
        answer: 'No. We never sell personal information to third parties. We only share data with essential service providers (hosting, payment processing) who are contractually obligated to protect your information. Read our full <a href="/privacy">Privacy Policy</a>.'
      },
      {
        question: 'Does Sonar Tracker provide financial advice?',
        answer: 'No. Sonar Tracker and ORCA AI provide data-backed analysis and interpretation of on-chain whale activity. This is informational content, not financial advice. Always do your own research and consult a qualified financial advisor before making investment decisions.'
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
