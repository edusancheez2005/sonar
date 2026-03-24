'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
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

const HeartIcon = styled.span`
  color: #00e5ff;
  font-size: 1rem;
  line-height: 1;
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

const EmptyState = styled.p`
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-align: center;
  padding: 1.5rem 0;
`

async function getAuthHeaders() {
  const sb = supabaseBrowser()
  const { data } = await sb.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export default function FollowingFeed() {
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(true)
  const [noAuth, setNoAuth] = useState(false)

  const fetchFeed = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers.Authorization) {
      setNoAuth(true)
      setLoading(false)
      return
    }

    try {
      // Fetch followed addresses
      const followRes = await fetch('/api/wallet-tracker/follows', { headers })
      if (!followRes.ok) {
        setLoading(false)
        return
      }
      const follows = await followRes.json()
      if (!follows.length) {
        setSignals([])
        setLoading(false)
        return
      }

      const addresses = follows.map(f => f.address)

      // Fetch recent transactions for each followed address (batch up to 10)
      const batch = addresses.slice(0, 10)
      const txPromises = batch.map(addr =>
        fetch(`/api/wallet-tracker/${encodeURIComponent(addr)}/transactions?limit=5`)
          .then(r => r.ok ? r.json() : { data: [] })
          .then(json => (json.data || []).map(tx => ({ ...tx, whale_address: addr })))
          .catch(() => [])
      )

      const results = await Promise.all(txPromises)
      const allTxs = results.flat()

      // Sort by timestamp descending
      allTxs.sort((a, b) => {
        const tA = new Date(a.timestamp || a.block_time || 0).getTime()
        const tB = new Date(b.timestamp || b.block_time || 0).getTime()
        return tB - tA
      })

      setSignals(allTxs.slice(0, 30))
    } catch {
      setSignals([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeed()
    const interval = setInterval(fetchFeed, 60000)
    return () => clearInterval(interval)
  }, [fetchFeed])

  if (noAuth) {
    return (
      <Card>
        <Header>
          <Title>
            <HeartIcon>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#00e5ff" stroke="#00e5ff" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </HeartIcon>
            Following Feed
          </Title>
        </Header>
        <EmptyState>Sign in to follow wallets</EmptyState>
      </Card>
    )
  }

  return (
    <Card>
      <Header>
        <Title>
          <HeartIcon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#00e5ff" stroke="#00e5ff" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </HeartIcon>
          Following Feed
        </Title>
      </Header>
      {loading ? (
        <EmptyState>Loading...</EmptyState>
      ) : signals.length === 0 ? (
        <EmptyState>Follow wallets to see their activity here</EmptyState>
      ) : (
        <FeedList>
          {signals.map((s, i) => {
            const type = (s.classification || '').toUpperCase()
            return (
              <FeedItem key={s.transaction_hash || s.signature || i}>
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
                    {s.usd_value != null && <Value $type={type}>{formatUsd(s.usd_value)}</Value>}
                  </FeedTop>
                  <FeedMeta>
                    <Time>{timeAgo(s.timestamp || s.block_time)}</Time>
                    {s.blockchain && <ChainBadge>{s.blockchain}</ChainBadge>}
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
