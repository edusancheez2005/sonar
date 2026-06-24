'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import SonarLoader from './SonarLoader'
import { formatUsd } from '@/lib/wallet-tracker'

const Card = styled.div`
  position: relative;
  background: linear-gradient(180deg, rgba(13, 33, 52, 0.72) 0%, rgba(8, 16, 25, 0.62) 100%);
  border: 1px solid var(--neon-border);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.04);
`

const Title = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.74rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 1.4px;
  font-weight: 700;
  color: var(--neon-bright);
  margin-bottom: 1rem;

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--neon-cyan);
    box-shadow: 0 0 10px var(--neon-glow);
  }
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 0.6rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--secondary);
    font-size: 0.85rem;
  }

  th {
    color: var(--text-secondary);
    font-weight: 500;
  }

  tr:last-child td {
    border-bottom: none;
  }
`

const TokenSymbol = styled(Link)`
  font-weight: 700;
  color: var(--text-primary);
  text-decoration: none;

  &:hover {
    color: var(--primary);
  }
`

const ChainBadge = styled.span`
  font-size: 0.65rem;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  background: rgba(54, 166, 186, 0.1);
  color: var(--primary);
  text-transform: uppercase;
  margin-left: 0.4rem;
`

const NetFlow = styled.span`
  font-weight: 600;
  color: ${({ $positive }) => $positive ? '#00d4aa' : '#ff6b6b'};
`

const FlowBar = styled.div`
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  width: 80px;
  background: rgba(255, 255, 255, 0.05);
`

const BuyBar = styled.div`
  height: 100%;
  background: var(--buy-color);
  width: ${({ $pct }) => $pct}%;
`

const SellBar = styled.div`
  height: 100%;
  background: var(--sell-color);
  width: ${({ $pct }) => $pct}%;
`

export default function HoldingsTable({ address }) {
  const [holdings, setHoldings] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchHoldings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/wallet-tracker/${encodeURIComponent(address)}/holdings`)
      const json = await res.json()
      setHoldings(json.data || [])
    } catch {
      setHoldings([])
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    fetchHoldings()
  }, [fetchHoldings])

  if (loading) {
    return (
      <Card>
        <Title>Token Holdings</Title>
        <SonarLoader text="Scanning holdings..." size={50} compact />
      </Card>
    )
  }

  if (holdings.length === 0) {
    return (
      <Card>
        <Title>Token Holdings</Title>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No holding data available</p>
      </Card>
    )
  }

  return (
    <Card>
      <Title>Token Holdings</Title>
      <Table>
        <thead>
          <tr>
            <th>Token</th>
            <th>Net Flow</th>
            <th>Buy / Sell</th>
            <th>Buy Vol</th>
            <th>Sell Vol</th>
            <th>Txs</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const total = h.buy_volume + h.sell_volume
            const buyPct = total > 0 ? (h.buy_volume / total) * 100 : 50
            const sellPct = 100 - buyPct
            return (
              <tr key={h.symbol}>
                <td>
                  <TokenSymbol href={`/token/${encodeURIComponent(h.symbol)}?sinceHours=24`}>{h.symbol}</TokenSymbol>
                  {h.chain && <ChainBadge>{h.chain}</ChainBadge>}
                </td>
                <td>
                  <NetFlow $positive={h.net_flow >= 0}>
                    {h.net_flow >= 0 ? '+' : ''}{formatUsd(h.net_flow)}
                  </NetFlow>
                </td>
                <td>
                  <FlowBar>
                    <BuyBar $pct={buyPct} />
                    <SellBar $pct={sellPct} />
                  </FlowBar>
                </td>
                <td style={{ color: 'var(--buy-color)' }}>{formatUsd(h.buy_volume)}</td>
                <td style={{ color: 'var(--sell-color)' }}>{formatUsd(h.sell_volume)}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{h.tx_count}</td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </Card>
  )
}
