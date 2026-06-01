'use client'
import React, { useCallback, useRef, useState } from 'react'
import { TILE } from './tileTokens'
import { HoverPopover } from './HoverPopover'
import { Sparkline } from './Sparkline'
import { useInlineData } from './useInlineData'
import { logTileEvent } from './telemetryClient'

async function fetchWhaleSeries(ticker) {
  const r = await fetch(`/api/whales/timeseries?ticker=${encodeURIComponent(ticker)}&window=24h`)
  if (!r.ok) throw new Error('fetch_failed')
  const json = await r.json()
  const arr = Array.isArray(json?.series) ? json.series : Array.isArray(json) ? json : []
  const series = arr.map((p) => Number(p?.netFlow ?? p?.value ?? p)).filter(Number.isFinite)
  return { series, buys: json?.buys ?? null, sells: json?.sells ?? null }
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
        <div style={{ marginBottom: 6, color: TILE.cyan }}>{ticker || '—'} whale flow 24h</div>
        {loading && <div style={{ color: TILE.grey }}>Loading…</div>}
        {error && <div style={{ color: TILE.grey }}>Live data unavailable.</div>}
        {data?.series?.length > 1 && (
          <Sparkline data={data.series} width={240} height={48} ariaLabel="whale net flow 24h" />
        )}
        {(data?.buys != null || data?.sells != null) && (
          <div style={{ marginTop: 6, color: TILE.cyanText }}>
            buys {data.buys ?? '—'} · sells {data.sells ?? '—'}
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
