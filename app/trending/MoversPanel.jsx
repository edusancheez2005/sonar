'use client'
/**
 * Top gainers and losers among the coins we map to Binance, over a real
 * 1 h, 24 h or 7 d window, as cards.
 */
import React, { useEffect, useState } from 'react'
import TokenIcon from '@/components/TokenIcon'
import { fmtUsd, fmtPrice, fmtPct } from './format'
import {
  COLORS, Panel, PanelHead, TerminalPrompt, Muted, FilterButton, Grid, CoinCard, CoinHeader, CoinInfo,
  CoinName, CoinSymbol, CoinMetrics, Metric, MetricLabel, MetricValue, EmptyNote,
} from './primitives'

const WINDOWS = [['1h', '1H'], ['24h', '24H'], ['7d', '7D']]

function Card({ c, label }) {
  return (
    <CoinCard href={`/token/${encodeURIComponent(c.symbol)}`}>
      <CoinHeader>
        <TokenIcon symbol={c.symbol} imageUrl={c.image} size={36} />
        <CoinInfo>
          <CoinName>{c.name}</CoinName>
          <CoinSymbol>{c.symbol}</CoinSymbol>
        </CoinInfo>
      </CoinHeader>
      <CoinMetrics>
        <Metric>
          <MetricLabel>Price</MetricLabel>
          <MetricValue>{fmtPrice(c.price)}</MetricValue>
        </Metric>
        <Metric>
          <MetricLabel>{label} change</MetricLabel>
          <MetricValue $color={c.change_pct > 0 ? COLORS.green : c.change_pct < 0 ? COLORS.red : undefined}>{fmtPct(c.change_pct)}</MetricValue>
        </Metric>
        <Metric>
          <MetricLabel>{label} volume</MetricLabel>
          <MetricValue>{fmtUsd(c.quote_volume)}</MetricValue>
        </Metric>
      </CoinMetrics>
    </CoinCard>
  )
}

export default function MoversPanel() {
  const [win, setWin] = useState('24h')
  const [state, setState] = useState({ status: 'loading', data: null })

  useEffect(() => {
    const ctrl = new AbortController()
    setState((s) => ({ status: 'loading', data: s.data }))
    fetch(`/api/coingecko/trending?window=${win}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => setState({ status: 'ok', data }))
      .catch((e) => { if (e?.name !== 'AbortError') setState({ status: 'error', data: null }) })
    return () => ctrl.abort()
  }, [win])

  const label = WINDOWS.find(([k]) => k === win)?.[1] || '24H'
  const d = state.data
  const filters = (
    <div className="right">
      {d?.generated_at && <Muted>Binance · as of {new Date(d.generated_at).toISOString().slice(11, 16)} UTC</Muted>}
      {WINDOWS.map(([k, l]) => <FilterButton key={k} type="button" $active={win === k} onClick={() => setWin(k)}>{l}</FilterButton>)}
    </div>
  )
  const body = (rows) => (state.status === 'error' && !d
    ? <EmptyNote>Price movers did not load. Try another window.</EmptyNote>
    : !d ? <EmptyNote>Loading…</EmptyNote>
    : <Grid style={{ opacity: state.status === 'loading' ? 0.6 : 1 }}>{rows.map((c) => <Card key={c.symbol} c={c} label={label} />)}</Grid>)

  return (
    <>
      <Panel aria-labelledby="gainers">
        <PanelHead><TerminalPrompt id="gainers" $color={COLORS.green}>Top gainers</TerminalPrompt>{filters}</PanelHead>
        {body((d?.gainers || []).slice(0, 8))}
      </Panel>
      <Panel aria-labelledby="losers">
        <PanelHead><TerminalPrompt id="losers" $color={COLORS.red}>Top losers</TerminalPrompt></PanelHead>
        {body((d?.losers || []).slice(0, 8))}
      </Panel>
    </>
  )
}
