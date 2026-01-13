'use client'

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const colors = {
  bgDark: '#0a1621',
  bgCard: '#0d2134',
  primary: '#36a6ba',
  textPrimary: '#ffffff',
  textSecondary: '#a0b2c6',
  borderLight: 'rgba(54, 166, 186, 0.1)',
  sentimentBull: '#16c784',
  sentimentBear: '#ed4c5c',
  sentimentNeutral: '#f2bc1d'
}

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
`

const Header = styled.div`
  margin-bottom: 2rem;
`

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin-bottom: 0.5rem;
`

const Subtitle = styled.p`
  font-size: 1rem;
  color: ${colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  strong {
    color: ${colors.primary};
    font-weight: 600;
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const NewsCard = styled(motion.article)`
  background: ${colors.bgCard};
  border: 1px solid ${colors.borderLight};
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    border-color: ${colors.primary};
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
`

const SourceBadge = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${colors.textSecondary};
  background: rgba(54, 166, 186, 0.1);
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  text-transform: uppercase;
`

const SentimentBadge = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.5rem 0.875rem;
  border-radius: 8px;
  background: ${props => {
    if (props.$score > 0.2) return 'rgba(22, 199, 132, 0.15)'
    if (props.$score < -0.2) return 'rgba(237, 76, 92, 0.15)'
    return 'rgba(242, 188, 29, 0.15)'
  }};
  color: ${props => {
    if (props.$score > 0.2) return colors.sentimentBull
    if (props.$score < -0.2) return colors.sentimentBear
    return colors.sentimentNeutral
  }};
  border: 1px solid ${props => {
    if (props.$score > 0.2) return colors.sentimentBull
    if (props.$score < -0.2) return colors.sentimentBear
    return colors.sentimentNeutral
  }};
  display: flex;
  align-items: center;
  gap: 0.375rem;
  white-space: nowrap;
`

const NewsTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${colors.textPrimary};
  line-height: 1.4;
  margin-bottom: 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${colors.borderLight};
  margin-top: 1rem;
`

const TimeAgo = styled.div`
  font-size: 0.8rem;
  color: ${colors.textSecondary};
`

const LLMLabel = styled.div`
  font-size: 0.75rem;
  color: ${colors.primary};
  background: rgba(54, 166, 186, 0.1);
  padding: 0.25rem 0.625rem;
  border-radius: 4px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &::before {
    content: '🤖';
    font-size: 0.9em;
  }
`

const Loading = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${colors.textSecondary};
  font-size: 1.1rem;
`

export default function EnhancedNews({ ticker = null }) {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [sentimentScores, setSentimentScores] = useState({})

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = supabaseBrowser()
        
        // Fetch news items with LLM sentiment
        let newsQuery = supabase
          .from('news_items')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(ticker ? 20 : 50)
        
        if (ticker) {
          newsQuery = newsQuery.eq('ticker', ticker.toUpperCase())
        }
        
        const { data: newsData, error: newsError } = await newsQuery
        
        if (newsError) throw newsError
        
        setNews(newsData || [])
        
        // Fetch sentiment scores for the tickers in the news
        if (newsData && newsData.length > 0) {
          const tickers = [...new Set(newsData.map(n => n.ticker))]
          const { data: sentimentData } = await supabase
            .from('sentiment_scores')
            .select('*')
            .in('ticker', tickers)
            .order('date', { ascending: false })
          
          // Create a map of ticker -> latest sentiment
          const sentimentMap = {}
          sentimentData?.forEach(s => {
            if (!sentimentMap[s.ticker]) {
              sentimentMap[s.ticker] = s.combined_score
            }
          })
          setSentimentScores(sentimentMap)
        }
        
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

  const getSentimentLabel = (score) => {
    if (score > 0.2) return '📈 Bullish'
    if (score < -0.2) return '📉 Bearish'
    return '➡️ Neutral'
  }

  const handleCardClick = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) {
    return <Loading>Loading news with AI sentiment analysis...</Loading>
  }

  if (news.length === 0) {
    return (
      <Loading>
        No news articles found{ticker ? ` for ${ticker}` : ''}. Check back soon!
      </Loading>
    )
  }

  return (
    <Container>
      {!ticker && (
        <Header>
          <Title>📰 Crypto News</Title>
          <Subtitle>
            Analyzed by <strong>ORCA's trained LLM</strong> for sentiment insights
          </Subtitle>
        </Header>
      )}
      
      <Grid>
        {news.map((article, index) => {
          const llmSentiment = article.sentiment_llm || article.sentiment_raw || 0
          const tickerSentiment = sentimentScores[article.ticker]
          
          return (
            <NewsCard
              key={article.id}
              onClick={() => handleCardClick(article.url)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <CardHeader>
                <SourceBadge>{article.source || 'News'}</SourceBadge>
                <SentimentBadge $score={llmSentiment}>
                  {getSentimentLabel(llmSentiment)}
                </SentimentBadge>
              </CardHeader>
              
              <NewsTitle>{article.title}</NewsTitle>
              
              {tickerSentiment !== undefined && (
                <div style={{ 
                  fontSize: '0.85rem', 
                  color: tickerSentiment > 0 ? colors.sentimentBull : 
                         tickerSentiment < 0 ? colors.sentimentBear : 
                         colors.sentimentNeutral,
                  fontWeight: 600,
                  marginBottom: '0.5rem'
                }}>
                  {article.ticker} Overall Sentiment: {(tickerSentiment * 100).toFixed(0)}%
                </div>
              )}
              
              <MetaRow>
                <TimeAgo>{formatTimeAgo(article.published_at)}</TimeAgo>
                <LLMLabel>LLM Analyzed</LLMLabel>
              </MetaRow>
            </NewsCard>
          )
        })}
      </Grid>
    </Container>
  )
}

