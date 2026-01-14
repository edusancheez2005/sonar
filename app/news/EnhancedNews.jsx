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

const FilterBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
`

const FilterButton = styled(motion.button)`
  background: ${props => props.$active ? colors.primary : 'rgba(54, 166, 186, 0.1)'};
  color: ${props => props.$active ? '#ffffff' : colors.textSecondary};
  border: 1px solid ${props => props.$active ? colors.primary : 'rgba(54, 166, 186, 0.2)'};
  padding: 0.625rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  
  &:hover {
    background: ${props => props.$active ? colors.primary : 'rgba(54, 166, 186, 0.15)'};
    border-color: ${colors.primary};
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  .count {
    margin-left: 0.5rem;
    opacity: 0.8;
    font-size: 0.85rem;
  }
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
  const [sentimentFilter, setSentimentFilter] = useState('all') // all | bullish | bearish | neutral

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = supabaseBrowser()
        
        // Fetch news items - get more to ensure diversity
        let newsQuery = supabase
          .from('news_items')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(500) // Fetch many to find diverse tickers
        
        if (ticker) {
          newsQuery = newsQuery.eq('ticker', ticker.toUpperCase())
        }
        
        const { data: newsData, error: newsError } = await newsQuery
        
        if (newsError) throw newsError
        
        // Filter valid articles
        const allArticles = (newsData || [])
          .filter(article => {
            const title = article.title?.trim()
            if (!title || title.toLowerCase() === 'untitled') return false
            return true
          })
        
        // STEP 1: Find ALL unique tickers in the dataset
        const tickerMap = new Map() // ticker -> [articles]
        for (const article of allArticles) {
          const t = article.ticker?.toUpperCase() || 'GENERAL'
          if (!tickerMap.has(t)) tickerMap.set(t, [])
          tickerMap.get(t).push(article)
        }
        
        // STEP 2: Get best article from each ticker (prioritize strong sentiment)
        const getBestFromTicker = (articles) => {
          // Sort by sentiment strength (strongest first)
          return [...articles].sort((a, b) => {
            const sA = Math.abs(a.sentiment_llm || a.sentiment_raw || 0)
            const sB = Math.abs(b.sentiment_llm || b.sentiment_raw || 0)
            return sB - sA
          })[0]
        }
        
        // Get unique tickers sorted by how many articles they have (more = more relevant)
        const sortedTickers = Array.from(tickerMap.entries())
          .sort((a, b) => b[1].length - a[1].length)
          .map(([ticker]) => ticker)
        
        // STEP 3: Build final list with diversity guarantee
        const finalArticles = []
        const usedTickers = new Set()
        const usedIds = new Set()
        
        // First: Pick one article from at least 5 different tickers (or all available)
        const minDiverseTickers = Math.min(5, sortedTickers.length)
        for (let i = 0; i < minDiverseTickers && finalArticles.length < 15; i++) {
          const t = sortedTickers[i]
          const best = getBestFromTicker(tickerMap.get(t))
          if (best && !usedIds.has(best.id)) {
            finalArticles.push(best)
            usedTickers.add(t)
            usedIds.add(best.id)
          }
        }
        
        // STEP 4: Fill remaining slots with sentiment-balanced articles
        // Categorize remaining articles
        const remaining = allArticles.filter(a => !usedIds.has(a.id))
        const bullish = remaining.filter(a => (a.sentiment_llm || a.sentiment_raw || 0) > 0.2)
          .sort((a, b) => (b.sentiment_llm || b.sentiment_raw || 0) - (a.sentiment_llm || a.sentiment_raw || 0))
        const bearish = remaining.filter(a => (a.sentiment_llm || a.sentiment_raw || 0) < -0.2)
          .sort((a, b) => (a.sentiment_llm || a.sentiment_raw || 0) - (b.sentiment_llm || b.sentiment_raw || 0))
        const neutral = remaining.filter(a => {
          const s = a.sentiment_llm || a.sentiment_raw || 0
          return s >= -0.2 && s <= 0.2
        }).sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
        
        // Add more: aim for ~6 bullish, ~4 bearish, ~3 neutral total (minus what we already have)
        const addFromCategory = (list, targetTotal) => {
          let added = 0
          for (const article of list) {
            if (finalArticles.length >= 15) break
            if (!usedIds.has(article.id)) {
              finalArticles.push(article)
              usedIds.add(article.id)
              added++
              if (added >= targetTotal) break
            }
          }
        }
        
        // Calculate how many we need from each category
        const currentBullish = finalArticles.filter(a => (a.sentiment_llm || a.sentiment_raw || 0) > 0.2).length
        const currentBearish = finalArticles.filter(a => (a.sentiment_llm || a.sentiment_raw || 0) < -0.2).length
        const currentNeutral = finalArticles.filter(a => {
          const s = a.sentiment_llm || a.sentiment_raw || 0
          return s >= -0.2 && s <= 0.2
        }).length
        
        addFromCategory(bullish, Math.max(0, 6 - currentBullish))
        addFromCategory(bearish, Math.max(0, 4 - currentBearish))
        addFromCategory(neutral, Math.max(0, 3 - currentNeutral))
        
        // If still under 15, add any remaining
        if (finalArticles.length < 15) {
          const stillRemaining = allArticles.filter(a => !usedIds.has(a.id))
          for (const article of stillRemaining) {
            if (finalArticles.length >= 15) break
            finalArticles.push(article)
          }
        }
        
        // Sort final list: interleave by sentiment for visual variety
        finalArticles.sort((a, b) => {
          const sA = a.sentiment_llm || a.sentiment_raw || 0
          const sB = b.sentiment_llm || b.sentiment_raw || 0
          // Alternate: bullish, bearish, neutral pattern
          const catA = sA > 0.2 ? 0 : sA < -0.2 ? 1 : 2
          const catB = sB > 0.2 ? 0 : sB < -0.2 ? 1 : 2
          if (catA !== catB) return catA - catB
          return Math.abs(sB) - Math.abs(sA) // Within category, strongest first
        })
        
        // Apply sentiment filter if set
        let filteredBysentiment = finalArticles
        if (sentimentFilter !== 'all') {
          filteredBysentiment = finalArticles.filter(article => {
            const s = article.sentiment_llm || article.sentiment_raw || 0
            if (sentimentFilter === 'bullish') return s > 0.2
            if (sentimentFilter === 'bearish') return s < -0.2
            if (sentimentFilter === 'neutral') return s >= -0.2 && s <= 0.2
            return true
          })
        }
        
        setNews(filteredBysentiment.slice(0, 15))
        
      } catch (error) {
        console.error('Error fetching news:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [ticker, sentimentFilter])

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

  // Count articles by sentiment for filter badges
  const allArticlesCounts = {
    bullish: news.filter(a => (a.sentiment_llm || a.sentiment_raw || 0) > 0.2).length,
    bearish: news.filter(a => (a.sentiment_llm || a.sentiment_raw || 0) < -0.2).length,
    neutral: news.filter(a => {
      const s = a.sentiment_llm || a.sentiment_raw || 0
      return s >= -0.2 && s <= 0.2
    }).length
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
      
      <FilterBar>
        <FilterButton
          $active={sentimentFilter === 'all'}
          onClick={() => setSentimentFilter('all')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          All News
          <span className="count">({news.length})</span>
        </FilterButton>
        <FilterButton
          $active={sentimentFilter === 'bullish'}
          onClick={() => setSentimentFilter('bullish')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            borderColor: sentimentFilter === 'bullish' ? colors.sentimentBull : 'rgba(22, 199, 132, 0.2)',
            background: sentimentFilter === 'bullish' ? colors.sentimentBull : 'rgba(22, 199, 132, 0.08)',
            color: sentimentFilter === 'bullish' ? '#ffffff' : colors.sentimentBull
          }}
        >
          Bullish
          <span className="count">({allArticlesCounts.bullish})</span>
        </FilterButton>
        <FilterButton
          $active={sentimentFilter === 'bearish'}
          onClick={() => setSentimentFilter('bearish')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            borderColor: sentimentFilter === 'bearish' ? colors.sentimentBear : 'rgba(237, 76, 92, 0.2)',
            background: sentimentFilter === 'bearish' ? colors.sentimentBear : 'rgba(237, 76, 92, 0.08)',
            color: sentimentFilter === 'bearish' ? '#ffffff' : colors.sentimentBear
          }}
        >
          Bearish
          <span className="count">({allArticlesCounts.bearish})</span>
        </FilterButton>
        <FilterButton
          $active={sentimentFilter === 'neutral'}
          onClick={() => setSentimentFilter('neutral')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            borderColor: sentimentFilter === 'neutral' ? colors.sentimentNeutral : 'rgba(160, 178, 198, 0.2)',
            background: sentimentFilter === 'neutral' ? 'rgba(160, 178, 198, 0.2)' : 'rgba(160, 178, 198, 0.08)',
            color: sentimentFilter === 'neutral' ? '#ffffff' : colors.sentimentNeutral
          }}
        >
          Neutral
          <span className="count">({allArticlesCounts.neutral})</span>
        </FilterButton>
      </FilterBar>
      
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
