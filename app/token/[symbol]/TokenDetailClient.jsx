'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1621 0%, #0f1922 50%, #0a1621 100%);
  padding: 2rem;
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

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateX(-4px);
    color: #5dd5ed;
  }
`

const Header = styled.div`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`

const TokenTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`

const TokenImage = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid var(--primary);
  box-shadow: 0 4px 12px rgba(54, 166, 186, 0.3);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
`

const TokenName = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`

const SentimentBadge = styled.div`
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.95rem;
  color: #0a1621;
  background: ${props => props.$color || '#f39c12'};
  box-shadow: 0 4px 12px ${props => props.$color || '#f39c12'}33;
  cursor: help;
`

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`

const Price = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
`

const PriceChange = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${props => props.$positive ? '#2ecc71' : '#e74c3c'};
`

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`

const MetricCard = styled.div`
  background: rgba(30, 57, 81, 0.4);
  border: 1px solid rgba(54, 166, 186, 0.15);
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(54, 166, 186, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(54, 166, 186, 0.2);
  }
`

const MetricLabel = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
`

const MetricValue = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
`

const TimeFilters = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const TimeButton = styled(Link)`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: ${props => props.$active ? 'var(--primary)' : 'rgba(30, 57, 81, 0.6)'};
  color: ${props => props.$active ? '#0a1621' : 'var(--text-primary)'};
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  border: 1px solid ${props => props.$active ? 'var(--primary)' : 'rgba(54, 166, 186, 0.2)'};

  &:hover {
    background: ${props => props.$active ? '#5dd5ed' : 'rgba(54, 166, 186, 0.2)'};
    transform: translateY(-2px);
  }
`

const SentimentSection = styled(motion.div)`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`

const SectionTitle = styled.h2`
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0 0 1.5rem 0;
  color: var(--primary);
`

const ReasonsGrid = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
`

const ReasonCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: rgba(30, 57, 81, 0.4);
  border: 1px solid rgba(54, 166, 186, 0.15);
  border-radius: 12px;
  padding: 1.25rem;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(54, 166, 186, 0.4);
    transform: translateX(4px);
  }
`

const ReasonIcon = styled.div`
  font-size: 1.5rem;
  flex-shrink: 0;
`

const ReasonContent = styled.div`
  flex: 1;
`

const ReasonTitle = styled.div`
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.25rem;
`

const ReasonText = styled.div`
  color: var(--text-secondary);
  line-height: 1.6;
`

const OrcaButton = styled(motion.button)`
  width: 100%;
  padding: 1.25rem 2rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #9b59b6 0%, #36a6ba 100%);
  color: white;
  font-size: 1.1rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(155, 89, 182, 0.3);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(155, 89, 182, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`

const ModalContent = styled(motion.div)`
  background: linear-gradient(135deg, #0d2134 0%, #1a2f42 100%);
  border: 2px solid rgba(54, 166, 186, 0.3);
  border-radius: 20px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 9999;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(30, 57, 81, 0.3);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--primary);
    border-radius: 4px;
  }
`

const CloseButton = styled.button`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.4);
  color: #e74c3c;
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(231, 76, 60, 0.4);
    transform: rotate(90deg);
  }
`

const AnalysisContent = styled.div`
  h3 {
    color: var(--primary);
    font-size: 1.5rem;
    font-weight: 800;
    margin: 2rem 0 1rem 0;
    
    &:first-child {
      margin-top: 0;
    }
  }

  p {
    color: var(--text-secondary);
    line-height: 1.8;
    margin: 1rem 0;
  }

  ul, ol {
    color: var(--text-secondary);
    line-height: 2;
    padding-left: 1.5rem;
  }

  li {
    margin: 0.5rem 0;
  }

  strong {
    color: var(--text-primary);
    font-weight: 700;
  }
`

