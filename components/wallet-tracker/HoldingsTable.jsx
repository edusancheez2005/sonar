'use client'
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { formatUsd } from '@/lib/wallet-tracker'

const Card = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`

const Title = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
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

const TokenSymbol = styled.span`
  font-weight: 700;
  color: var(--text-primary);
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
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading...</p>
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
                  <TokenSymbol>{h.symbol}</TokenSymbol>
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
