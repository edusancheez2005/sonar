'use client'
/**
 * Trending on X: coins ranked by LunarCrush's social metrics, without
 * stablecoins, wrapped tokens or micro-caps with a handful of posts
 * (lib/social/trendingCoins.ts applies the filters), as cards.
 */
import React, { useEffect, useState } from 'react'
import TokenIcon from '@/components/TokenIcon'
import { fmtPct } from './format'
import {
  COLORS, Panel, PanelHead, TerminalPrompt, Muted, FilterButton, Grid, CoinCard, CoinHeader, CoinInfo,
  CoinName, CoinSymbol, Rank, CoinMetrics, Metric, MetricLabel, MetricValue, EmptyNote,
} from './primitives'

const SORTS = [['galaxy_score', 'Galaxy score'], ['interactions_24h', 'Interactions']]

function fmtCount(n) {
  const v = Number(n) || 0
  return v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : String(v)
}

export default function SentimentPanel() {
  const [sort, setSort] = useState('galaxy_score')
  const [state, setState] = useState({ status: 'loading', data: null })

  useEffect(() => {
    const ctrl = new AbortController()
    setState((s) => ({ status: 'loading', data: s.data }))
    fetch(`/api/social/trending-coins?sort=${sort}&limit=12`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => setState({ status: 'ok', data }))
      .catch((e) => { if (e?.name !== 'AbortError') setState({ status: 'error', data: null }) })
    return () => ctrl.abort()
  }, [sort])

  const coins = state.data?.coins || []
  return (
    <Panel aria-labelledby="on-x">
      <PanelHead>
        <TerminalPrompt id="on-x">Trending on X</TerminalPrompt>
        <div className="right">
          {coins.length > 0 && state.data?.generated_at && <Muted>LunarCrush · as of {new Date(state.data.generated_at).toISOString().slice(11, 16)} UTC</Muted>}
          {SORTS.map(([k, l]) => <FilterButton key={k} type="button" $active={sort === k} onClick={() => setSort(k)}>{l}</FilterButton>)}
        </div>
      </PanelHead>
      {state.status === 'error' || (state.status === 'ok' && coins.length === 0) ? (
        <EmptyNote>X sentiment is not available right now.</EmptyNote>
      ) : !state.data ? (
        <EmptyNote>Loading…</EmptyNote>
      ) : (
        <Grid style={{ opacity: state.status === 'loading' ? 0.6 : 1 }}>
          {coins.map((c, i) => (
            <CoinCard key={c.symbol} href={`/token/${encodeURIComponent(c.symbol)}`}>
              <CoinHeader>
                <TokenIcon symbol={c.symbol} imageUrl={c.logo} size={36} />
                <CoinInfo>
                  <CoinName>{c.name || c.symbol}</CoinName>
                  <CoinSymbol>{c.symbol}</CoinSymbol>
                </CoinInfo>
                <Rank>#{i + 1}</Rank>
              </CoinHeader>
              <CoinMetrics>
                <Metric>
                  <MetricLabel>Galaxy score</MetricLabel>
                  <MetricValue>{c.galaxy_score != null ? Number(c.galaxy_score).toFixed(1) : '—'}</MetricValue>
                </Metric>
                <Metric>
                  <MetricLabel>Positive posts</MetricLabel>
                  <MetricValue>{c.sentiment != null ? `${Math.round(c.sentiment)}%` : '—'}</MetricValue>
                </Metric>
                <Metric>
                  <MetricLabel>Interactions 24h</MetricLabel>
                  <MetricValue>{fmtCount(c.interactions_24h)}</MetricValue>
                </Metric>
                <Metric>
                  <MetricLabel>24h change</MetricLabel>
                  <MetricValue $color={c.percent_change_24h > 0 ? COLORS.green : c.percent_change_24h < 0 ? COLORS.red : undefined}>
                    {c.percent_change_24h != null ? fmtPct(c.percent_change_24h) : '—'}
                  </MetricValue>
                </Metric>
              </CoinMetrics>
            </CoinCard>
          ))}
        </Grid>
      )}
      <Muted style={{ display: 'block', marginTop: '1rem' }}>Social data from <a href="https://lunarcrush.com" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.cyan }}>LunarCrush</a>.</Muted>
    </Panel>
  )
}
