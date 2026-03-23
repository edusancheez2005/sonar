'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { shortenAddress, formatUsd, timeAgo } from '@/lib/wallet-tracker'

const Card = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.25rem;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`

const Title = styled.h3`
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const LiveDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #00d4aa;
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 4px #00d4aa; }
    50% { opacity: 0.4; box-shadow: 0 0 8px #00d4aa, 0 0 16px rgba(0, 212, 170, 0.3); }
  }
`

const FeedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 500px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--secondary);
    border-radius: 2px;
  }
`

const FeedItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.6rem;
  border-radius: 8px;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`

const ActionIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 700;
  background: ${({ $type }) => $type === 'BUY' ? 'rgba(54, 166, 186, 0.15)' : 'rgba(231, 76, 60, 0.15)'};
  color: ${({ $type }) => $type === 'BUY' ? 'var(--buy-color)' : 'var(--sell-color)'};
`

const FeedContent = styled.div`
  flex: 1;
  min-width: 0;
`

const FeedTop = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
`

const WalletLink = styled(Link)`
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--primary);

  &:hover {
    color: var(--text-primary);
  }
`

const EntityLabel = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary);
`

const TokenName = styled.span`
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-primary);
`

const Value = styled.span`
  font-weight: 600;
  font-size: 0.82rem;
  color: ${({ $type }) => $type === 'BUY' ? 'var(--buy-color)' : 'var(--sell-color)'};
`

const FeedMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.2rem;
`

const Time = styled.span`
  font-size: 0.72rem;
  color: var(--text-secondary);
`

const ChainBadge = styled.span`
  font-size: 0.6rem;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  background: rgba(54, 166, 186, 0.1);
  color: var(--primary);
  text-transform: uppercase;
`

const ScoreBadge = styled.span`
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  background: ${({ $score }) => $score >= 0.7 ? 'rgba(0, 212, 170, 0.15)' : $score >= 0.5 ? 'rgba(255, 217, 61, 0.15)' : 'rgba(255,255,255,0.05)'};
  color: ${({ $score }) => $score >= 0.7 ? '#00d4aa' : $score >= 0.5 ? '#ffd93d' : 'var(--text-secondary)'};
  font-weight: 600;
`

const EmptyState = styled.p`
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-align: center;
  padding: 1.5rem 0;
`

export default function CopyTradesFeed() {
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet-tracker/signals?limit=30')
      const json = await res.json()
      setSignals(json.data || [])
    } catch {
      setSignals([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSignals()
    const interval = setInterval(fetchSignals, 60000)
    return () => clearInterval(interval)
  }, [fetchSignals])

  return (
    <Card>
      <Header>
        <Title>
          <LiveDot />
          Smart Money Moves
        </Title>
      </Header>
      {loading ? (
        <EmptyState>Loading signals...</EmptyState>
      ) : signals.length === 0 ? (
        <EmptyState>No recent smart money activity</EmptyState>
      ) : (
        <FeedList>
          {signals.map((s, i) => {
            const type = (s.classification || '').toUpperCase()
            return (
              <FeedItem key={s.transaction_hash || i}>
                <ActionIcon $type={type}>{type === 'BUY' ? 'B' : 'S'}</ActionIcon>
                <FeedContent>
                  <FeedTop>
                    <WalletLink href={`/wallet-tracker/${encodeURIComponent(s.whale_address)}`}>
                      {s.entity_name || shortenAddress(s.whale_address, 4)}
                    </WalletLink>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {type === 'BUY' ? 'bought' : 'sold'}
                    </span>
                    <TokenName>{s.token_symbol}</TokenName>
                    <Value $type={type}>{formatUsd(s.usd_value)}</Value>
                  </FeedTop>
                  <FeedMeta>
                    <Time>{timeAgo(s.timestamp)}</Time>
                    {s.blockchain && <ChainBadge>{s.blockchain}</ChainBadge>}
                    {s.smart_money_score && (
                      <ScoreBadge $score={s.smart_money_score}>
                        Score {Math.round(s.smart_money_score * 100)}
                      </ScoreBadge>
                    )}
                  </FeedMeta>
                </FeedContent>
              </FeedItem>
            )
          })}
        </FeedList>
      )}
    </Card>
  )
}
