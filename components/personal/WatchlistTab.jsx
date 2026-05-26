'use client'
/**
 * WatchlistTab \u2014 W4 §3.2.
 * =============================================================================
 * Denser table-style replacement for WatchlistPanel's grid. Each row has:
 *   ticker | 1h% | 24h% | 7d% | whale pip | "Ask ORCA" button
 *
 * "Ask ORCA" calls onAskOrca(ticker) which the parent uses to pre-fill the
 * copilot input with "explain why $TICKER moved today" (see
 * PersonalDashboardClient + CopilotPane in W5).
 *
 * We do NOT delete WatchlistPanel; this is a tab variant of the same data.
 */
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const Title = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #e0e6ed;
`

const Sub = styled.span`
  font-size: 11px;
  color: #6b7a8c;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const TableWrap = styled.div`
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;

  th, td {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    white-space: nowrap;
  }

  th {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7a8c;
    font-weight: 600;
  }
`

const Ticker = styled.a`
  color: #00e5ff;
  font-weight: 600;
  text-decoration: none;
  &:hover { text-decoration: underline; }
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
`

const Pct = styled.span`
  color: ${(p) => (p.$v > 0 ? '#4ade80' : p.$v < 0 ? '#ff7a7a' : '#8896a6')};
`

const Pip = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) =>
    p.$d === 'up' ? '#4ade80'
    : p.$d === 'down' ? '#ff7a7a'
    : '#6b7a8c'};
  margin-right: 6px;
  vertical-align: middle;
`

const AskBtn = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #00e5ff;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 4px 10px;
  cursor: pointer;
  &:hover { border-color: rgba(0, 229, 255, 0.4); background: rgba(0, 229, 255, 0.05); }
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
`

const Empty = styled.p`
  margin: 0;
  font-size: 13px;
  color: #8896a6;
  line-height: 1.55;
`

const ErrorText = styled.p`
  margin: 0;
  font-size: 13px;
  color: #ff7a7a;
`

function fmtPct(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '\u2014'
  const s = n >= 0 ? '+' : ''
  return `${s}${n.toFixed(2)}%`
}

export default function WatchlistTab({ client, fetchImpl, onAskOrca }) {
  const [state, setState] = useState({ status: 'loading', items: [], error: null })

  const load = useCallback(async ({ signal } = {}) => {
    const sb = client ?? supabaseBrowser()
    const doFetch = fetchImpl ?? fetch
    try {
      const { data: sessionData } = await sb.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        if (!signal?.aborted) setState({ status: 'unauth', items: [], error: null })
        return
      }
      const res = await doFetch('/api/personal/watchlist', {
        headers: { authorization: `Bearer ${token}` },
        signal,
      })
      if (!res.ok) {
        if (!signal?.aborted) setState({ status: 'error', items: [], error: `HTTP ${res.status}` })
        return
      }
      const body = await res.json()
      if (signal?.aborted) return
      const items = Array.isArray(body?.items) ? body.items : []
      setState({ status: 'ready', items, error: null })
    } catch {
      if (!signal?.aborted) setState({ status: 'error', items: [], error: 'network' })
    }
  }, [client, fetchImpl])

  useEffect(() => {
    const controller = new AbortController()
    load({ signal: controller.signal })
    return () => controller.abort()
  }, [load])

  // Stage B.2 — refresh when ORCA chat completes a fast-write.
  useEffect(() => {
    const handler = () => { load() }
    if (typeof window !== 'undefined') {
      window.addEventListener('orca:watchlist-changed', handler)
      return () => window.removeEventListener('orca:watchlist-changed', handler)
    }
  }, [load])

  return (
    <Wrap data-testid="watchlist-tab" aria-labelledby="watchlist-tab-title">
      <Header>
        <Title id="watchlist-tab-title">Your watchlist</Title>
        <Sub>{state.items.length > 0 ? `${state.items.length} tracked` : ''}</Sub>
      </Header>

      {state.status === 'loading' && (
        <Empty role="status" aria-live="polite">Loading your tickers.</Empty>
      )}
      {state.status === 'error' && (
        <ErrorText role="alert">Could not load watchlist. Retry shortly.</ErrorText>
      )}
      {state.status === 'unauth' && (
        <Empty>Sign in to see your personal watchlist.</Empty>
      )}
      {state.status === 'ready' && state.items.length === 0 && (
        <Empty>
          Add tickers from any token page, or ask ORCA: <em>add SOL to my watchlist</em>.
        </Empty>
      )}

      {state.status === 'ready' && state.items.length > 0 && (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th scope="col">Ticker</th>
                <th scope="col">24h</th>
                <th scope="col">7d</th>
                <th scope="col">Whale</th>
                <th scope="col" aria-label="actions"></th>
              </tr>
            </thead>
            <tbody>
              {state.items.map((it) => (
                <tr key={`${it.source}-${it.ticker}`} data-testid={`watchlist-row-${it.ticker}`}>
                  <td>
                    <Ticker href={`/token/${encodeURIComponent(String(it.ticker).toLowerCase())}`}>
                      {it.ticker}
                    </Ticker>
                  </td>
                  <td><Pct $v={it.change_24h ?? 0}>{fmtPct(it.change_24h)}</Pct></td>
                  <td><Pct $v={it.change_7d ?? 0}>{fmtPct(it.change_7d)}</Pct></td>
                  <td><Pip $d={it.net_flow_direction} />{it.net_flow_direction || 'flat'}</td>
                  <td>
                    <AskBtn
                      type="button"
                      data-testid={`watchlist-ask-${it.ticker}`}
                      onClick={() => onAskOrca && onAskOrca(it.ticker)}
                    >
                      Ask ORCA
                    </AskBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Wrap>
  )
}
