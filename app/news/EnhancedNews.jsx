'use client'

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const colors = {
  bgDark: '#0a1621',
  bgCard: '#0d2134',
  bgCardHover: '#112940',
  primary: '#36a6ba',
  textPrimary: '#ffffff',
  textSecondary: '#a0b2c6',
  textMuted: '#6b7d8f',
  borderLight: 'rgba(54, 166, 186, 0.1)',
  sentimentBull: '#16c784',
  sentimentBear: '#ed4c5c',
  sentimentNeutral: '#a0b2c6',
}

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 2rem;
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`

const Title = styled.h1`
  font-size: 2.25rem;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin-bottom: 0.75rem;
  letter-spacing: -0.02em;
`

const Subtitle = styled.p`
  font-size: 1rem;
  color: ${colors.textSecondary};
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.6;
  
  span {
    color: ${colors.primary};
    font-weight: 500;
  }
`

const Divider = styled.div`
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, ${colors.primary}, ${colors.sentimentBull});
  margin: 1.5rem auto 0;
  border-radius: 2px;
`

const NewsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const NewsCard = styled(motion.a)`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1.5rem;
  align-items: start;
  background: ${colors.bgCard};
  border: 1px solid ${colors.borderLight};
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  text-decoration: none;
  transition: all 0.25s ease;
  cursor: pointer;
  
  &:hover {
    background: ${colors.bgCardHover};
    border-color: ${props => props.$neutral ? colors.sentimentNeutral : props.$bullish ? colors.sentimentBull : colors.sentimentBear};
    transform: translateX(4px);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`

const SentimentIndicator = styled.div`
  width: 4px;
  height: auto;
  align-self: stretch;
  background: ${props => props.$neutral ? colors.sentimentNeutral : props.$bullish ? colors.sentimentBull : colors.sentimentBear};
  border-radius: 2px;
  
  @media (max-width: 768px) {
    width: 100%;
    height: 4px;
    align-self: auto;
  }
`

const ContentArea = styled.div`
  flex: 1;
`

const TokenBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${colors.primary};
  background: rgba(54, 166, 186, 0.1);
  padding: 0.25rem 0.625rem;
  border-radius: 4px;
  text-transform: uppercase;
  margin-bottom: 0.625rem;
`

const NewsTitle = styled.h3`
  font-size: 1.05rem;
  font-weight: 600;
  color: ${colors.textPrimary};
  line-height: 1.5;
  margin-bottom: 0.5rem;
`

const NewsSummary = styled.p`
  font-size: 0.875rem;
  color: ${colors.textSecondary};
  line-height: 1.6;
  margin-bottom: 0.75rem;
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8rem;
  color: ${colors.textMuted};
`

const Source = styled.span`
  text-transform: capitalize;
`

const SentimentArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  min-width: 100px;
  
  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }
`

const SentimentBadge = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background: ${props => props.$neutral ? 'rgba(160, 178, 198, 0.12)' : props.$bullish ? 'rgba(22, 199, 132, 0.12)' : 'rgba(237, 76, 92, 0.12)'};
  color: ${props => props.$neutral ? colors.sentimentNeutral : props.$bullish ? colors.sentimentBull : colors.sentimentBear};
  border: 1px solid ${props => props.$neutral ? colors.sentimentNeutral : props.$bullish ? colors.sentimentBull : colors.sentimentBear};
`

const SentimentScore = styled.div`
  font-size: 0.75rem;
  color: ${colors.textMuted};
`

const Loading = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${colors.textSecondary};
  font-size: 1rem;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${colors.textSecondary};
