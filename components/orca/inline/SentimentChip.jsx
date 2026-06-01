'use client'
import React, { useCallback, useRef, useState } from 'react'
import { TILE } from './tileTokens'
import { HoverPopover } from './HoverPopover'
import { Sparkline } from './Sparkline'
import { useInlineData } from './useInlineData'
import { logTileEvent } from './telemetryClient'

function bucketBg(v) {
  if (v == null || Number.isNaN(v)) return TILE.cyanSoft
  if (v < 40) return TILE.redSoft
  if (v > 60) return TILE.greenSoft
  return TILE.greySoft
}

async function fetchSentiment(ticker) {
  const r = await fetch(`/api/token/social-timeseries?ticker=${encodeURIComponent(ticker)}&days=7`)
  if (!r.ok) throw new Error('fetch_failed')
  const json = await r.json()
  const arr = Array.isArray(json?.series) ? json.series : Array.isArray(json) ? json : []
  const series = arr.map((p) => Number(p?.sentiment ?? p?.value ?? p)).filter(Number.isFinite)
  return {
    series,
    galaxy: json?.galaxy_score ?? json?.galaxyScore ?? null,
    altRank: json?.alt_rank ?? json?.altRank ?? null,
    bullishPct: json?.bullish_pct ?? json?.bullishPct ?? null,
  }
}

export function SentimentChip({ ticker, raw, value }) {
  const ref = useRef(null)
  const hoverTimer = useRef(null)
  const [open, setOpen] = useState(false)

  const { data, loading, error } = useInlineData(
    ticker ? `sentiment:${ticker}:7d` : null,
    () => fetchSentiment(ticker),
    { enabled: !!ticker && open }
  )

  const doOpen = useCallback(() => {
    setOpen(true)
    logTileEvent('chip_open', { kind: 'sentiment', ticker })
  }, [ticker])
  const doClose = useCallback(() => setOpen(false), [])
  const onEnter = () => {
    if (!ticker) return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(doOpen, TILE.hoverDelayMs)
  }
  const onLeave = () => clearTimeout(hoverTimer.current)

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ticker ? `${ticker} sentiment ${raw}` : `sentiment ${raw}`}
        data-testid="sentiment-chip"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={doOpen}
        onClick={doOpen}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doOpen() } }}
        style={{
          all: 'unset',
          display: 'inline-block',
          padding: '1px 6px',
          margin: '0 1px',
          background: bucketBg(value),
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
      <HoverPopover anchorRef={ref} open={open} onClose={doClose} ariaLabel={`${ticker || 'asset'} sentiment`}>
        <div style={{ marginBottom: 6, color: TILE.cyan }}>{ticker || '—'} sentiment 7d</div>
        {loading && <div style={{ color: TILE.grey }}>Loading…</div>}
        {error && <div style={{ color: TILE.grey }}>Live data unavailable.</div>}
        {data?.series?.length > 1 && (
          <Sparkline data={data.series} width={240} height={48} ariaLabel="sentiment 7d" />
        )}
        {data && (
          <div style={{ marginTop: 6, color: TILE.cyanText, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <span>galaxy {data.galaxy ?? '—'}</span>
            <span>alt rank {data.altRank ?? '—'}</span>
            <span>bullish {data.bullishPct != null ? `${data.bullishPct}%` : '—'}</span>
          </div>
        )}
      </HoverPopover>
    </>
  )
}

export default SentimentChip
