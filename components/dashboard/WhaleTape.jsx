'use client'
/**
 * "Latest whale trades · Ethereum": the ten newest rows of the whale feed,
 * polled from /api/trades/since every 15 s (paused while the tab is hidden).
 * Reports its freshness through onHealth so the command bar can show the
 * same chip without a second request.
 */
import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import Link from 'next/link'
import TokenIcon from '@/components/TokenIcon'
import { useLivePoll, LIVE_POLL_MS } from '@/components/live/useLivePoll'
import { HealthChip, healthOf } from '@/components/live/HealthChip'
import { mergeRows, roundDownIso } from '@/components/live/mergeRows'
import { T } from '@/lib/ui/tokens'

const ROWS = 10
const SIDE_HELP = 'BUY = the whale address received the token; SELL = it sent it. Descriptive classification, not a recommendation.'

const Panel = styled.section`
  margin: 0 0 1rem;
  border: 1px solid ${T.hairlineStrong};
  border-radius: ${T.radius.md};
  background: ${T.surface};
`
const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid ${T.hairline};
  h2 { margin: 0; font-size: 13px; font-weight: 600; color: ${T.ink}; }
  a { margin-left: auto; font-size: 12px; color: ${T.accent}; text-decoration: none; }
  a:hover { text-decoration: underline; }
`
const Body = styled.div`
  height: 304px;
  overflow-y: auto;
`
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  th {
    position: sticky;
    top: 0;
    background: ${T.bg};
    padding: 6px 14px;
    text-align: left;
    font-weight: 500;
    font-size: 11px;
    color: ${T.muted};
    border-bottom: 1px solid ${T.hairline};
  }
  td {
    padding: 0 14px;
    height: 26px;
    border-bottom: 1px solid ${T.hairline};
    color: ${T.body};
    white-space: nowrap;
  }
  .num { text-align: right; font-family: ${T.font.mono}; font-variant-numeric: tabular-nums; }
  tr.is-new td { background: ${T.accentSoft}; }
  @media (max-width: 560px) { .wide { display: none; } }
`
const Side = styled.span`
  display: inline-block;
  min-width: 36px;
  padding: 1px 6px;
  border-radius: ${T.radius.sm};
  font-family: ${T.font.mono};
  font-size: 10.5px;
  font-weight: 700;
  text-align: center;
  color: ${(p) => (p.$buy ? T.posText : T.negText)};
  background: ${(p) => (p.$buy ? T.posBg : T.negBg)};
`
const Empty = styled.p`
  margin: 0;
  padding: 24px 14px;
  font-size: 13px;
  color: ${T.muted};
  a { color: ${T.accent}; }
`

function fmtUsd(v) {
  const n = Math.abs(Number(v) || 0)
  if (n >= 1e6) return `$${String(Number((n / 1e6).toFixed(2)))}M`
  if (n >= 1e3) return `$${String(Number((n / 1e3).toFixed(n >= 1e5 ? 0 : 1)))}K`
  return `$${Math.round(n)}`
}

function ago(ts, nowMs) {
  const s = Math.max(0, Math.round((nowMs - Date.parse(ts)) / 1000))
  if (s < 60) return `${s} s ago`
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  return `${Math.floor(s / 3600)} h ago`
}

function who(t) {
  if (t.counterparty_type && !/^unknown$/i.test(t.counterparty_type)) return t.counterparty_type
  const a = t.whale_address || t.from_address || ''
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '—'
}

export default function WhaleTape({ onHealth }) {
  const [rows, setRows] = useState([])
  const [flash, setFlash] = useState(new Set())
  const [now, setNow] = useState(() => Date.now())
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  // First read: the newest rows of the last hour; then only rows newer
  // than the newest one on screen.
  const poll = useLivePoll((signal) => {
    const newest = rowsRef.current[0]?.timestamp
    const after = roundDownIso(newest ? Date.parse(newest) : Date.now() - 3_600_000)
    return fetch(`/api/trades/since?after=${encodeURIComponent(after)}&sinceHours=1&limit=${ROWS}`, { signal })
  }, { intervalMs: LIVE_POLL_MS })

  useEffect(() => {
    const incoming = poll.data?.data
    if (!incoming?.length) return
    const first = rowsRef.current.length === 0
    const { rows: merged, newIds } = mergeRows(rowsRef.current, incoming, ROWS)
    setRows(merged)
    if (!first && newIds.length) {
      setFlash(new Set(newIds))
      const t = setTimeout(() => setFlash(new Set()), 2000)
      return () => clearTimeout(t)
    }
  }, [poll.data])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const clockNow = now + (poll.offsetMs || 0)
  const loaded = poll.pollsOk > 0 || poll.consecutiveFailures > 0
  const health = healthOf({
    newestAt: rows[0]?.timestamp,
    now: clockNow,
    lastPollOkAt: poll.lastFetchedAt,
    intervalMs: LIVE_POLL_MS,
    consecutiveFailures: poll.consecutiveFailures,
  })

  const lastReported = useRef(null)
  useEffect(() => {
    if (!loaded || !onHealth) return
    const key = `${health}|${rows[0]?.timestamp || ''}`
    if (lastReported.current === key) return
    lastReported.current = key
    onHealth({ health, newestAt: rows[0]?.timestamp || null })
  }, [loaded, health, rows, onHealth])

  return (
    <Panel data-testid="whale-tape" aria-label="Latest whale trades">
      <Head>
        <h2>Latest whale trades · Ethereum</h2>
        {loaded && (
          <HealthChip
            health={health}
            testId="whale-tape-health"
            title={rows[0] ? `Newest trade ${ago(rows[0].timestamp, clockNow)}` : 'No whale trades in the last hour'}
          />
        )}
        <Link href="/statistics">All trades →</Link>
      </Head>
      <Body>
        {loaded && rows.length === 0 ? (
          <Empty>
            {poll.error ? 'Whale trades did not load. We will keep retrying.' : 'No whale trades in the last hour.'}{' '}
            <a href={`/ai-advisor?q=${encodeURIComponent('What were the largest whale trades today?')}&send=1`}>Ask ORCA</a>
          </Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Token</th>
                <th title={SIDE_HELP}>Side ⓘ</th>
                <th className="num">USD</th>
                <th className="wide">Wallet</th>
                <th className="num">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const buy = String(t.classification || '').toUpperCase() === 'BUY'
                return (
                  <tr key={t.transaction_hash} className={flash.has(t.transaction_hash) ? 'is-new' : undefined}>
                    <td>
                      <Link href={`/token/${encodeURIComponent(t.token_symbol || '')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.ink, textDecoration: 'none' }}>
                        <TokenIcon symbol={t.token_symbol} size={16} />
                        {t.token_symbol}
                      </Link>
                    </td>
                    <td><Side $buy={buy}>{buy ? 'BUY' : String(t.classification || '—').toUpperCase()}</Side></td>
                    <td className="num" style={{ color: T.ink }}>{fmtUsd(t.usd_value)}</td>
                    <td className="wide" style={{ fontFamily: T.font.mono, fontSize: 12 }}>{who(t)}</td>
                    <td className="num" style={{ color: T.muted }}>{ago(t.timestamp, clockNow)}</td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Body>
    </Panel>
  )
}
