'use client'
/**
 * The /trending whale sections, rendered on the server from
 * lib/trending/whaleRotation.ts (the dashboard's net-flow snapshot): one
 * card per token whales moved into, then the ones they moved out of.
 */
import React from 'react'
import TokenIcon from '@/components/TokenIcon'
import { tokenName } from '@/lib/trending/tokenNames'
import { fmtUsd, fmtPrice, fmtPct } from './format'
import {
  COLORS, Panel, PanelHead, TerminalPrompt, Note, Muted, Grid, CoinCard, CoinHeader, CoinInfo, CoinName,
  CoinSymbol, CoinMetrics, Metric, MetricLabel, MetricValue, WhaleBadge, EmptyNote,
} from './primitives'

function Card({ r }) {
  const tone = r.netUsd > 0 ? COLORS.green : COLORS.red
  const smart = r.smart && (r.smart.buys || r.smart.sells) ? r.smart : null
  return (
    <CoinCard href={`/token/${encodeURIComponent(r.symbol)}`} data-testid="whale-rotation-row">
      <CoinHeader>
        <TokenIcon symbol={r.symbol} size={36} />
        <CoinInfo>
          <CoinName>{tokenName(r.symbol)}</CoinName>
          <CoinSymbol>{r.symbol}</CoinSymbol>
        </CoinInfo>
      </CoinHeader>
      <CoinMetrics>
        <Metric>
          <MetricLabel>Net flow 24h</MetricLabel>
          <MetricValue $color={tone}>{fmtUsd(r.netUsd, true)}</MetricValue>
        </Metric>
        <Metric>
          <MetricLabel>Whale trades</MetricLabel>
          <MetricValue>{r.buyCount} · {r.sellCount}</MetricValue>
        </Metric>
        <Metric>
          <MetricLabel>Price</MetricLabel>
          <MetricValue>{r.price != null ? fmtPrice(r.price) : '—'}</MetricValue>
        </Metric>
        <Metric>
          <MetricLabel>24h change</MetricLabel>
          <MetricValue $color={r.change24h > 0 ? COLORS.green : r.change24h < 0 ? COLORS.red : undefined}>
            {r.change24h != null ? fmtPct(r.change24h) : '—'}
          </MetricValue>
        </Metric>
      </CoinMetrics>
      {smart && (
        <WhaleBadge title="Buys · sells by wallets Sonar scores as consistently early (score ≥ 0.4)">
          Smart money {smart.buys} buys · {smart.sells} sells
        </WhaleBadge>
      )}
    </CoinCard>
  )
}

export default function WhaleRotationPanel({ rotation }) {
  if (!rotation || (rotation.inflows.length === 0 && rotation.outflows.length === 0)) {
    return (
      <Panel>
        <PanelHead><TerminalPrompt>Whales moved in</TerminalPrompt></PanelHead>
        <EmptyNote>Whale flow did not load. The <a href="/statistics" style={{ color: COLORS.cyan }}>live whale trades</a> show the same tape.</EmptyNote>
      </Panel>
    )
  }
  const asOf = new Date(rotation.generated_at).toISOString().slice(11, 16)
  return (
    <>
      <Panel aria-labelledby="whales-in">
        <PanelHead>
          <TerminalPrompt id="whales-in" $color={COLORS.green}>Whales moved in</TerminalPrompt>
          <div className="right"><Muted>{rotation.chains_label}</Muted><Muted>as of {asOf} UTC</Muted></div>
        </PanelHead>
        <Note title={rotation.definition}>
          Net flow = USD whales received minus USD they sent in the last 24 h. Same numbers as the dashboard.
        </Note>
        <Grid>{rotation.inflows.map((r) => <Card key={r.symbol} r={r} />)}</Grid>
      </Panel>
      {rotation.outflows.length > 0 && (
        <Panel aria-labelledby="whales-out">
          <PanelHead>
            <TerminalPrompt id="whales-out" $color={COLORS.red}>Whales moved out</TerminalPrompt>
            <div className="right"><Muted>as of {asOf} UTC</Muted></div>
          </PanelHead>
          <Grid>{rotation.outflows.map((r) => <Card key={r.symbol} r={r} />)}</Grid>
        </Panel>
      )}
    </>
  )
}