`

// Generate a brief summary from the title
function generateSummary(title, ticker) {
  // Remove source prefixes and clean up
  const cleanTitle = title
    .replace(/^[A-Z0-9]+\s*-\s*/i, '')
    .replace(/\s*-\s*[A-Za-z]+\s*News$/i, '')
    .replace(/\s*\|.*$/i, '')
    .trim()
  
  // Create a contextual summary based on keywords
  const lowerTitle = cleanTitle.toLowerCase()
  
  if (lowerTitle.includes('etf') || lowerTitle.includes('fund')) {
    return `Institutional investment activity affecting ${ticker || 'cryptocurrency'} markets. ETF flows often signal broader market sentiment.`
  }
  if (lowerTitle.includes('price') || lowerTitle.includes('rally') || lowerTitle.includes('surge')) {
    return `Price movement update for ${ticker || 'the market'}. Monitor closely for potential trading opportunities.`
  }
  if (lowerTitle.includes('regulation') || lowerTitle.includes('sec') || lowerTitle.includes('law')) {
    return `Regulatory developments that may impact ${ticker || 'crypto'} markets. Policy changes can create volatility.`
  }
  if (lowerTitle.includes('whale') || lowerTitle.includes('accumulation')) {
    return `Large holder activity detected. Whale movements often precede significant price action.`
  }
  if (lowerTitle.includes('bank') || lowerTitle.includes('institution')) {
    return `Traditional finance institutions showing interest in ${ticker || 'cryptocurrency'}. Adoption signals.`
  }
  if (lowerTitle.includes('bitcoin') || lowerTitle.includes('btc')) {
    return `Bitcoin market update. As the leading cryptocurrency, BTC movements influence the broader market.`
  }
  if (lowerTitle.includes('ethereum') || lowerTitle.includes('eth')) {
    return `Ethereum ecosystem news. ETH developments impact DeFi and Layer 2 solutions.`
  }
  
  return `Market intelligence for ${ticker || 'cryptocurrency'} investors. Stay informed on the latest developments.`
}

export default function EnhancedNews({ ticker = null }) {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = supabaseBrowser()
        
        // Fetch news items
        let newsQuery = supabase
          .from('news_items')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(100) // Fetch more to filter
        
        if (ticker) {
          newsQuery = newsQuery.eq('ticker', ticker.toUpperCase())
        }
        
        const { data: newsData, error: newsError } = await newsQuery
        
        if (newsError) throw newsError
        
        // Filter and process news - ensure diversity of coins and sentiments
        const allFiltered = (newsData || [])
          .filter(article => {
            const title = article.title?.trim()
            if (!title || title.toLowerCase() === 'untitled') return false
            return true // Accept all articles with valid titles
          })
        
        // Categorize by sentiment
        const bullish = allFiltered.filter(a => (a.sentiment_llm || a.sentiment_raw || 0) > 0.2)
        const bearish = allFiltered.filter(a => (a.sentiment_llm || a.sentiment_raw || 0) < -0.2)
        const neutral = allFiltered.filter(a => {
          const s = a.sentiment_llm || a.sentiment_raw || 0
          return s >= -0.2 && s <= 0.2
        })
        
        // Sort each category by sentiment strength
        bullish.sort((a, b) => (b.sentiment_llm || b.sentiment_raw || 0) - (a.sentiment_llm || a.sentiment_raw || 0))
        bearish.sort((a, b) => (a.sentiment_llm || a.sentiment_raw || 0) - (b.sentiment_llm || b.sentiment_raw || 0))
        neutral.sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
        
        // Ensure diversity: at least 5 different tickers
        const usedTickers = new Set()
        const diverseArticles = []
        
        // First pass: pick unique tickers from each category
        const pickDiverse = (list, count) => {
          const picked = []
          for (const article of list) {
            const ticker = article.ticker?.toUpperCase() || 'GENERAL'
            if (!usedTickers.has(ticker) || usedTickers.size >= 5) {
              if (!usedTickers.has(ticker)) usedTickers.add(ticker)
              picked.push(article)
              if (picked.length >= count) break
            }
          }
          return picked
        }
        
        // Pick articles ensuring diversity
        const diverseBullish = pickDiverse(bullish, 6)
        const diverseBearish = pickDiverse(bearish, 4)
        const diverseNeutral = pickDiverse(neutral, 3)
        
        // If we still need more diverse tickers, add from remaining
        if (usedTickers.size < 5) {
          const allRemaining = [...bullish, ...bearish, ...neutral]
            .filter(a => !diverseBullish.includes(a) && !diverseBearish.includes(a) && !diverseNeutral.includes(a))
          for (const article of allRemaining) {
            const ticker = article.ticker?.toUpperCase() || 'GENERAL'
            if (!usedTickers.has(ticker)) {
              usedTickers.add(ticker)
              diverseArticles.push(article)
              if (usedTickers.size >= 5) break
            }
          }
        }
        
        // Combine: interleave bullish, bearish, neutral
        const combined = []
        const maxLen = Math.max(diverseBullish.length, diverseBearish.length, diverseNeutral.length)
        for (let i = 0; i < maxLen; i++) {
          if (diverseBullish[i]) combined.push(diverseBullish[i])
          if (diverseBearish[i]) combined.push(diverseBearish[i])
          if (diverseNeutral[i]) combined.push(diverseNeutral[i])
        }
        
        // Add any extra diverse articles
        combined.push(...diverseArticles)
        
        // Take top 15
        setNews(combined.slice(0, 15))
        
      } catch (error) {
        console.error('Error fetching news:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [ticker])

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const formatSource = (source) => {
    if (!source) return 'News'
    return source
      .replace(/_/g, ' ')
      .replace(/media$/i, '')
      .replace(/news$/i, '')
      .trim() || 'News'
  }

  if (loading) {
    return <Loading>Analyzing market sentiment...</Loading>
  }

  if (news.length === 0) {
    return (
      <EmptyState>
        No significant sentiment signals found{ticker ? ` for ${ticker}` : ''} at this time.
      </EmptyState>
    )
  }

  return (
    <Container>
      {!ticker && (
        <Header>
          <Title>Crypto Market Intelligence</Title>
          <Subtitle>
            Real-time news analyzed by <span>ORCA's proprietary LLM</span> for actionable sentiment signals
          </Subtitle>
          <Divider />
        </Header>
      )}
      
      <NewsList>
        {news.map((article, index) => {
          const sentiment = article.sentiment_llm || article.sentiment_raw || 0
          const isBullish = sentiment > 0.2
          const isBearish = sentiment < -0.2
          const isNeutral = !isBullish && !isBearish
          const score = Math.abs(sentiment * 100).toFixed(0)
          
          const getSentimentLabel = () => {
            if (isBullish) return 'Bullish'
            if (isBearish) return 'Bearish'
            return 'Neutral'
          }
          
          return (
            <NewsCard
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              $bullish={isBullish}
              $neutral={isNeutral}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
            >
              <SentimentIndicator $bullish={isBullish} $neutral={isNeutral} />
              
              <ContentArea>
                {article.ticker && (
                  <TokenBadge>{article.ticker}</TokenBadge>
                )}
                <NewsTitle>{article.title}</NewsTitle>
                <NewsSummary>
                  {generateSummary(article.title, article.ticker)}
                </NewsSummary>
                <MetaRow>
                  <Source>{formatSource(article.source)}</Source>
                  <span>•</span>
                  <span>{formatTimeAgo(article.published_at)}</span>
                </MetaRow>
              </ContentArea>
              
              <SentimentArea>
                <SentimentBadge $bullish={isBullish} $neutral={isNeutral}>
                  {getSentimentLabel()}
                </SentimentBadge>
                <SentimentScore>
                  Confidence: {score}%
                </SentimentScore>
              </SentimentArea>
            </NewsCard>
          )
        })}
      </NewsList>
    </Container>
  )
}
