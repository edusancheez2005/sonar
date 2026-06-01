'use client'
import React, { useCallback, useRef, useState } from 'react'
import { TILE } from './tileTokens'
import { HoverPopover } from './HoverPopover'
import { Sparkline } from './Sparkline'
import { useInlineData } from './useInlineData'
import { logTileEvent } from './telemetryClient'

async function fetchWhaleSeries(ticker) {
  // Try 24h first; if the bucket is silent, widen to 7d so the popover
  // never shows an uninformative "buys 0 · sells 0".
  for (const days of [1, 7]) {
    const r = await fetch(`/api/whales/timeseries?symbol=${encodeURIComponent(ticker)}&days=${days}`)
    if (!r.ok) continue
    const json = await r.json()
    const rows = Array.isArray(json?.data) ? json.data : []
    const series = rows
      .map((p) => Number((p?.buyVolume ?? 0) - (p?.sellVolume ?? 0)))
      .filter(Number.isFinite)
    const buys = json?.summary?.totalBuyCount ?? 0
    const sells = json?.summary?.totalSellCount ?? 0
    if (series.length > 0 || buys > 0 || sells > 0) {
      return { series, buys, sells, window: days === 1 ? '24h' : '7d' }
    }
  }
  return { series: [], buys: 0, sells: 0, window: '7d', empty: true }
}

export function WhaleChip({ ticker, raw, value }) {
  const ref = useRef(null)
  const hoverTimer = useRef(null)
  const [open, setOpen] = useState(false)
  const sign = (value ?? 0) >= 0 ? 1 : -1
  const dotColor = sign > 0 ? TILE.green : TILE.red

  const { data, loading, error } = useInlineData(
    ticker ? `whale:${ticker}:24h` : null,
    () => fetchWhaleSeries(ticker),
    { enabled: !!ticker && open }
  )

  const doOpen = useCallback(() => {
    setOpen(true)
    logTileEvent('chip_open', { kind: 'whale', ticker })
  }, [ticker])
  const doClose = useCallback(() => setOpen(false), [])
  const onEnter = () => {
    if (!ticker) return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(doOpen, TILE.hoverDelayMs)
  }
  const onLeave = () => clearTimeout(hoverTimer.current)

  const openWhaleFeed = () => {
    try { window.dispatchEvent(new CustomEvent('orca:open-whale-panel', { detail: { ticker } })) } catch {}
    doClose()
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`whale net flow ${raw}`}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={doOpen}
        onClick={doOpen}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doOpen() } }}
        style={{
          all: 'unset',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '1px 6px 1px 5px',
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
        <span data-testid="whale-pip" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: dotColor }} />
        {raw}
      </button>
      <HoverPopover anchorRef={ref} open={open} onClose={doClose} ariaLabel={`${ticker || 'asset'} whale flow`}>
        <div style={{ marginBottom: 6, color: TILE.cyan }}>
          {ticker || '—'} whale flow {data?.window || '24h'}
        </div>
        {loading && <div style={{ color: TILE.grey }}>Loading…</div>}
        {error && <div style={{ color: TILE.grey }}>Live data unavailable.</div>}
        {data?.empty && !loading && !error && (
          <div style={{ color: TILE.grey }}>No tracked whale activity in the last 7 days.</div>
        )}
        {data?.series?.length > 1 && (
          <Sparkline data={data.series} width={240} height={48} ariaLabel="whale net flow" />
        )}
        {!data?.empty && (data?.buys > 0 || data?.sells > 0) && (
          <div style={{ marginTop: 6, color: TILE.cyanText }}>
            buys {data.buys} · sells {data.sells}
          </div>
        )}
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <button type="button" onClick={openWhaleFeed} style={{ all: 'unset', cursor: 'pointer', color: TILE.cyan, fontSize: 11 }}>
            Open whale feed →
          </button>
        </div>
      </HoverPopover>
    </>
  )
}

export default WhaleChip
