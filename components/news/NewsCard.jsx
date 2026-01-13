'use client'

import React, { useState } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const colors = {
  bgDark: '#0a0f19',
  bgCard: '#0f1622',
  primary: '#3f92ff',
  secondary: '#16c784',
  textPrimary: '#e1e8f0',
  textSecondary: '#8aa7bf',
  borderLight: '#1f2a3a',
  sentimentBull: '#16c784',
  sentimentBear: '#ed4c5c',
  sentimentNeutral: '#f2bc1d',
}

const Card = styled(motion.article)`
  background: ${colors.bgCard};
  border: 1px solid ${colors.borderLight};
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  
  &:hover {
    border-color: ${colors.primary};
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45);
    transform: translateY(-2px);
  }
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`

const CoinLogos = styled.div`
  display: flex;
  gap: 0.25rem;
  align-items: center;
`

const CoinLogo = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${colors.bgDark};
  padding: 2px;
  border: 1px solid ${colors.borderLight};
`

const MetaInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const Source = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${colors.textSecondary};
`

const TimeAgo = styled.div`
  font-size: 0.7rem;
  color: ${colors.textSecondary};
  opacity: 0.7;
`

const SentimentArrow = styled.div`
  font-size: 1.5rem;
  color: ${props => props.$direction === 'up' ? colors.sentimentBull :
                     props.$direction === 'down' ? colors.sentimentBear :
                     colors.sentimentNeutral};
`

const Title = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${colors.textPrimary};
  margin-bottom: 0.5rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const Summary = styled.p`
  font-size: 0.875rem;
  color: ${colors.textSecondary};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 0.75rem;
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${colors.borderLight};
`

const SentimentLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 500;
  color: ${props => props.$sentiment > 0.6 ? colors.sentimentBull :
                     props.$sentiment < 0.4 ? colors.sentimentBear :
                     colors.sentimentNeutral};
  display: flex;
  align-items: center;
  gap: 0.375rem;
`

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  
  ${Card}:hover & {
    opacity: 1;
  }
`

const ActionButton = styled.button`
  background: rgba(63, 146, 255, 0.1);
  border: 1px solid ${colors.borderLight};
  color: ${colors.textSecondary};
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(63, 146, 255, 0.2);
    color: ${colors.primary};
    border-color: ${colors.primary};
  }
`

export default function NewsCard({ article }) {
  const getSentimentDirection = (sentiment = 0.5) => {
    if (sentiment > 0.6) return 'up'
    if (sentiment < 0.4) return 'down'
    return 'neutral'
  }

  const getSentimentLabel = (sentiment = 0.5) => {
    if (sentiment > 0.6) return 'Bullish'
    if (sentiment < 0.4) return 'Bearish'
    return 'Neutral'
  }

  const handleClick = () => {
    if (article.url) {
      window.open(article.url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleBookmark = (e) => {
    e.stopPropagation()
    console.log('Bookmark article:', article.id)
  }

  const handleShare = (e) => {
    e.stopPropagation()
    if (navigator.share) {
      navigator.share({
        title: article.title,
        url: article.url
      })
    }
  }

  return (
    <Card
      onClick={handleClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Header>
        {article.instruments && article.instruments.length > 0 && (
          <CoinLogos>
            {article.instruments.slice(0, 3).map((coin, i) => (
              <CoinLogo 
                key={i}
                src={coin.logo || `https://via.placeholder.com/28?text=${coin.code}`}
                alt={coin.code}
                title={coin.code}
                onError={(e) => {
                  e.target.src = `https://via.placeholder.com/28?text=${coin.code}`
                }}
              />
            ))}
          </CoinLogos>
        )}
        <MetaInfo>
          <Source>{article.source || 'Unknown'}</Source>
          <TimeAgo>{article.timeAgo || 'Recently'}</TimeAgo>
        </MetaInfo>
        <SentimentArrow $direction={getSentimentDirection(article.sentiment)}>
          {getSentimentDirection(article.sentiment) === 'up' ? '↗' :
           getSentimentDirection(article.sentiment) === 'down' ? '↘' : '→'}
        </SentimentArrow>
      </Header>

      <Title>{article.title}</Title>
      {article.description && <Summary>{article.description}</Summary>}

      <Footer>
        <SentimentLabel $sentiment={article.sentiment || 0.5}>
          {getSentimentLabel(article.sentiment)}
        </SentimentLabel>
        <Actions>
          <ActionButton onClick={handleBookmark} title="Bookmark">
            ⭐
          </ActionButton>
          <ActionButton onClick={handleShare} title="Share">
            🔗
          </ActionButton>
        </Actions>
      </Footer>
    </Card>
  )
}

