'use client'
// Full-width inline chart panel. Lazy-loads lightweight-charts; on import
// failure, falls back to a wide Sparkline. Never renders an error block.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { TILE } from './tileTokens'
import { Sparkline } from './Sparkline'
import { useInlineData } from './useInlineData'
import { logTileEvent } from './telemetryClient'

async function fetchOhlc(ticker, days) {
  // Real API: /api/coingecko/ohlc?symbol=BTC&days=7 → { data: [{ timestamp, open, high, low, close }] }
  const r = await fetch(`/api/coingecko/ohlc?symbol=${encodeURIComponent(ticker)}&days=${days}`)
  if (!r.ok) throw new Error('fetch_failed')
  const json = await r.json()
  const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
  return rows
    .map((row) => {
      if (Array.isArray(row)) {
        return { time: Math.floor(row[0] / 1000), open: row[1], high: row[2], low: row[3], close: row[4] }
      }
      if (row && row.timestamp != null) {
        return { time: Math.floor(row.timestamp / 1000), open: row.open, high: row.high, low: row.low, close: row.close }
      }
      return null
    })
    .filter(Boolean)
}

const TF_TO_DAYS = { '24h': 1, '7d': 7, '30d': 30 }

export function InlineChart({ ticker, tf: initialTf = '7d', kind = 'price' }) {
  const [tf, setTf] = useState(initialTf)
  const days = TF_TO_DAYS[tf] || 7
  const key = `ohlc:${ticker}:${tf}`
  const { data, loading, error } = useInlineData(key, () => fetchOhlc(ticker, days), { enabled: !!ticker })
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const [chartFailed, setChartFailed] = useState(false)

  useEffect(() => {
    logTileEvent('chart_open', { ticker, tf, kind })
  }, [ticker])

  useEffect(() => {
    let cancelled = false
    if (!data || !containerRef.current || chartFailed) return
    if (chartRef.current) {
      try { seriesRef.current?.setData(data) } catch {}
      return
    }
    ;(async () => {
      try {
        const mod = await import('lightweight-charts')
        if (cancelled || !containerRef.current) return
        const initialWidth = containerRef.current.clientWidth || 600
        const chart = mod.createChart(containerRef.current, {
          width: initialWidth,
          height: 320,
          autoSize: true,
          layout: { background: { color: 'transparent' }, textColor: '#dce8f3' },
          grid: { vertLines: { color: 'rgba(0,229,255,0.06)' }, horzLines: { color: 'rgba(0,229,255,0.06)' } },
          rightPriceScale: { borderColor: 'rgba(0,229,255,0.15)' },
          timeScale: { borderColor: 'rgba(0,229,255,0.15)' },
          handleScroll: true,
          handleScale: true,
        })
        const s = chart.addCandlestickSeries({
          upColor: TILE.green, borderUpColor: TILE.green, wickUpColor: TILE.green,
          downColor: TILE.red, borderDownColor: TILE.red, wickDownColor: TILE.red,
        })
        s.setData(data)
        chart.timeScale().fitContent()
        chartRef.current = chart
        seriesRef.current = s
        // Fallback ResizeObserver for older lightweight-charts builds where autoSize is a no-op.
        try {
          const ro = new ResizeObserver((entries) => {
            for (const e of entries) {
              const cr = e.contentRect
              try { chart.resize(cr.width, 320) } catch {}
            }
          })
          ro.observe(containerRef.current)
          chart.__ro = ro
        } catch {}
      } catch {
        if (!cancelled) {
          setChartFailed(true)
          logTileEvent('chart_fallback', { ticker, tf })
        }
      }
    })()
    return () => { cancelled = true }
  }, [data, chartFailed, ticker, tf])

  useEffect(() => () => {
    try { chartRef.current?.__ro?.disconnect?.() } catch {}
    try { chartRef.current?.remove?.() } catch {}
    chartRef.current = null
    seriesRef.current = null
  }, [])

  const closes = useMemo(() => (data || []).map((c) => c.close).filter(Number.isFinite), [data])
  const last = closes.length ? closes[closes.length - 1] : null
  const first = closes.length ? closes[0] : null
  const change = first ? ((last - first) / first) * 100 : null

  return (
    <div
      role="group"
      data-testid="inline-chart"
      style={{
        display: 'block',
        margin: '12px 0',
        padding: 12,
        background: TILE.bgPanel,
        border: `1px solid ${TILE.cyanBorder}`,
        borderRadius: TILE.radiusPanel,
        fontFamily: TILE.mono,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: TILE.cyan, fontWeight: 700 }}>{ticker} · {kind}</span>
        <span role="tablist" aria-label="timeframe" style={{ display: 'inline-flex', gap: 0 }}>
          {['24h', '7d', '30d'].map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tf === t}
              onClick={() => setTf(t)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '2px 8px',
                fontSize: 11,
                color: tf === t ? TILE.cyan : TILE.cyanText,
                borderBottom: tf === t ? `1px solid ${TILE.cyan}` : '1px solid transparent',
              }}
            >{t}</button>
          ))}
        </span>
      </div>
      {chartFailed ? (
        <Sparkline data={closes} width={600} height={200} ariaLabel={`${ticker} ${tf} fallback`} />
      ) : (
        <div ref={containerRef} style={{ display: 'block', width: '100%', height: 320 }} />
      )}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, color: TILE.cyanText, fontSize: 11 }}>
        <span>last {last != null ? `$${Number(last).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</span>
        <span style={{ color: change == null ? TILE.grey : change >= 0 ? TILE.green : TILE.red }}>
          {change == null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}
        </span>
        {loading && <span style={{ color: TILE.grey }}>loading…</span>}
        {error && <span style={{ color: TILE.grey }}>data unavailable</span>}
      </div>
    </div>
  )
}

export default InlineChart
