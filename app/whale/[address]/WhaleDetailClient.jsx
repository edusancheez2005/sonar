'use client'

import React from 'react'
import styled from 'styled-components'
import Link from 'next/link'
import { motion } from 'framer-motion'

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
`

const Header = styled.div`
  background: linear-gradient(135deg, #0d2134 0%, #1a2f42 100%);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(54, 166, 186, 0.1) 0%, transparent 70%);
    pointer-events: none;
  }
`

const ExchangeBadge = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(231, 76, 60, 0.2) 0%, rgba(192, 57, 43, 0.15) 100%);
  border: 2px solid rgba(231, 76, 60, 0.4);
  border-radius: 16px;
  margin-bottom: 1.5rem;
  
  svg {
    width: 28px;
    height: 28px;
    fill: #e74c3c;
  }
`

const ExchangeInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const ExchangeLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: #e74c3c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const ExchangeName = styled.div`
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-primary);
`

const WhaleAddress = styled.h1`
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  font-family: 'Courier New', monospace;
  word-break: break-all;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`

const ShortAddress = styled.span`
  display: inline-block;
  padding: 0.5rem 1rem;
  background: rgba(54, 166, 186, 0.15);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 12px;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
`

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
`

const MetricCard = styled(motion.div)`
  background: rgba(30, 57, 81, 0.4);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 1.25rem;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgba(54, 166, 186, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(54, 166, 186, 0.2);
  }
`

const MetricLabel = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const MetricValue = styled.div`
  font-size: 1.8rem;
  font-weight: 800;
  color: ${props => {
    if (props.$positive) return '#2ecc71'
    if (props.$negative) return '#e74c3c'
    return 'var(--text-primary)'
  }};
`

const Section = styled.div`
  background: rgba(13, 33, 52, 0.6);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
`

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--primary);
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  svg {
    width: 24px;
    height: 24px;
    fill: var(--primary);
  }
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid rgba(54, 166, 186, 0.1);
  }
  
  th {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(30, 57, 81, 0.3);
  }
  
  td {
    font-size: 0.95rem;
    color: var(--text-primary);
  }
  
  tr:last-child td {
    border-bottom: none;
  }
  
  tbody tr {
    transition: background 0.2s ease;
    
    &:hover {
      background: rgba(54, 166, 186, 0.05);
    }
  }
`

const TokenLink = styled(Link)`
  color: var(--primary);
  text-decoration: none;
  font-weight: 700;
  transition: color 0.2s ease;
  
  &:hover {
    color: #5dd5ed;
    text-decoration: underline;
  }
`

const Badge = styled.span`
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  background: ${props => {
    if (props.$type === 'BUY') return 'rgba(46, 204, 113, 0.2)'
    if (props.$type === 'SELL') return 'rgba(231, 76, 60, 0.2)'
    return 'rgba(52, 152, 219, 0.2)'
  }};
  color: ${props => {
    if (props.$type === 'BUY') return '#2ecc71'
    if (props.$type === 'SELL') return '#e74c3c'
    return '#3498db'
  }};
  border: 1px solid ${props => {
    if (props.$type === 'BUY') return 'rgba(46, 204, 113, 0.3)'
    if (props.$type === 'SELL') return 'rgba(231, 76, 60, 0.3)'
    return 'rgba(52, 152, 219, 0.3)'
  }};
`

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text-secondary);
  
  svg {
    width: 64px;
    height: 64px;
    fill: rgba(54, 166, 186, 0.3);
    margin-bottom: 1rem;
  }
  
  h3 {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 1rem 0 0.5rem 0;
  }
  
  p {
    font-size: 0.95rem;
    color: var(--text-secondary);
  }
`

function formatUSD(value) {
  const num = Number(value)
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
  return `$${num.toFixed(2)}`
}

