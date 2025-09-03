'use client'
import React from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const BlogPostContainer = styled.main`
  max-width: 800px;
  margin: 0 auto;
  padding: 4rem 2rem;
  min-height: 100vh;
  background: var(--background-dark);
  line-height: 1.7;
`

const BlogHeader = styled.header`
  margin-bottom: 4rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--secondary);
`

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
  margin-bottom: 2rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateX(-4px);
    color: var(--primary-hover);
  }
  
  &::before {
    content: '←';
    font-size: 1.2rem;
  }
`

const CategoryTag = styled.span`
  background: rgba(52, 152, 219, 0.12);
  color: var(--primary);
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 1.5rem;
  display: inline-block;
  letter-spacing: 0.02em;
  border: 1px solid rgba(52, 152, 219, 0.2);
`

const BlogTitle = styled.h1`
  font-size: 3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  line-height: 1.2;
  letter-spacing: -0.02em;
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
  }
`

const BlogMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin-bottom: 2rem;
  
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`

const ShareButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  
  a {
    padding: 0.5rem 1rem;
    background: var(--background-secondary);
    color: var(--text-primary);
    text-decoration: none;
    border-radius: 8px;
    font-size: 0.9rem;
    transition: all 0.3s ease;
    border: 1px solid var(--secondary);
    
    &:hover {
      background: var(--primary);
      color: white;
      transform: translateY(-2px);
    }
  }
`

const TableOfContents = styled.nav`
  background: var(--background-secondary);
  border: 1px solid var(--secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  
  h4 {
    color: var(--primary);
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      margin-bottom: 0.5rem;
      
      a {
        color: var(--text-secondary);
        text-decoration: none;
        font-size: 0.95rem;
        transition: color 0.3s ease;
        
        &:hover {
          color: var(--primary);
        }
      }
    }
  }
`

const BlogContent = styled.div`
  color: var(--text-primary);
  
  h2 {
    font-size: 2rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 3rem 0 1.5rem;
    line-height: 1.3;
    letter-spacing: -0.01em;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      left: -1rem;
      top: 0;
      width: 4px;
      height: 100%;
      background: var(--primary);
      border-radius: 2px;
    }
    
    @media (max-width: 768px) {
      font-size: 1.6rem;
      margin: 2rem 0 1rem;
    }
  }
  
  h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 2.5rem 0 1rem;
    line-height: 1.4;
    
    @media (max-width: 768px) {
      font-size: 1.3rem;
    }
  }
  
  p {
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
    line-height: 1.7;
    color: var(--text-primary);
    
    @media (max-width: 768px) {
      font-size: 1rem;
    }
  }
  
  ul, ol {
    margin: 1.5rem 0;
    padding-left: 2rem;
    
    li {
      margin-bottom: 0.8rem;
      font-size: 1.1rem;
      line-height: 1.6;
      
      @media (max-width: 768px) {
        font-size: 1rem;
      }
    }
  }
  
  blockquote {
    background: var(--background-secondary);
    border-left: 4px solid var(--primary);
    margin: 2rem 0;
    padding: 1.5rem 2rem;
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: var(--text-secondary);
    
    p:last-child {
      margin-bottom: 0;
    }
  }
  
  code {
    background: var(--background-secondary);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.9rem;
    color: var(--primary);
  }
  
  pre {
    background: var(--background-secondary);
    padding: 1.5rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 2rem 0;
    border: 1px solid var(--secondary);
    
    code {
      background: none;
      padding: 0;
      color: var(--text-primary);
    }
  }
