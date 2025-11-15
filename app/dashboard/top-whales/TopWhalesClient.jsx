'use client'

import React from 'react'
import styled from 'styled-components'
import Link from 'next/link'
import { motion } from 'framer-motion'

const Container = styled.div`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`

const Title = styled.h2`
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  svg {
    width: 28px;
    height: 28px;
    fill: var(--primary);
  }
`

const Subtitle = styled.p`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0.5rem 0 0 0;
`

const TimeframeBadge = styled.span`
  display: inline-block;
  padding: 0.5rem 1rem;
  background: rgba(54, 166, 186, 0.15);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  td {
    font-size: 0.95rem;
    color: var(--text-primary);
  }
  
  tr:last-child td {
    border-bottom: none;
  }
  
  tbody tr {
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(54, 166, 186, 0.08);
      transform: translateX(2px);
    }
  }
`

const RankBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-weight: 800;
  font-size: 0.9rem;
  background: ${props => {
    if (props.$rank === 1) return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
    if (props.$rank === 2) return 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)'
    if (props.$rank === 3) return 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)'
    return 'rgba(54, 166, 186, 0.2)'
  }};
  color: ${props => props.$rank <= 3 ? '#0a1621' : 'var(--text-primary)'};
  border: 2px solid ${props => {
    if (props.$rank === 1) return 'rgba(255, 215, 0, 0.5)'
    if (props.$rank === 2) return 'rgba(192, 192, 192, 0.5)'
    if (props.$rank === 3) return 'rgba(205, 127, 50, 0.5)'
    return 'rgba(54, 166, 186, 0.3)'
  }};
  box-shadow: ${props => props.$rank <= 3 ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'};
`

const WhaleLink = styled(Link)`
  color: var(--primary);
  text-decoration: none;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    color: #5dd5ed;
    text-decoration: underline;
  }
  
  svg {
    width: 16px;
    height: 16px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  &:hover svg {
    opacity: 1;
  }
`

const NetFlowValue = styled.div`
  font-weight: 800;
  font-size: 1.05rem;
  color: ${props => {
    if (props.$value > 0) return '#2ecc71'
    if (props.$value < 0) return '#e74c3c'
    return 'var(--text-primary)'
  }};
`

const RatioBadge = styled.span`
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  background: ${props => {
    const buyPct = parseInt(props.$ratio?.split('/')[0]) || 50
    if (buyPct > 65) return 'rgba(46, 204, 113, 0.2)'
    if (buyPct < 35) return 'rgba(231, 76, 60, 0.2)'
    return 'rgba(241, 196, 15, 0.2)'
  }};
  color: ${props => {
    const buyPct = parseInt(props.$ratio?.split('/')[0]) || 50
    if (buyPct > 65) return '#2ecc71'
    if (buyPct < 35) return '#e74c3c'
    return '#f1c40f'
  }};
  border: 1px solid ${props => {
    const buyPct = parseInt(props.$ratio?.split('/')[0]) || 50
    if (buyPct > 65) return 'rgba(46, 204, 113, 0.3)'
    if (buyPct < 35) return 'rgba(231, 76, 60, 0.3)'
    return 'rgba(241, 196, 15, 0.3)'
  }};
`

const TokenPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`

const TokenPill = styled.span`
  display: inline-block;
  padding: 0.25rem 0.6rem;
  background: rgba(54, 166, 186, 0.15);
  border: 1px solid rgba(54, 166, 186, 0.25);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
`

const ScoreBadge = styled.div`
  display: inline-block;
  padding: 0.4rem 0.85rem;
  background: ${props => {
    if (props.$score >= 80) return 'rgba(46, 204, 113, 0.2)'
    if (props.$score >= 60) return 'rgba(52, 152, 219, 0.2)'
    if (props.$score >= 40) return 'rgba(241, 196, 15, 0.2)'
    return 'rgba(231, 76, 60, 0.2)'
  }};
  border: 1px solid ${props => {
    if (props.$score >= 80) return 'rgba(46, 204, 113, 0.3)'
    if (props.$score >= 60) return 'rgba(52, 152, 219, 0.3)'
    if (props.$score >= 40) return 'rgba(241, 196, 15, 0.3)'
    return 'rgba(231, 76, 60, 0.3)'
  }};
  color: ${props => {
    if (props.$score >= 80) return '#2ecc71'
    if (props.$score >= 60) return '#3498db'
    if (props.$score >= 40) return '#f1c40f'
    return '#e74c3c'
  }};
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.95rem;
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

const LastSeenText = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
`

function formatUSD(value) {
  const num = Number(value)
  const abs = Math.abs(num)
  const sign = num >= 0 ? '+' : ''
  
  if (abs >= 1e9) return `${sign}$${(num / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}$${(num / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}$${(num / 1e3).toFixed(2)}K`
  return `${sign}$${num.toFixed(2)}`
}

function timeAgo(timestamp) {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export default function TopWhalesClient({ whales }) {
  return (
    <Container>
      <Header>
        <div>
          <Title>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm-1.06 16.88L7.4 15.34l1.42-1.42 2.12 2.12 4.24-4.24 1.42 1.42-5.66 5.66z"/>
            </svg>
            Top 10 Whales
          </Title>
          <Subtitle>Most active whale wallets in the past 7 days</Subtitle>
        </div>
        <TimeframeBadge>7-Day Activity</TimeframeBadge>
      </Header>
      
      {whales && whales.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Whale Address</th>
                <th style={{ textAlign: 'right' }}>Net Flow (7d)</th>
                <th style={{ textAlign: 'right' }}>Buy/Sell</th>
                <th>Top Tokens</th>
                <th style={{ textAlign: 'right' }}>Whale Score</th>
                <th style={{ textAlign: 'right' }}>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {whales.map((whale, idx) => (
                <motion.tr
                  key={whale.address}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <td>
                    <RankBadge $rank={idx + 1}>{idx + 1}</RankBadge>
                  </td>
                  <td>
                    <WhaleLink href={`/whale/${encodeURIComponent(whale.address)}`}>
                      {whale.address.slice(0, 6)}…{whale.address.slice(-4)}
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                      </svg>
                    </WhaleLink>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <NetFlowValue $value={whale.netUsd}>
                      {formatUSD(whale.netUsd)}
                    </NetFlowValue>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <RatioBadge $ratio={whale.buySellRatio}>
                      {whale.buySellRatio}
                    </RatioBadge>
                  </td>
                  <td>
                    <TokenPills>
                      {(whale.tokens || []).slice(0, 4).map(token => (
                        <TokenPill key={token}>{token}</TokenPill>
                      ))}
                      {(whale.tokens || []).length > 4 && (
                        <TokenPill>+{whale.tokens.length - 4}</TokenPill>
                      )}
                    </TokenPills>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <ScoreBadge $score={whale.whaleScore}>
                      {whale.whaleScore?.toFixed(1) || '—'}
                    </ScoreBadge>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <LastSeenText>
                      {whale.lastSeen ? timeAgo(whale.lastSeen) : '—'}
                    </LastSeenText>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : (
        <EmptyState>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <h3>No Whale Activity</h3>
          <p>No significant whale transactions detected in the past 7 days.</p>
        </EmptyState>
      )}
    </Container>
  )
}