export default function WhaleDetailClient({ 
  address, 
  netFlow, 
  buyVolume,
  sellVolume,
  topTokens, 
  trades,
  isExchange,
  exchangeInfo
}) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`
  
  return (
    <Container>
      <Header>
        {isExchange && exchangeInfo && (
          <ExchangeBadge
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <ExchangeInfo>
              <ExchangeLabel>Verified {exchangeInfo.type}</ExchangeLabel>
              <ExchangeName>{exchangeInfo.name}</ExchangeName>
            </ExchangeInfo>
          </ExchangeBadge>
        )}
        
        <WhaleAddress>
          <ShortAddress>{short}</ShortAddress>
        </WhaleAddress>
        
        <MetricsRow>
          <MetricCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <MetricLabel>24h Net Flow</MetricLabel>
            <MetricValue $positive={netFlow > 0} $negative={netFlow < 0}>
              {netFlow > 0 ? '+' : ''}{formatUSD(netFlow)}
            </MetricValue>
          </MetricCard>
          
          <MetricCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <MetricLabel>Buy Volume (24h)</MetricLabel>
            <MetricValue>{formatUSD(buyVolume)}</MetricValue>
          </MetricCard>
          
          <MetricCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <MetricLabel>Sell Volume (24h)</MetricLabel>
            <MetricValue>{formatUSD(sellVolume)}</MetricValue>
          </MetricCard>
        </MetricsRow>
      </Header>
      
      <Section>
        <SectionTitle>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18.5c-3.25-1.22-5.5-4.38-5.5-7.5V8.84l5.5-2.75 5.5 2.75V13c0 3.12-2.25 6.28-5.5 7.5z"/>
          </svg>
          Top Tokens (by net flow)
        </SectionTitle>
        
        {topTokens.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <th>Token</th>
                <th style={{ textAlign: 'right' }}>Net Flow</th>
                <th style={{ textAlign: 'right' }}>Buy Volume</th>
                <th style={{ textAlign: 'right' }}>Sell Volume</th>
              </tr>
            </thead>
            <tbody>
              {topTokens.map(t => (
                <tr key={t.token}>
                  <td>
                    <TokenLink href={`/token/${encodeURIComponent(t.token)}`}>
                      {t.token}
                    </TokenLink>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: t.net > 0 ? '#2ecc71' : t.net < 0 ? '#e74c3c' : 'inherit' }}>
                    {t.net > 0 ? '+' : ''}{formatUSD(t.net)}
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatUSD(t.buy)}</td>
                  <td style={{ textAlign: 'right' }}>{formatUSD(t.sell)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <h3>No Token Data</h3>
            <p>No trading activity detected for this address in the last 24 hours.</p>
          </EmptyState>
        )}
      </Section>
      
      <Section>
        <SectionTitle>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
          </svg>
          Recent Trades (Last 24h)
        </SectionTitle>
        
        {trades.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Token</th>
                <th>Side</th>
                <th style={{ textAlign: 'right' }}>USD Value</th>
                <th style={{ textAlign: 'right' }}>Whale Score</th>
              </tr>
            </thead>
            <tbody>
              {trades.map(t => (
                <tr key={t.transaction_hash}>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(t.timestamp).toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </td>
                  <td>
                    <TokenLink href={`/token/${encodeURIComponent(t.token_symbol || '-')}`}>
                      {t.token_symbol || '-'}
                    </TokenLink>
                  </td>
                  <td>
                    <Badge $type={t.classification}>{t.classification}</Badge>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>
                    {formatUSD(t.usd_value)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--primary)', fontWeight: '700' }}>
                    {t.whale_score ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <h3>No Recent Trades</h3>
            <p>No transactions detected for this address in the last 24 hours.</p>
          </EmptyState>
        )}
      </Section>
      
      <div style={{ 
        fontSize: '0.85rem', 
        color: 'var(--text-secondary)', 
        textAlign: 'center',
        padding: '1rem',
        background: 'rgba(13, 33, 52, 0.4)',
        border: '1px solid rgba(54, 166, 186, 0.1)',
        borderRadius: '12px'
      }}>
        Full Address: <code style={{ 
          fontFamily: 'monospace', 
          fontSize: '0.9rem',
          color: 'var(--primary)',
          background: 'rgba(54, 166, 186, 0.1)',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px'
        }}>{address}</code>
      </div>
    </Container>
  )
}