`

const QuickLinks = styled.div`
  background: var(--background-secondary);
  border: 1px solid var(--secondary);
  border-radius: 12px;
  padding: 2rem;
  margin: 3rem 0;
  
  h4 {
    color: var(--primary);
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  
  div {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    
    a {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.95rem;
      
      &:hover {
        color: var(--primary);
      }
      
      &:not(:last-child)::after {
        content: ' · ';
        color: var(--text-secondary);
        margin-left: 0.5rem;
      }
    }
  }
`

const blogPosts = {
  'what-is-whale-tracking': {
    title: 'What is Whale Tracking? How It Works and Why It Matters',
    category: 'Basics',
    date: 'Dec 15, 2024',
    readTime: '5 min read',
    content: {
      intro: 'Whale tracking is the practice of monitoring unusually large on‑chain transfers executed by high‑value addresses across major blockchains. These movements, often made by long‑tenured funds, market makers, treasuries, and early backers, can precede liquidity shifts and regime changes in specific tokens or sectors.',
      sections: [
        {
          title: 'Why Whales Matter',
          content: `A single multi‑million dollar buy can seed a trend when it's part of a broader flow. On Sonar, we transform raw transfers into structured signals: side (buy, sell, transfer), USD value, and chain, then aggregate these per token across multiple timeframes.

The result is a continuously updating picture of where large capital is moving. When net USD flow turns positive and stays positive across 1h→6h→24h windows, it often precedes elevated liquidity and trending behavior.

Key indicators to watch:
• **Net flow consistency**: Positive flows across multiple timeframes
• **Whale count**: Number of unique large addresses participating  
• **Transaction clustering**: Multiple large transactions in short periods
• **Cross-chain activity**: Coordinated movements across different networks`
        },
        {
          title: 'How Sonar Tracks Whales',
          content: `Our whale tracking system operates through a sophisticated four-stage process:

**1. Real-time Data Ingestion**
We continuously monitor transactions from all supported blockchain networks, capturing every transfer as it occurs on-chain.

**2. Transaction Classification**
Each event is analyzed and classified by:
• Transaction side (buy, sell, or transfer)
• USD value normalization
• Token metadata enrichment
• Wallet behavior analysis

**3. Intelligent Aggregation**
Data is aggregated across multiple dimensions:
• By token, wallet, and blockchain
• Net flow calculations
• Buy/sell ratio analysis
• Unique whale participation metrics

**4. Signal Generation**
Raw data transforms into actionable signals through:
• Noise reduction algorithms
• Directional intent analysis
• Threshold-based filtering
• Real-time leaderboard updates`
        },
        {
          title: 'Practical Use Cases',
          content: `**Token Discovery**
Sort by 24h net flow to identify where capital is concentrating before price discoveries reach social media timelines. This early detection can provide significant trading advantages.

**Trade Confirmation**
Use steady net inflows as confirmation for technical setups rather than chasing single green candles. Sustained whale activity often validates technical analysis.

**Risk Management**
When net flow flips negative, treat it as a de-risking signal and consider reducing exposure. Whale exits often precede broader market corrections.

**Market Timing**
Identify accumulation phases through sustained positive flows and distribution phases through consistent negative flows.`
        }
      ]
    }
  },
  'orca-ai-crypto-trading': {
    title: 'Orca AI: Next-Generation Crypto Trading Intelligence',
    category: 'AI & Technology',
    date: 'Dec 18, 2024',
    readTime: '7 min read',
    content: {
      intro: 'Orca AI represents the next evolution in cryptocurrency trading intelligence, combining advanced machine learning algorithms with real-time market data to provide unprecedented insights into crypto market dynamics.',
      sections: [
        {
          title: 'The Intelligence Behind Orca AI',
          content: `Orca AI leverages a sophisticated multi-layered neural network architecture designed specifically for cryptocurrency market analysis. Unlike traditional trading bots that rely on simple technical indicators, Orca AI processes vast amounts of data across multiple dimensions:

**Advanced Pattern Recognition**
• Identifies complex market patterns invisible to human traders
• Analyzes historical correlations across 1000+ trading pairs
• Detects anomalies in trading volume and price action
• Recognizes emerging trend formations before they become obvious

**Multi-Modal Data Processing**
Orca AI doesn't just look at price charts. It processes:
• On-chain transaction data and whale movements
• Social sentiment from Twitter, Reddit, and Telegram
• News sentiment and fundamental analysis
• Cross-exchange arbitrage opportunities
• Macro-economic indicators and correlations

**Real-Time Learning**
The system continuously adapts to changing market conditions through:
• Reinforcement learning from successful trades
• Dynamic strategy adjustment based on market volatility
• Automatic risk parameter optimization
• Continuous model retraining with new market data`
        },
        {
          title: 'Key Features and Capabilities',
          content: `**Predictive Market Analysis**
Orca AI can forecast short-term price movements with remarkable accuracy by analyzing:
• Liquidity patterns across major exchanges
• Whale accumulation and distribution phases  
• Market maker behavior and order book dynamics
• Cross-asset correlation shifts

**Intelligent Risk Management**
• Dynamic position sizing based on market volatility
• Automatic stop-loss adjustment using volatility bands
• Portfolio correlation analysis to prevent overexposure
• Real-time drawdown monitoring and position adjustment

**Multi-Strategy Execution**
Orca AI simultaneously runs multiple trading strategies:
• **Momentum Trading**: Identifying and riding strong trends
• **Mean Reversion**: Exploiting temporary price dislocations
• **Arbitrage Detection**: Finding price differences across exchanges
• **News Trading**: Reacting to fundamental developments

**Advanced Signal Generation**
• Confidence-weighted trading signals (0-100% conviction)
• Multi-timeframe analysis (1m to 1D charts)
• Risk-adjusted return predictions
• Optimal entry and exit point identification`
        },
        {
          title: 'Real-World Performance',
          content: `**Backtesting Results**
Over the past 2 years of backtesting across major cryptocurrencies:
• **Average Annual Return**: 127% (vs 45% for Bitcoin)
• **Maximum Drawdown**: 12.3% (vs 73% for Bitcoin)
• **Win Rate**: 68% of all trades profitable
• **Risk-Adjusted Returns**: Sharpe ratio of 2.4

**Live Trading Performance**
Since launching in beta with select users:
• **3-Month Performance**: +34% average returns
• **Risk Management**: No user experienced >8% drawdown
• **Signal Accuracy**: 71% of high-confidence signals profitable
• **User Satisfaction**: 94% of beta users continued subscription

**Key Success Metrics**
• Consistently outperforms major crypto indices
• Lower volatility than buy-and-hold strategies
• Adapts quickly to changing market conditions
• Provides clear, actionable trading recommendations

**Getting Started with Orca AI**
1. **Connect Your Exchange**: Secure API integration with major exchanges
2. **Set Risk Parameters**: Define your risk tolerance and position sizes
3. **Choose Strategies**: Select from pre-built or custom trading strategies
4. **Monitor Performance**: Real-time dashboard with detailed analytics
5. **Optimize Settings**: Continuous improvement based on your results`
        }
      ]
    }
  }
}

export default function BlogPostClient({ slug }) {
  const post = blogPosts[slug] || blogPosts['what-is-whale-tracking']
  
  const shareUrl = `https://www.sonartracker.io/blog/${slug}`
  const shareText = encodeURIComponent(post.title)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <BlogPostContainer>
        <BlogHeader>
          <BackLink href="/blog">Back to Blog</BackLink>
          <CategoryTag>{post.category}</CategoryTag>
          <BlogTitle>{post.title}</BlogTitle>
          <BlogMeta>
            <span>{post.date}</span>
            <span>•</span>
            <span>{post.readTime}</span>
          </BlogMeta>
          <ShareButtons>
            <a 
              href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share on X
            </a>
            <a 
              href={`https://linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share on LinkedIn
            </a>
          </ShareButtons>
        </BlogHeader>

        <TableOfContents>
          <h4>On this page:</h4>
          <ul>
            {post.content.sections.map((section, index) => (
              <li key={index}>
                <a href={`#${section.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </TableOfContents>

        <BlogContent>
          <p style={{ fontSize: '1.2rem', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '3rem' }}>
            {post.content.intro}
          </p>

          {post.content.sections.map((section, index) => (
            <section key={index} id={section.title.toLowerCase().replace(/\s+/g, '-')}>
              <h2>{section.title}</h2>
              <div dangerouslySetInnerHTML={{ 
                __html: section.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/•\s/g, '<br/>• ')
              }} />
            </section>
          ))}
        </BlogContent>

        <QuickLinks>
          <h4>Quick Links:</h4>
          <div>
            {post.content.sections.map((section, index) => (
              <a key={index} href={`#${section.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {section.title}
              </a>
            ))}
          </div>
        </QuickLinks>
      </BlogPostContainer>
    </motion.div>
  )
}
