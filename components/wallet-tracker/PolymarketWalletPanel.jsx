'use client'
import React from 'react'
import styled from 'styled-components'
import { formatUsd } from '@/lib/wallet-tracker'

// Renders a Polymarket proxy wallet's prediction-market footprint
// (positions + recent fills) on the wallet-tracker page. Data comes from the
// wallet-tracker API's Polymarket fallback (polymarket_whales + activity).

const Card = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const Pill = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: rgba(54, 166, 186, 0.15);
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
`

const ScrollX = styled.div`
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;

  th, td {
    padding: 0.65rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid rgba(54, 166, 186, 0.1);
    white-space: nowrap;
  }
  th {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    font-weight: 700;
  }
  td { color: var(--text-primary); }
  td.q {
    white-space: normal;
    min-width: 240px;
    max-width: 420px;
  }
  tr:last-child td { border-bottom: none; }
`

const Outcome = styled.span`
  font-weight: 700;
  color: ${({ $yes }) => ($yes ? '#00d4aa' : '#ff6b6b')};
`

const Side = styled.span`
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ $buy }) => ($buy ? '#00d4aa' : '#ff6b6b')};
`

const Empty = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
  padding: 0.5rem 0;
`

function pnlColor(n) {
  return n > 0 ? '#00d4aa' : n < 0 ? '#ff6b6b' : 'var(--text-primary)'
}

function fmtPnl(n) {
  const v = Number(n) || 0
  return `${v > 0 ? '+' : ''}${formatUsd(v)}`
}

function fmtPrice(p) {
  if (p == null || !Number.isFinite(Number(p))) return '—'
  return `${(Number(p) * 100).toFixed(1)}¢`
}

function fmtTs(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function PolymarketWalletPanel({ polymarket }) {
  if (!polymarket) return null
  const positions = Array.isArray(polymarket.positions) ? polymarket.positions : []
  const trades = Array.isArray(polymarket.recent_trades) ? polymarket.recent_trades : []

  return (
    <>
      <Card>
        <CardTitle>
          Polymarket Positions <Pill>Prediction Markets</Pill>
        </CardTitle>
        {positions.length === 0 ? (
          <Empty>No open positions recorded.</Empty>
        ) : (
          <ScrollX>
            <Table>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Outcome</th>
                  <th style={{ textAlign: 'right' }}>Avg → Cur</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                  <th style={{ textAlign: 'right' }}>PnL</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p, i) => (
                  <tr key={`${p.market_question || 'm'}-${i}`}>
                    <td className="q">{p.market_question || '—'}</td>
                    <td>
                      <Outcome $yes={String(p.outcome).toLowerCase() === 'yes'}>{p.outcome || '—'}</Outcome>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {fmtPrice(p.avg_price)} → {fmtPrice(p.cur_price)}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatUsd(p.value_usd)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: pnlColor(p.pnl_usd) }}>
                      {fmtPnl(p.pnl_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </ScrollX>
        )}
      </Card>

      <Card>
        <CardTitle>Recent Polymarket Trades</CardTitle>
        {trades.length === 0 ? (
          <Empty>No recent trades recorded.</Empty>
        ) : (
          <ScrollX>
            <Table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Side</th>
                  <th>Outcome</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>Size</th>
                  <th style={{ textAlign: 'right' }}>USD</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => (
                  <tr key={`${t.tx_hash || 't'}-${i}`}>
                    <td style={{ color: 'var(--text-secondary)' }}>{fmtTs(t.ts)}</td>
                    <td>
                      <Side $buy={String(t.side).toLowerCase() === 'buy'}>{t.side || '—'}</Side>
                    </td>
                    <td>
                      <Outcome $yes={String(t.outcome).toLowerCase() === 'yes'}>{t.outcome || '—'}</Outcome>
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmtPrice(t.price)}</td>
                    <td style={{ textAlign: 'right' }}>{(Number(t.size) || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatUsd(t.usd_value)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </ScrollX>
        )}
      </Card>
    </>
  )
}
