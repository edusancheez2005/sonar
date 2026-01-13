'use client'

import React from 'react'
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

const Container = styled.div`
  padding: 1.5rem;
  background: ${colors.bgCard};
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
`

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${colors.textPrimary};
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const CoinsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const CoinCard = styled(motion.div)`
  background: rgba(31, 42, 58, 0.4);
  border: 1px solid ${colors.borderLight};
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background: rgba(31, 42, 58, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }
`

const CoinLogo = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${colors.bgDark};
  padding: 2px;
`

const CoinInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const CoinSymbol = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${colors.textPrimary};
  margin-bottom: 0.25rem;
`

const SentimentBadge = styled.div`
  font-size: 0.8rem;
  font-weight: 500;
  color: ${props => props.$sentiment > 0.6 ? colors.sentimentBull :
                     props.$sentiment < 0.4 ? colors.sentimentBear :
                     colors.sentimentNeutral};
`

const MiniSparkline = styled.div`
  width: 60px;
  height: 24px;
  position: relative;
`

const SparklinePath = styled.svg`
  width: 100%;
  height: 100%;
  
  path {
    stroke: ${props => props.$positive ? colors.sentimentBull : colors.sentimentBear};
    stroke-width: 2;
    fill: none;
  }
`

export default function HotCoinsBar({ coins = [] }) {
  // Generate simple sparkline path
  const generateSparkline = (data = []) => {
    if (!data || data.length === 0) return ''
    const width = 60
    const height = 24
    const step = width / (data.length - 1 || 1)
    
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    
    return data.map((val, i) => {
      const x = i * step
      const y = height - ((val - min) / range) * height
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`
    }).join(' ')
  }

  return (
    <Container>
      <Title>
        <span>🔥</span>
        Hot Tokens by Sentiment
      </Title>
      <CoinsGrid>
        {coins.slice(0, 5).map((coin) => (
          <CoinCard
            key={coin.id || coin.symbol}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CoinLogo 
              src={coin.logo || `https://via.placeholder.com/40?text=${coin.symbol}`} 
              alt={coin.symbol}
              onError={(e) => {
                e.target.src = `https://via.placeholder.com/40?text=${coin.symbol}`
              }}
            />
            <CoinInfo>
              <CoinSymbol>{coin.symbol}</CoinSymbol>
              <SentimentBadge $sentiment={coin.sentiment || 0.5}>
                {Math.round((coin.sentiment || 0.5) * 100)}% Sentiment
              </SentimentBadge>
            </CoinInfo>
            {coin.priceHistory && coin.priceHistory.length > 0 && (
              <MiniSparkline>
                <SparklinePath 
                  viewBox="0 0 60 24" 
                  preserveAspectRatio="none"
                  $positive={coin.priceHistory[coin.priceHistory.length - 1] >= coin.priceHistory[0]}
                >
                  <path d={generateSparkline(coin.priceHistory)} />
                </SparklinePath>
              </MiniSparkline>
            )}
          </CoinCard>
        ))}
      </CoinsGrid>
    </Container>
  )
}

