'use client'
// Inline price/whale/sentiment chip primitive. Renders as a real <button>
// with cyan terminal styling. On hover (150 ms) or focus/click, opens a
// HoverPopover with a Sparkline + meta rows fetched via useInlineData.
//
// Designed to NEVER throw on render and NEVER break inline text flow:
// fetch failure → "Live data unavailable." in the popover; chip itself
// always renders the original raw text.
import React, { useCallback, useRef, useState, useContext } from 'react'
import { TILE } from './tileTokens'
import { HoverPopover } from './HoverPopover'
import { Sparkline } from './Sparkline'
import { useInlineData } from './useInlineData'
import { InlineDataCtx } from './OrcaMarkdownContext'
import { logTileEvent } from './telemetryClient'

async function fetchPriceSeries(ticker) {
  const r = await fetch(`/api/coingecko/market-chart?vs_currency=usd&days=7&symbol=${encodeURIComponent(ticker)}`)
  if (!r.ok) throw new Error('fetch_failed')
  const json = await r.json()
  // Try a couple shapes; degrade gracefully.
  const prices = Array.isArray(json?.prices) ? json.prices : Array.isArray(json?.data?.prices) ? json.data.prices : []
  const series = prices.map((p) => (Array.isArray(p) ? Number(p[1]) : Number(p))).filter(Number.isFinite)
  const last = series.length ? series[series.length - 1] : null
  const first = series.length ? series[0] : null
  const change7d = first ? ((last - first) / first) * 100 : null
  return { series, last, change7d }
}

export function PriceChip({ ticker, raw, value }) {
  const ctx = useContext(InlineDataCtx)
  const chipRef = useRef(null)
  const hoverTimer = useRef(null)
  const [open, setOpen] = useState(false)
  const key = ticker ? `price:${ticker}:7d` : null
  const { data, loading, error } = useInlineData(
    key,
    () => fetchPriceSeries(ticker),
    { enabled: !!ticker && open }
  )

  const doOpen = useCallback(() => {
    setOpen(true)
    logTileEvent('chip_open', { kind: 'price', ticker })
  }, [ticker])
  const doClose = useCallback(() => setOpen(false), [])

  const onEnter = () => {
    if (!ticker) return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(doOpen, TILE.hoverDelayMs)
  }
  const onLeave = () => {
    clearTimeout(hoverTimer.current)
  }
  const onFocus = () => { if (ticker) doOpen() }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      doOpen()
    }
  }
  const onClick = () => doOpen()

  return (
    <>
      <button
        ref={chipRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ticker ? `${ticker} price ${raw}` : `price ${raw}`}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onClick={onClick}
        style={{
          all: 'unset',
          display: 'inline-block',
          padding: '1px 6px',
          margin: '0 1px',
          background: TILE.cyanSoft,
          border: `1px solid ${TILE.cyanBorder}`,
          borderRadius: TILE.radiusChip,
          color: TILE.cyanText,
          fontFamily: TILE.mono,
          fontSize: 12,
          fontWeight: 600,
          cursor: ticker ? 'pointer' : 'default',
          lineHeight: 1.4,
        }}
      >
        {raw}
      </button>
      <HoverPopover
        anchorRef={chipRef}
        open={open}
        onClose={doClose}
        ariaLabel={`${ticker || 'asset'} price details`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <strong style={{ color: TILE.cyan, letterSpacing: 0.5 }}>{ticker || '—'}</strong>
          {data?.change7d != null && (
            <span style={{ color: data.change7d >= 0 ? TILE.green : TILE.red }}>
              {data.change7d >= 0 ? '+' : ''}{data.change7d.toFixed(2)}% 7d
            </span>
          )}
        </div>
        {loading && <div style={{ color: TILE.grey }}>Loading…</div>}
        {error && <div style={{ color: TILE.grey }}>Live data unavailable.</div>}
        {data?.series?.length > 1 && (
          <Sparkline data={data.series} width={240} height={48} ariaLabel={`${ticker} 7d price`} />
        )}
        {data?.last != null && (
          <div style={{ marginTop: 6, color: TILE.cyanText }}>
            last <span style={{ color: '#fff' }}>${Number(data.last).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        )}
        {ctx?.onOpenChart && ticker && (
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <button
              type="button"
              onClick={() => { ctx.onOpenChart(ticker, '7d', 'price'); doClose() }}
              style={{ all: 'unset', cursor: 'pointer', color: TILE.cyan, fontSize: 11 }}
            >Open chart →</button>
          </div>
        )}
      </HoverPopover>
    </>
  )
}

export default PriceChip
