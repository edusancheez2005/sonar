/**
 * WhaleTransactionFeed — Live-updating whale transaction ticker
 * Polls /api/whales/latest every 10s, animates new transactions in
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import styled, { keyframes } from 'styled-components'

const MONO = "'JetBrains Mono', 'Fira Code', monospace"
const SANS = "'Inter', 'Segoe UI', system-ui, sans-serif"

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
  font-family: ${MONO};
  font-size: 0.68rem;
  transition: background 0.15s;
  border-left: 2px solid transparent;
  animation: ${p => p.$isNew ? slideIn : 'none'} 0.4s ease-out;

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

const LiveDot = styled.span`
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  background: #00e676; margin-right: 0.3rem;
  animation: ${keyframes`0%,100%{opacity:1;}50%{opacity:0.3;}`} 2s infinite;
`

const Header = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 0.6rem 0.5rem; border-bottom: 1px solid rgba(0, 229, 255, 0.08);
  font-family: ${MONO}; font-size: 0.65rem; color: #5a6a7a;
`

const FilterBar = styled.div`
  display: flex; gap: 0.3rem; align-items: center;
`

const FilterBtn = styled.button`
  padding: 0.15rem 0.4rem; border-radius: 3px; font-family: ${MONO};
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

export default function WhaleTransactionFeed({ symbol = null, limit = 30, pollInterval = 10000 }) {
  const [txns, setTxns] = useState([])
  const [newIds, setNewIds] = useState(new Set())
  const [filter, setFilter] = useState('all') // all, buy, sell
  const prevIdsRef = useRef(new Set())
  const intervalRef = useRef(null)

  const fetchTxns = async () => {
    try {
      let url = `/api/whales/latest?limit=${limit}`
      if (symbol) url += `&token=${symbol}`
      const res = await fetch(url)
      if (!res.ok) return
      const json = await res.json()
      const data = json.data || []

      // Identify new transactions
      const currentIds = new Set(data.map(t => t.transaction_hash))
      const fresh = new Set()
      for (const id of currentIds) {
        if (!prevIdsRef.current.has(id)) fresh.add(id)
      }
      prevIdsRef.current = currentIds

      // Only mark as "new" after first load
      if (txns.length > 0) {
        setNewIds(fresh)
        // Clear "new" animation class after 2s
        setTimeout(() => setNewIds(new Set()), 2000)
      }

      setTxns(data)
    } catch {}
  }

  useEffect(() => {
    fetchTxns()
    intervalRef.current = setInterval(fetchTxns, pollInterval)
    return () => clearInterval(intervalRef.current)
  }, [symbol, limit, pollInterval])

  const filtered = filter === 'all' ? txns
    : txns.filter(t => t.classification?.toLowerCase() === filter)

  return (
    <div>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <LiveDot />
          <span style={{ color: '#00e676', fontWeight: 600 }}>LIVE</span>
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
          <div style={{ padding: '2rem', textAlign: 'center', fontFamily: MONO, fontSize: '0.7rem', color: '#5a6a7a' }}>
            {txns.length === 0 ? 'Loading transactions...' : 'No transactions match filter'}
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
