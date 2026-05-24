'use client'
/**
 * WatchlistPanel
 * =============================================================================
 * Personal Dashboard Panel A (§4.D of ORCA_COPILOT_BUILD_PROMPT.md).
 *
 * Renders mini-cards for every ticker in user_watchlist + user_holdings.
 * Each card shows price, 24h %, 7d %, a whale-flow direction arrow and a
 * truncated latest headline. Numbers that the upstream is missing render as
 * an em-dash; the panel never shows a half-loaded skeleton with no fallback
 * (House Rules §3.5.2).
 */
import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: rgba(13, 20, 33, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 20px 22px;
`

const Header = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`

const Title = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #e0e6ed;
`

const Sub = styled.span`
  font-size: 11px;
  color: #6b7a8c;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

const Grid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
`

const Card = styled.a`
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 14px 16px;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover { background: rgba(0, 229, 255, 0.04); border-color: rgba(0, 229, 255, 0.25); }
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
`

const TickerRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const Ticker = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #e0e6ed;
`

const SourceTag = styled.span`
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${(p) => (p.$source === 'holding' ? '#36a6ba' : '#6b7a8c')};
`

const Price = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #e0e6ed;
  font-variant-numeric: tabular-nums;
`

const Changes = styled.div`
  display: flex;
  gap: 12px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
`

const Change = styled.span`
  color: ${(p) => (p.$value > 0 ? '#3ed598' : p.$value < 0 ? '#ff5c7c' : '#6b7a8c')};
`

const FlowRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #8896a6;
`

const Headline = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #8896a6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const Empty = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #8896a6;
`

const ErrorText = styled.p`
  margin: 0;
  font-size: 13px;
  color: #ff7a7a;
`

function formatPrice(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  if (n >= 1) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  if (n >= 0.01) return `$${n.toFixed(3)}`
  return `$${n.toPrecision(3)}`
}

function formatPct(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  const s = n >= 0 ? '+' : ''
  return `${s}${n.toFixed(2)}%`
}

function arrowFor(direction) {
  if (direction === 'up') return '↑'
  if (direction === 'down') return '↓'
  if (direction === 'flat') return '–'
  return '—'
}

export default function WatchlistPanel({ client, fetchImpl }) {
  const [state, setState] = useState({ status: 'loading', items: [], error: null })

  useEffect(() => {
    let cancelled = false
    const sb = client ?? supabaseBrowser()
    const doFetch = fetchImpl ?? fetch

    async function load() {
      try {
        const { data: sessionData } = await sb.auth.getSession()
        const token = sessionData?.session?.access_token
        if (!token) {
          if (!cancelled) setState({ status: 'unauth', items: [], error: null })
          return
        }
        const res = await doFetch('/api/personal/watchlist', {
          headers: { authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          if (!cancelled) {
            setState({ status: 'error', items: [], error: `HTTP ${res.status}` })
          }
          return
        }
        const body = await res.json()
        if (cancelled) return
        const items = Array.isArray(body?.items) ? body.items : []
        setState({ status: 'ready', items, error: null })
      } catch (err) {
        if (!cancelled) {
          setState({ status: 'error', items: [], error: 'network' })
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [client, fetchImpl])

  return (
    <Wrap aria-labelledby="watchlist-panel-title">
      <Header>
        <Title id="watchlist-panel-title">Your watchlist</Title>
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
        <Grid>
          {state.items.map((item) => (
            <Card
              key={`${item.source}-${item.ticker}`}
              href={`/token/${encodeURIComponent(item.ticker.toLowerCase())}`}
              data-testid={`watchlist-card-${item.ticker}`}
            >
              <TickerRow>
                <Ticker>{item.ticker}</Ticker>
                <SourceTag $source={item.source}>
                  {item.source === 'holding' ? 'Holding' : 'Watch'}
                </SourceTag>
              </TickerRow>
              <Price>{formatPrice(item.price_usd)}</Price>
              <Changes>
                <Change $value={item.change_24h ?? 0}>24h {formatPct(item.change_24h)}</Change>
                <Change $value={item.change_7d ?? 0}>7d {formatPct(item.change_7d)}</Change>
              </Changes>
              <FlowRow>
                <span>Whale flow {arrowFor(item.net_flow_direction)}</span>
              </FlowRow>
              {item.latest_headline ? (
                <Headline>{item.latest_headline}</Headline>
              ) : (
                <Headline aria-hidden="true">No recent headline.</Headline>
              )}
            </Card>
          ))}
        </Grid>
      )}
    </Wrap>
  )
}
