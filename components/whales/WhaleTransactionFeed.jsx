/**
 * WhaleTransactionFeed — Live-updating whale transaction ticker
 * Polls /api/whales/latest every 10s, animates new transactions in
 */

'use client'

import { useEffect, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { FONT_SANS, FONT_MONO } from '@/src/styles/fontStacks'
import { useLivePoll } from '@/components/live/useLivePoll'
import { HealthChip, healthOf } from '@/components/live/HealthChip'

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); max-height: 0; }
  to { opacity: 1; transform: translateY(0); max-height: 60px; }
`

const pulseNew = keyframes`
  0% { border-left-color: #00e5ff; }
  50% { border-left-color: transparent; }
  100% { border-left-color: #00e5ff; }
`

const Wrapper = styled.div`
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(0, 229, 255, 0.15); border-radius: 2px; }
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  font-family: ${FONT_MONO};
  font-size: 0.68rem;
  transition: background 0.15s;
  border-left: 2px solid transparent;
  @media (prefers-reduced-motion: no-preference) {
    ${p => p.$isNew && css`animation: ${slideIn} 0.4s ease-out;`}
  }

  &:hover { background: rgba(0, 229, 255, 0.03); }
`

const Side = styled.span`
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; padding: 0.15rem 0; border-radius: 3px;
  font-weight: 700; font-size: 0.6rem; letter-spacing: 0.3px; text-align: center;
  background: ${p => p.$buy ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 23, 68, 0.1)'};
  color: ${p => p.$buy ? '#00e676' : '#ff1744'};
  border: 1px solid ${p => p.$buy ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 23, 68, 0.15)'};
`

const Token = styled.span`
  font-weight: 700; color: #00e5ff; min-width: 42px;
`

const Amount = styled.span`
  font-weight: 600; color: #e0e6ed; min-width: 70px;
`

const Chain = styled.span`
  font-size: 0.58rem; color: #5a6a7a; text-transform: uppercase;
  min-width: 50px;
`

const Time = styled.span`
  font-size: 0.58rem; color: #5a6a7a; margin-left: auto; white-space: nowrap;
`

const Header = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 0.6rem 0.5rem; border-bottom: 1px solid rgba(0, 229, 255, 0.08);
  font-family: ${FONT_MONO}; font-size: 0.65rem; color: #5a6a7a;
`

const FilterBar = styled.div`
  display: flex; gap: 0.3rem; align-items: center;
`

const FilterBtn = styled.button`
  padding: 0.15rem 0.4rem; border-radius: 3px; font-family: ${FONT_MONO};
  font-size: 0.6rem; font-weight: 600; cursor: pointer; transition: all 0.12s;
  border: 1px solid ${p => p.$active ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255,255,255,0.06)'};
  background: ${p => p.$active ? 'rgba(0, 229, 255, 0.08)' : 'transparent'};
  color: ${p => p.$active ? '#00e5ff' : '#5a6a7a'};
  &:hover { color: #00e5ff; }
`

function formatUsd(v) {
  if (!v) return '$0'
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function askOrca(symbol) {
  const q = `What did whales do with ${symbol} in the last 24 hours, and what moved the price?`
  return `/ai-advisor?q=${encodeURIComponent(q)}&ticker=${encodeURIComponent(symbol)}&send=1`
}

export default function WhaleTransactionFeed({ symbol = null, limit = 30, pollInterval = 10000 }) {
  const [filter, setFilter] = useState('all') // all, buy, sell
  const url = `/api/whales/latest?limit=${limit}${symbol ? `&token=${encodeURIComponent(symbol)}` : ''}`
  // Pauses while the tab is hidden; filter or symbol changes cancel in-flight reads.
  const poll = useLivePoll((signal) => fetch(url, { signal }), {
    intervalMs: pollInterval,
    getIds: (body) => (body?.data || []).map((t) => t.transaction_hash),
  })
  const txns = poll.data?.data || []
  const windowLabel = poll.data?.window_hours > 24 ? 'the last 7 days' : 'the last 24 hours'
  const [newIds, setNewIds] = useState(new Set())
  useEffect(() => {
    if (!poll.newIds.length) return
    setNewIds(new Set(poll.newIds))
    const t = setTimeout(() => setNewIds(new Set()), 2000)
    return () => clearTimeout(t)
  }, [poll.newIds])
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(id)
  }, [])
  const health = healthOf({
    newestAt: txns[0]?.timestamp,
    now: now + (poll.offsetMs || 0),
    lastPollOkAt: poll.lastFetchedAt,
    intervalMs: pollInterval,
    consecutiveFailures: poll.consecutiveFailures,
  })
  const loaded = poll.pollsOk > 0 || poll.consecutiveFailures > 0

  const filtered = filter === 'all' ? txns
    : txns.filter(t => t.classification?.toLowerCase() === filter)

  return (
    <div>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {loaded && txns.length > 0 && (
            <HealthChip health={health} testId="token-whale-health" title={`Newest trade shown: ${timeAgo(txns[0].timestamp)}`} />
          )}
          <span style={{ marginLeft: '0.5rem' }}>
            {symbol ? `${symbol} whale transactions` : 'All whale transactions'}
          </span>
        </div>
        <FilterBar>
          <FilterBtn $active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterBtn>
          <FilterBtn $active={filter === 'buy'} onClick={() => setFilter('buy')}>Buys</FilterBtn>
          <FilterBtn $active={filter === 'sell'} onClick={() => setFilter('sell')}>Sells</FilterBtn>
        </FilterBar>
      </Header>
      <Wrapper>
        {filtered.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.7rem', color: '#5a6a7a' }}>
            {!loaded
              ? 'Loading transactions...'
              : txns.length > 0
                ? 'No transactions match filter'
                : <>
                    {poll.error && !poll.data ? 'Whale trades did not load.' : `No whale trades${symbol ? ` for ${symbol}` : ''} in ${windowLabel}.`}
                    {symbol ? <> <a href={askOrca(symbol)} style={{ color: '#00e5ff' }}>Ask ORCA</a></> : null}
                  </>}
          </div>
        )}
        {filtered.map(tx => {
          const isBuy = tx.classification === 'BUY'
          const isNew = newIds.has(tx.transaction_hash)
          return (
            <Row key={tx.transaction_hash} $isNew={isNew}>
              <Side $buy={isBuy}>{isBuy ? 'BUY' : 'SELL'}</Side>
              <Token>{tx.token_symbol}</Token>
              <Amount>{formatUsd(tx.usd_value)}</Amount>
              <Chain>{tx.blockchain?.slice(0, 3)}</Chain>
              {tx.whale_score > 0 && (
                <span style={{
                  fontSize: '0.55rem', color: tx.whale_score >= 0.7 ? '#00e676' : '#ffab00',
                  fontWeight: 600,
                }}>
                  {(tx.whale_score * 100).toFixed(0)}%
                </span>
              )}
              <Time>{timeAgo(tx.timestamp)}</Time>
            </Row>
          )
        })}
      </Wrapper>
    </div>
  )
}