const RecommendationCard = styled.div`
  background: ${props => 
    props.$type === 'BUY' ? 'linear-gradient(135deg, rgba(46,204,113,0.15) 0%, rgba(46,204,113,0.05) 100%)' :
    props.$type === 'AVOID' ? 'linear-gradient(135deg, rgba(231,76,60,0.15) 0%, rgba(231,76,60,0.05) 100%)' :
    'linear-gradient(135deg, rgba(243,156,18,0.15) 0%, rgba(243,156,18,0.05) 100%)'
  };
  border: 1px solid ${props => 
    props.$type === 'BUY' ? 'rgba(46,204,113,0.3)' :
    props.$type === 'AVOID' ? 'rgba(231,76,60,0.3)' :
    'rgba(243,156,18,0.3)'
  };
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
`

const RecType = styled.div`
  font-size: 1.2rem;
  font-weight: 800;
  color: ${props => 
    props.$type === 'BUY' ? '#2ecc71' :
    props.$type === 'AVOID' ? '#e74c3c' :
    '#f39c12'
  };
  margin-bottom: 0.5rem;
`

const RecConfidence = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
`

const TransactionsSection = styled.div`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.5rem;

  thead tr {
    background: rgba(30, 57, 81, 0.6);
  }

  th {
    padding: 1rem;
    text-align: left;
    font-weight: 700;
    color: var(--primary);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: none;

    &:first-child {
      border-top-left-radius: 8px;
      border-bottom-left-radius: 8px;
    }

    &:last-child {
      border-top-right-radius: 8px;
      border-bottom-right-radius: 8px;
    }
  }

  tbody tr {
    background: rgba(30, 57, 81, 0.3);
    transition: all 0.3s ease;

    &:hover {
      background: rgba(54, 166, 186, 0.1);
      transform: translateX(4px);
    }
  }

  td {
    padding: 1rem;
    color: var(--text-secondary);
    border: none;

    &:first-child {
      border-top-left-radius: 8px;
      border-bottom-left-radius: 8px;
    }

    &:last-child {
      border-top-right-radius: 8px;
      border-bottom-right-radius: 8px;
    }
  }

  a {
    color: var(--primary);
    text-decoration: none;
    transition: color 0.3s ease;

    &:hover {
      color: #5dd5ed;
    }
  }
`

const TxBadge = styled.span`
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  background: ${props => props.$type === 'BUY' ? 'rgba(46,204,113,0.2)' : props.$type === 'SELL' ? 'rgba(231,76,60,0.2)' : 'rgba(243,156,18,0.2)'};
  color: ${props => props.$type === 'BUY' ? '#2ecc71' : props.$type === 'SELL' ? '#e74c3c' : '#f39c12'};
  border: 1px solid ${props => props.$type === 'BUY' ? 'rgba(46,204,113,0.4)' : props.$type === 'SELL' ? 'rgba(231,76,60,0.4)' : 'rgba(243,156,18,0.4)'};
