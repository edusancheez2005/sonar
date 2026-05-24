'use client'
/**
 * FilteredSignalsPanel — §4.D Panel C
 * =============================================================================
 * Reads /api/personal/signals and renders the user's personalised signal
 * feed (sourced from production `token_signals`, filtered by their
 * risk_tolerance + time_horizon).
 *
 * IMPORTANT:
 *  - This panel surfaces existing production signals only. It does NOT read
 *    from `signal_research_results` (§4.F, research-only).
 *  - No "buy/sell" CTAs. Each row is informational + links to the token
 *    page for the user to investigate. Per House Rules §3.5.6 the copilot
 *    never tells users to act.
 */
import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const Wrap = styled.section`
  background: rgba(13, 20, 33, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 20px 22px;
  color: #e0e6ed;
  display: flex;
  flex-direction: column;
  gap: 14px;
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
`

const Sub = styled.span`
  font-size: 12px;
  color: #8896a6;
`

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const Row = styled.li`
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
`

const Ticker = styled.a`
  font-weight: 700;
  font-size: 14px;
  color: #00e5ff;
  text-decoration: none;
  &:hover { text-decoration: underline; }
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const SignalLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${(p) =>
    p.$kind === 'buy' ? '#36e6a6'
    : p.$kind === 'sell' ? '#ff7a7a'
    : '#e0e6ed'};
  letter-spacing: 0.04em;
`

const Reason = styled.span`
  font-size: 12px;
  color: #8896a6;
  line-height: 1.45;
`

const Confidence = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #e0e6ed;
  font-weight: 600;
`

const Footnote = styled.p`
  margin: 0;
  font-size: 11px;
  color: #6c7888;
  line-height: 1.5;
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

function kindFor(label) {
  if (!label) return 'neutral'
  if (label.includes('BUY')) return 'buy'
  if (label.includes('SELL')) return 'sell'
  return 'neutral'
}

function emptyMessageFor(reason, profileApplied) {
  if (reason === 'no_tickers') {
    return 'Add tickers from any token page to get personalised signals.'
  }
  const risk = profileApplied?.risk_tolerance
  if (risk === 'conservative') {
    return 'No high-conviction signals on your watchlist right now. Conservative profiles only see STRONG BUY / STRONG SELL with at least 80% confidence.'
  }
  return 'No signals on your watchlist match your profile right now.'
}

export default function FilteredSignalsPanel({ client, fetchImpl } = {}) {
  const [state, setState] = useState({
    status: 'loading',
    items: [],
    profileApplied: null,
    emptyReason: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    const sb = client ?? supabaseBrowser()
    const doFetch = fetchImpl ?? fetch

    async function load() {
      try {
        const { data: sessionData } = await sb.auth.getSession()
        const token = sessionData?.session?.access_token
        if (!token) {
          if (!cancelled)
            setState({
              status: 'unauth',
              items: [],
              profileApplied: null,
              emptyReason: null,
              error: null,
            })
          return
        }
        const res = await doFetch('/api/personal/signals', {
          headers: { authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          if (!cancelled)
            setState({
              status: 'error',
              items: [],
              profileApplied: null,
              emptyReason: null,
              error: `HTTP ${res.status}`,
            })
          return
        }
        const body = await res.json()
        if (cancelled) return
        setState({
          status: 'ready',
          items: Array.isArray(body?.items) ? body.items : [],
          profileApplied: body?.profile_applied ?? null,
          emptyReason: body?.empty_reason ?? null,
          error: null,
        })
      } catch {
        if (!cancelled)
          setState({
            status: 'error',
            items: [],
            profileApplied: null,
            emptyReason: null,
            error: 'network',
          })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [client, fetchImpl])

  return (
    <Wrap aria-labelledby="signals-panel-title" data-testid="filtered-signals-panel">
      <Header>
        <Title id="signals-panel-title">Filtered signals</Title>
        <Sub>
          {state.status === 'ready' && state.items.length > 0
            ? `${state.items.length} match`
            : ''}
        </Sub>
      </Header>

      {state.status === 'loading' && (
        <Empty role="status" aria-live="polite">Loading your signals.</Empty>
      )}

      {state.status === 'error' && (
        <ErrorText role="alert">Could not load signals. Retry shortly.</ErrorText>
      )}

      {state.status === 'unauth' && (
        <Empty>Sign in to see signals tuned to your watchlist.</Empty>
      )}

      {state.status === 'ready' && state.items.length === 0 && (
        <Empty>{emptyMessageFor(state.emptyReason, state.profileApplied)}</Empty>
      )}

      {state.status === 'ready' && state.items.length > 0 && (
        <List>
          {state.items.map((item) => (
            <Row key={item.id} data-testid="signal-row">
              <Ticker href={`/token/${item.token.toLowerCase()}`}>
                {item.token}
              </Ticker>
              <Body>
                <SignalLabel $kind={kindFor(item.signal)}>{item.signal}</SignalLabel>
                <Reason>{item.match_reason}</Reason>
              </Body>
              <Confidence aria-label={`${item.confidence} percent confidence`}>
                {item.confidence}%
              </Confidence>
            </Row>
          ))}
        </List>
      )}

      <Footnote>
        Research only. ORCA never tells you whether to buy or sell. Signals are
        filtered using your risk tolerance and time horizon from onboarding.
      </Footnote>
    </Wrap>
  )
}
