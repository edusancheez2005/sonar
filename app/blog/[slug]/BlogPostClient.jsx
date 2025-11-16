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
  'bullish-bearish-sentiment-trading': {
    title: 'Using Community Sentiment to Trade: Bullish vs Bearish Signals',
    category: 'Strategy',
    date: 'Nov 16, 2025',
    readTime: '9 min read',
    content: {
      intro: 'Community sentiment has emerged as a powerful trading indicator in cryptocurrency markets. By analyzing voting patterns, whale positioning, and crowd psychology, traders can identify high-probability setups and avoid costly mistakes. This guide explores how to leverage bullish and bearish sentiment signals for better trading decisions.',
      sections: [
        {
          title: 'Understanding Sentiment Indicators',
          content: `Community sentiment polls provide a real-time snapshot of market psychology. On Sonar Tracker, our Bullish/Bearish voting system aggregates thousands of trader opinions alongside actual whale transaction data to create a comprehensive sentiment picture.

**Key Sentiment Metrics:**
• **Vote Distribution**: The percentage split between bullish and bearish votes
• **Vote Volume**: Total number of participants indicates signal strength
• **Whale Alignment**: When sentiment matches whale buy/sell ratios
• **Sentiment Shifts**: Rapid changes in vote distribution signal potential reversals

**Why Sentiment Matters:**
Sentiment indicators work because they capture the collective wisdom (or folly) of the crowd. When combined with whale data, you can identify:
• **Contrarian Opportunities**: Extreme bearish sentiment at support levels
• **Confirmation Signals**: Bullish sentiment aligned with whale accumulation
• **Distribution Warnings**: Retail bullishness while whales are selling
• **Accumulation Phases**: Bearish sentiment during whale buying`
        },
        {
          title: 'Trading the Sentiment Extremes',
          content: `**Contrarian Strategy (Advanced)**

The most profitable trades often occur when sentiment reaches extremes:

**When Bearish Sentiment Hits 70%+:**
• Check if whale addresses are actually buying
• Look for technical support levels holding
• Consider this a potential "blood in the streets" buying opportunity
• Use tight stops below recent lows

**When Bullish Sentiment Hits 80%+:**
• Verify if whales are distributing (selling)
• Look for technical resistance levels
• Consider taking profits or reducing exposure
• Watch for sentiment/price divergences

**Real Example:**
Token XYZ shows 85% bullish votes but whale data reveals $2M net outflow. This divergence signals distribution phase - retail is buying while smart money exits. Result: 15% drop over next 48 hours.

**Confluence Trading:**
Combine sentiment with other factors:
• **Bullish Setup**: 70%+ bullish + whale accumulation + technical breakout = High conviction long
• **Bearish Setup**: 75%+ bearish + whale distribution + broken support = High conviction short or exit`
        },
        {
          title: 'Advanced Sentiment Analysis Techniques',
          content: `**Sentiment Velocity Tracking**

Track how quickly sentiment changes:
• **Rapid Shift Bullish**: Sentiment flips from 40% to 70% bullish in 24h = FOMO incoming
• **Gradual Accumulation**: Steady increase from 45% to 60% over 7 days = Healthy trend
• **Panic Capitulation**: Drop from 65% to 30% bullish in hours = Potential bottom

**Cross-Token Sentiment Correlation**

Compare sentiment across related tokens:
• If BTC sentiment turns bearish, altcoin bearish votes often follow
• Sector rotation: DeFi tokens gaining bullish votes while memes turn bearish
• Leading indicators: Major caps sentiment shifts before small caps

**Whale vs Retail Sentiment Divergence**

The most powerful signal:
• **Bullish Divergence**: Retail 70% bearish BUT whales net buying $5M+ = Major opportunity
• **Bearish Divergence**: Retail 80% bullish BUT whales net selling $10M+ = Exit signal
• **Alignment**: Both retail and whales bullish with rising volume = Continuation likely

**Time-Based Sentiment Analysis**

Different timeframes reveal different insights:
• **Hourly**: Captures immediate reactions to news/events
• **Daily**: Shows evolving narratives and trend changes
• **Weekly**: Identifies longer-term positioning and market cycles

**Practical Application:**
1. Check token's current sentiment poll
2. Compare to 24h ago and 7d ago for trend
3. Cross-reference with whale buy/sell ratio
4. Look for divergences or confirmations
5. Size position based on conviction level`
        }
      ]
    }
  },
  'top-whales-7day-analysis': {
    title: 'Top 10 Whales This Week: What Are They Trading?',
    category: 'Market Analysis',
    date: 'Nov 16, 2025',
    readTime: '10 min read',
    content: {
      intro: 'This week\'s most active crypto whales have made bold moves across multiple tokens. By analyzing their 7-day trading patterns, position sizes, and buy/sell ratios, we can identify emerging trends before they hit mainstream consciousness. Here\'s what the smart money is doing right now.',
      sections: [
        {
          title: 'How We Identify Top Whales',
          content: `Sonar Tracker's whale ranking system uses a sophisticated multi-factor algorithm to identify the most influential market participants:

**Ranking Methodology:**

**1. Net Flow Analysis (40% weight)**
• Absolute dollar value of net buys/sells over 7 days
• Whales with $10M+ net flow rank highest
• Both accumulation (buying) and distribution (selling) score equally

**2. Transaction Volume (30% weight)**
• Total dollar value of all transactions
• Higher volume = more market impact
• Minimum $50M+ in weekly volume for top 10

**3. Unique Token Diversity (20% weight)**
• Number of different tokens traded
• Diversified whales (5+ tokens) show sector expertise
• Single-token whales may signal targeted accumulation

**4. Whale Score (10% weight)**
• Historical accuracy of whale's past moves
• Address reputation and longevity
• Smart contract interaction sophistication

**Why 7 Days?**
Weekly analysis smooths out daily noise while capturing meaningful position changes. It's long enough to see strategic shifts but short enough to be actionable.

**Data Quality Filters:**
• Excludes CEX cold wallets (not real whale trading)
• Filters wash trading and self-transfers
• Requires minimum $10K per transaction
• Verifies counterparty is legitimate DEX/CEX`
        },
        {
          title: 'This Week\'s Top Trading Patterns',
          content: `**Pattern #1: DeFi Blue Chip Rotation**

Rank #1-3 whales show heavy accumulation in:
• AAVE: $15M net buying (72% buy ratio)
• COMP: $8M net buying (68% buy ratio)
• CRV: $12M net buying (75% buy ratio)

**Analysis:** Smart money is rotating back into DeFi governance tokens after 3-month lull. Historical pattern suggests 2-3 week accumulation before 30-50% moves.

**Action:** Watch for continuation. If net flow stays positive for 14 days, high probability of trend continuation.

**Pattern #2: L2 Narrative Building**

Rank #4-6 whales concentrated in:
• ARB: $22M net buying (65% buy ratio)
• OP: $18M net buying (70% buy ratio)
• MATIC: $9M net selling (35% buy ratio)

**Analysis:** Selective L2 accumulation. Arbitrum and Optimism seeing inflows while Polygon sees outflows. Narrative shift to Ethereum-aligned L2s.

**Action:** Consider ARB/OP over MATIC. Whale preference clear.

**Pattern #3: Memecoin Profit-Taking**

Rank #7-10 whales show:
• PEPE: $25M net selling (30% buy ratio)
• DOGE: $31M net selling (28% buy ratio)
• SHIB: $19M net selling (32% buy ratio)

**Analysis:** Major distribution phase in memecoins. Whales took profits after recent rallies. Expect consolidation or retracement.

**Action:** Avoid new memecoin longs until whale selling subsides.

**Pattern #4: AI Token Accumulation**

Cross-cutting pattern across ranks #2, #5, #8:
• FET: $14M net buying (78% buy ratio)
• RNDR: $11M net buying (73% buy ratio)
• OCEAN: $6M net buying (69% buy ratio)

**Analysis:** Multiple whales independently accumulating AI sector. Distributed buying is stronger signal than single whale.

**Action:** AI narrative building strength. Consider sector exposure.`
        },
        {
          title: 'How to Follow Whale Trades',
          content: `**Real-Time Monitoring Strategy**

**Step 1: Daily Whale Dashboard Check**
• Review Top 10 Whales section on Sonar dashboard
• Note any new whales entering the top 10
• Check if existing whales changed their buy/sell ratios

**Step 2: Individual Whale Deep Dive**
Click on specific whale addresses to see:
• Full transaction history with reasoning
• Counterparty analysis (which DEXs/CEXs)
• Confidence scores for each trade classification
• Token preference patterns

**Step 3: Pattern Recognition**
Look for:
• **Clustering**: 3+ whales buying same token
• **Persistence**: Same whale buying for 5+ days straight
• **Size**: Individual transactions >$1M show high conviction
• **Speed**: Rapid accumulation often precedes news/catalysts

**Step 4: Risk Management**

**Never blindly copy whale trades:**
• Whales have different time horizons (often 3-6 months)
• Whales can handle 30-50% drawdowns
• Whales may have inside information
• Whales' average buy price may be very different

**Smart Following Approach:**
• Use whale accumulation as confirmation for your own analysis
• Wait for technical entry points even if whales already bought
• Size positions smaller than whales (they have deeper pockets)
• Set stop losses 10-15% below whale entry zones

**Advanced Technique: Whale Cohort Analysis**

Track groups of whales that move together:
• **DeFi Specialists**: Always in governance tokens
• **NFT Whales**: Heavy ETH accumulation before big drops
• **Smart Money**: Early in trends, early out of tops
• **Diamond Hands**: Long-term holders, ignore short-term volatility

**Red Flags to Avoid:**
• Single whale buying while rest are selling
• Whale buying on way down (catching falling knife)
• Whale transactions on low-liquidity pairs (potential manipulation)
• Whale selling accelerating (distribution phase)

**Using Sonar's Whale Tools:**
1. Set up whale address watchlists
2. Enable notifications for large transactions
3. Compare 24h vs 7d whale sentiment
4. Cross-reference with community sentiment polls
5. Export transaction data for deeper analysis

**Practical Example:**
Whale 0x1234 (Rank #3) buys $8M AAVE over 3 days while community sentiment is 65% bearish. This divergence signals insider confidence. Wait for support level test, enter with 2% position, add on confirmation.`
        }
      ]
    }
  },
  'what-is-whale-tracking': {
    title: 'What is Whale Tracking? How It Works and Why It Matters',
    category: 'Basics',
    date: 'Aug 15, 2025',
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
    date: 'Sep 18, 2025',
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