`

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

const getInsightIcon = (iconName) => {
  const iconMap = {
    'flow': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/></svg>,
    'pressure-up': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="14" width="4" height="6" fill="#2ecc71"/><rect x="10" y="10" width="4" height="10" fill="#2ecc71"/><rect x="16" y="6" width="4" height="14" fill="#2ecc71"/></svg>,
    'pressure-down': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="6" width="4" height="14" fill="#e74c3c"/><rect x="10" y="10" width="4" height="10" fill="#e74c3c"/><rect x="16" y="14" width="4" height="6" fill="#e74c3c"/></svg>,
    'whales-high': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="var(--primary)"/></svg>,
    'whales-low': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="var(--text-secondary)" strokeWidth="2" fill="none"/><circle cx="12" cy="10" r="3" fill="var(--text-secondary)"/></svg>,
    'trend-up': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" fill="#2ecc71"/></svg>,
    'trend-down': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6h-6z" fill="#e74c3c"/></svg>,
    'volume-high': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="var(--primary)"/><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="var(--primary)"/></svg>
  }
  return iconMap[iconName] || <span style={{ fontSize: '1.5rem' }}>●</span>
}

export default function TokenDetailClient({ symbol, sinceHours, data, whaleMetrics, sentiment }) {
  const [priceData, setPriceData] = useState(null)
  const [orcaAnalysis, setOrcaAnalysis] = useState(null)
  const [showOrcaModal, setShowOrcaModal] = useState(false)
  const [loadingOrca, setLoadingOrca] = useState(false)

  // Fetch live price data
  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch(`/api/token/price?symbol=${symbol}`)
        if (res.ok) {
          const data = await res.json()
          setPriceData(data)
        }
      } catch (error) {
        console.error('Failed to fetch price:', error)
      }
    }
    fetchPrice()
    const interval = setInterval(fetchPrice, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [symbol])

  // Fetch Orca analysis
  async function handleAskOrca() {
    if (loadingOrca) return
    
    setLoadingOrca(true)
    try {
      const res = await fetch('/api/orca/token-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      })
      
      if (res.ok) {
        const analysis = await res.json()
        setOrcaAnalysis(analysis)
        setShowOrcaModal(true)
      }
    } catch (error) {
      console.error('Orca analysis failed:', error)
    } finally {
      setLoadingOrca(false)
    }
  }

  const formatUSD = (value) => {
    const num = Number(value)
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`
    if (num >= 1) return `$${num.toFixed(4)}`
    if (num >= 0.0001) return `$${num.toFixed(4)}`
    if (num > 0) return `$${num.toFixed(8)}` // For very small prices
    return `$${num.toFixed(4)}`
  }

  const formatNumber = (value) => {
    const num = Number(value)
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const formatPrice = (value) => {
    const num = Number(value)
    if (!num || num === 0) return '$0.0000'
    
    // For very large numbers, use K/M/B notation
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
    if (num >= 10000) return `$${(num / 1000).toFixed(2)}K`
    
    // For prices >= $1, show 4 decimals
    if (num >= 1) return `$${num.toFixed(4)}`
    
    // For prices < $1 but >= $0.0001, show 4 decimals
    if (num >= 0.0001) return `$${num.toFixed(4)}`
    
    // For very small prices, show 8 decimals
    if (num > 0) return `$${num.toFixed(8)}`
    
    return '$0.0000'
  }

  return (
    <PageWrapper>
      <Container>
        <BackLink href="/dashboard">← Back to Dashboard</BackLink>

        <Header>
          <TokenTitle>
            {priceData?.image ? (
              <TokenImage 
                src={priceData.image} 
                alt={symbol}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            ) : (
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: '2px solid var(--primary)',
                background: 'linear-gradient(135deg, #36a6ba 0%, #5dd5ed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'white',
                boxShadow: '0 4px 12px rgba(54, 166, 186, 0.3)'
              }}>
                {symbol.slice(0, 2)}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <TokenName>{symbol}</TokenName>
              {priceData?.name && priceData.name !== symbol && (
                <span style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '1rem', 
                  fontWeight: 500,
                  marginTop: '-0.5rem'
                }}>
                  {priceData.name}
                </span>
              )}
            </div>
            <SentimentBadge 
              $color={sentiment.color}
              title={`Score: ${sentiment.score} | Buy%: ${sentiment.details.buyPct}% | Net Flow: ${formatUSD(sentiment.details.net)}`}
            >
              <span style={{ marginRight: '0.5rem' }}>●</span>{sentiment.label}
            </SentimentBadge>
          </TokenTitle>

          {priceData && (
            <>
              <PriceRow>
                <Price>{formatPrice(priceData.price)}</Price>
                <PriceChange $positive={priceData.change24h >= 0}>
                  {priceData.change24h >= 0 ? '+' : ''}{priceData.change24h?.toFixed(2)}% (24h)
                </PriceChange>
              </PriceRow>

              <MetricsGrid>
                <MetricCard>
                  <MetricLabel>Market Cap</MetricLabel>
                  <MetricValue>{formatUSD(priceData.marketCap)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>24h Volume</MetricLabel>
                  <MetricValue>{formatUSD(priceData.volume24h)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>24h High</MetricLabel>
                  <MetricValue>{formatUSD(priceData.high24h)}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>24h Low</MetricLabel>
                  <MetricValue>{formatUSD(priceData.low24h)}</MetricValue>
                </MetricCard>
              </MetricsGrid>
            </>
          )}

          <MetricsGrid>
            <MetricCard>
              <MetricLabel>Whale Volume ({sinceHours}h)</MetricLabel>
              <MetricValue>{formatUSD(whaleMetrics.totalVolume)}</MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Net Flow</MetricLabel>
              <MetricValue style={{ color: whaleMetrics.netFlow >= 0 ? '#2ecc71' : '#e74c3c' }}>
                {formatUSD(whaleMetrics.netFlow)}
              </MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Buys / Sells</MetricLabel>
              <MetricValue>{whaleMetrics.buys} / {whaleMetrics.sells}</MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricLabel>Unique Whales</MetricLabel>
              <MetricValue>{whaleMetrics.uniqueWhales}</MetricValue>
            </MetricCard>
          </MetricsGrid>

          <TimeFilters>
            <TimeButton href={`/token/${encodeURIComponent(symbol)}?sinceHours=1`} $active={sinceHours === 1}>1h</TimeButton>
            <TimeButton href={`/token/${encodeURIComponent(symbol)}?sinceHours=6`} $active={sinceHours === 6}>6h</TimeButton>
            <TimeButton href={`/token/${encodeURIComponent(symbol)}?sinceHours=24`} $active={sinceHours === 24}>24h</TimeButton>
            <TimeButton href={`/token/${encodeURIComponent(symbol)}?sinceHours=72`} $active={sinceHours === 72}>3d</TimeButton>
            <TimeButton href={`/token/${encodeURIComponent(symbol)}?sinceHours=168`} $active={sinceHours === 168}>7d</TimeButton>
          </TimeFilters>
        </Header>

        <SentimentSection
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SectionTitle>Why is {symbol} {sentiment.label}?</SectionTitle>
          
          <ReasonsGrid>
            <ReasonCard>
              <ReasonIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="14" width="4" height="6" fill="var(--primary)"/>
                  <rect x="10" y="10" width="4" height="10" fill="var(--primary)"/>
                  <rect x="16" y="6" width="4" height="14" fill="var(--primary)"/>
                </svg>
              </ReasonIcon>
              <ReasonContent>
                <ReasonTitle>Buy/Sell Pressure</ReasonTitle>
                <ReasonText>
                  {sentiment.details.buyPct}% buy pressure ({whaleMetrics.buys} buys vs {whaleMetrics.sells} sells).
                  {sentiment.details.buyPct > 60 ? ' Strong accumulation detected.' : sentiment.details.buyPct < 40 ? ' Heavy distribution in progress.' : ' Balanced trading activity.'}
                </ReasonText>
              </ReasonContent>
            </ReasonCard>

            <ReasonCard>
              <ReasonIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="2" fill="none"/>
                  <path d="M12 7v5l3 3" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </ReasonIcon>
              <ReasonContent>
                <ReasonTitle>Net Capital Flow</ReasonTitle>
                <ReasonText>
                  {whaleMetrics.netFlow >= 0 ? 'Net inflow' : 'Net outflow'} of {formatUSD(Math.abs(whaleMetrics.netFlow))} in the last {sinceHours}h.
                  {Math.abs(whaleMetrics.netFlow) > 5000000 ? ' Exceptional whale activity.' : Math.abs(whaleMetrics.netFlow) > 1000000 ? ' Significant capital movement.' : ' Moderate trading volume.'}
                </ReasonText>
              </ReasonContent>
            </ReasonCard>

            <ReasonCard>
              <ReasonIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="var(--primary)"/>
                </svg>
              </ReasonIcon>
              <ReasonContent>
                <ReasonTitle>Whale Participation</ReasonTitle>
                <ReasonText>
                  {whaleMetrics.uniqueWhales} unique whales actively trading.
                  {whaleMetrics.uniqueWhales > 15 ? ' High institutional interest.' : whaleMetrics.uniqueWhales > 8 ? ' Moderate whale activity.' : ' Limited institutional participation.'}
                </ReasonText>
              </ReasonContent>
            </ReasonCard>

            {sentiment.details.last6Net - sentiment.details.prev6Net !== 0 && (
              <ReasonCard>
                <ReasonIcon>
                  {sentiment.details.last6Net > sentiment.details.prev6Net ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" fill="#2ecc71"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6h-6z" fill="#e74c3c"/>
                    </svg>
                  )}
                </ReasonIcon>
                <ReasonContent>
                  <ReasonTitle>Recent Momentum</ReasonTitle>
                  <ReasonText>
                    {sentiment.details.last6Net > sentiment.details.prev6Net ? 'Positive' : 'Negative'} momentum shift in the last 6 hours 
                    ({formatUSD(Math.abs(sentiment.details.last6Net - sentiment.details.prev6Net))} change).
                    {Math.abs(sentiment.details.last6Net - sentiment.details.prev6Net) > 1000000 ? ' Strong trend developing.' : ' Watch for continuation.'}
                  </ReasonText>
                </ReasonContent>
              </ReasonCard>
            )}
          </ReasonsGrid>

          <OrcaButton
            onClick={handleAskOrca}
            disabled={loadingOrca}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loadingOrca ? (
              <>
                <LoadingSpinner />
                Analyzing with Orca AI...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
                  <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 0 1 3 9.5 6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5z"/>
                </svg>
                Ask Orca for Detailed Analysis
              </>
            )}
          </OrcaButton>
        </SentimentSection>

        <TransactionsSection>
          <SectionTitle>Recent Whale Transactions</SectionTitle>
          <Table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Side</th>
                <th style={{ textAlign: 'right' }}>USD Value</th>
                <th>Whale Score</th>
                <th>Whale Address</th>
                <th>Chain</th>
                <th>Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 50).map(tx => (
                <tr key={tx.transaction_hash}>
                  <td>{new Date(tx.timestamp).toLocaleString()}</td>
                  <td>
                    <TxBadge $type={(tx.classification || '').toUpperCase()}>
                      {tx.classification || 'TRANSFER'}
                    </TxBadge>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatUSD(tx.usd_value)}
                  </td>
                  <td>
                    <span style={{ 
                      color: tx.whale_score >= 80 ? '#2ecc71' : tx.whale_score >= 60 ? '#f39c12' : 'var(--text-secondary)',
                      fontWeight: 700
                    }}>
                      {tx.whale_score || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <Link href={`/whale/${encodeURIComponent(tx.from_address || '-')}`}>
                      {tx.from_address?.slice(0, 6)}...{tx.from_address?.slice(-4)}
                    </Link>
                  </td>
                  <td>{tx.blockchain}</td>
                  <td>
                    <a href={`#`} target="_blank" rel="noopener noreferrer">
                      {tx.transaction_hash?.slice(0, 6)}...{tx.transaction_hash?.slice(-4)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TransactionsSection>

        {/* Orca Analysis Modal */}
        <AnimatePresence>
          {showOrcaModal && orcaAnalysis && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrcaModal(false)}
            >
              <ModalContent
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <CloseButton onClick={() => setShowOrcaModal(false)}>×</CloseButton>
                
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{ 
                    fontSize: '2rem', 
                    fontWeight: 800, 
                    background: 'linear-gradient(135deg, #9b59b6 0%, #36a6ba 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="url(#orcaGradient)" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="orcaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#9b59b6"/>
                          <stop offset="100%" stopColor="#36a6ba"/>
                        </linearGradient>
                      </defs>
                      <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 0 1 3 9.5 6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5z"/>
                    </svg>
                    ORCA 2.0 Analysis: {symbol}
                  </h2>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Professional Trading Intelligence • Real-Time Data
                  </div>
                </div>

                <AnalysisContent>
                  <h3>Market Sentiment</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <SentimentBadge $color={orcaAnalysis.sentiment === 'BULLISH' ? '#2ecc71' : orcaAnalysis.sentiment === 'BEARISH' ? '#e74c3c' : '#f39c12'}>
                      <span style={{ marginRight: '0.5rem' }}>●</span>{orcaAnalysis.sentiment}
                    </SentimentBadge>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Signal: <strong style={{ color: 'var(--primary)' }}>{orcaAnalysis.signal}</strong>
                    </span>
                  </div>

                  <h3>Key Metrics (Last 24h)</h3>
                  <MetricsGrid>
                    <MetricCard>
                      <MetricLabel>Total Transactions</MetricLabel>
                      <MetricValue>{orcaAnalysis.metrics.totalTxs}</MetricValue>
                    </MetricCard>
                    <MetricCard>
                      <MetricLabel>Buy Pressure</MetricLabel>
                      <MetricValue style={{ color: '#2ecc71' }}>
                        {orcaAnalysis.metrics.buyPct.toFixed(1)}%
                      </MetricValue>
                    </MetricCard>
                    <MetricCard>
                      <MetricLabel>Net Flow</MetricLabel>
                      <MetricValue style={{ color: orcaAnalysis.metrics.netFlow >= 0 ? '#2ecc71' : '#e74c3c' }}>
                        {formatUSD(orcaAnalysis.metrics.netFlow)}
                      </MetricValue>
                    </MetricCard>
                    <MetricCard>
                      <MetricLabel>Unique Whales</MetricLabel>
                      <MetricValue>{orcaAnalysis.metrics.uniqueWhales}</MetricValue>
                    </MetricCard>
                  </MetricsGrid>

                  {orcaAnalysis.insights && orcaAnalysis.insights.length > 0 && (
                    <>
                      <h3>Key Insights</h3>
                      <ReasonsGrid>
                        {orcaAnalysis.insights.map((insight, i) => (
                          <ReasonCard key={i}>
                            <ReasonIcon>{getInsightIcon(insight.icon)}</ReasonIcon>
                            <ReasonContent>
                              <ReasonTitle>{insight.title}</ReasonTitle>
                              <ReasonText>{insight.description}</ReasonText>
                            </ReasonContent>
                          </ReasonCard>
                        ))}
                      </ReasonsGrid>
                    </>
                  )}

                  {orcaAnalysis.recommendation && (
                    <>
                      <h3>Professional Trading Recommendation</h3>
                      <RecommendationCard $type={orcaAnalysis.recommendation.type}>
                        <RecType $type={orcaAnalysis.recommendation.type}>
                          {orcaAnalysis.recommendation.type === 'BUY' ? '● BUY SIGNAL' :
                           orcaAnalysis.recommendation.type === 'AVOID' ? '● AVOID / SHORT' :
                           orcaAnalysis.recommendation.type === 'WAIT' ? '● WAIT FOR CONFIRMATION' :
                           '● CAUTIOUS ENTRY'}
                        </RecType>
                        <RecConfidence>
                          Confidence: <strong>{orcaAnalysis.recommendation.confidence}</strong>
                        </RecConfidence>
                        <p><strong>Reasoning:</strong> {orcaAnalysis.recommendation.reasoning}</p>
                        <div style={{ marginTop: '1rem' }}>
                          <strong style={{ color: 'var(--primary)' }}>Action Items:</strong>
                          <ul style={{ marginTop: '0.5rem' }}>
                            {orcaAnalysis.recommendation.actions.map((action, i) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      </RecommendationCard>
                    </>
                  )}

                  {orcaAnalysis.topBuys && orcaAnalysis.topBuys.length > 0 && (
                    <>
                      <h3>Top Whale Buys</h3>
                      {orcaAnalysis.topBuys.map((buy, i) => (
                        <div key={i} style={{ 
                          background: 'rgba(46,204,113,0.1)', 
                          border: '1px solid rgba(46,204,113,0.3)',
                          borderRadius: '8px',
                          padding: '1rem',
                          marginBottom: '0.5rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#2ecc71', fontWeight: 700 }}>{formatUSD(buy.value)}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              {new Date(buy.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Whale Score: <strong>{buy.whaleScore || 'N/A'}</strong>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  <div style={{ 
                    marginTop: '2rem', 
                    padding: '1rem', 
                    background: 'rgba(155,89,182,0.1)',
                    border: '1px solid rgba(155,89,182,0.3)',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic'
                  }}>
                    <strong>Disclaimer:</strong> This analysis is generated from real-time blockchain data. 
                    Cryptocurrency markets are highly volatile. Always conduct independent research and never 
                    risk more than you can afford to lose. Past performance does not guarantee future results.
                  </div>
                </AnalysisContent>
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </Container>
    </PageWrapper>
  )
}

