'use client'
// Portfolio value candle chart for a figure detail page. Renders the
// server-built daily OHLC of cumulative net USD flow using
// lightweight-charts (lazy-loaded so it never weighs down the initial
// figure page payload). Styled to match the figure detail surface.
import React, { useEffect, useRef, useState } from 'react'

const FONT_MONO = "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace"

function fmtUsd(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—'
  const n = Number(v)
  const a = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(1)}K`
  return `${sign}$${a.toFixed(0)}`
}

export default function PortfolioCandleChart({ candles = [], height = 240 }) {
  const containerRef = useRef(null)
  const [lwc, setLwc] = useState(null)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    let mounted = true
    import('lightweight-charts')
      .then((m) => {
        if (mounted) setLwc(m)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!lwc || !el || !candles || candles.length === 0) return

    const { createChart, ColorType, CrosshairMode } = lwc
    el.innerHTML = ''

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9aa7b8',
        fontFamily: FONT_MONO,
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(54, 166, 186, 0.3)', width: 1, style: 2, labelBackgroundColor: '#0d2134' },
        horzLine: { color: 'rgba(54, 166, 186, 0.3)', width: 1, style: 2, labelBackgroundColor: '#0d2134' },
      },
      rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.06)' },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        timeVisible: false,
        secondsVisible: false,
        fixLeftEdge: true,
      },
    })

    const series = chart.addCandlestickSeries({
      upColor: '#2ecc71',
      downColor: '#e74c3c',
      borderUpColor: '#2ecc71',
      borderDownColor: '#e74c3c',
      wickUpColor: 'rgba(46, 204, 113, 0.6)',
      wickDownColor: 'rgba(231, 76, 60, 0.6)',
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
    })
    series.setData(candles)

    const lookup = new Map(candles.map((c) => [c.time, c]))
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setHover(null)
        return
      }
      const d = lookup.get(param.time)
      if (!d) {
        setHover(null)
        return
      }
      setHover({ time: d.time, close: d.close, open: d.open, high: d.high, low: d.low })
    })

    chart.timeScale().fitContent()

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width })
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [lwc, candles, height])

  if (!candles || candles.length === 0) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
          border: '1px solid rgba(54, 166, 186, 0.2)',
          borderRadius: '16px',
          padding: '1.25rem',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '1px',
            color: '#36a6ba',
            textTransform: 'uppercase',
            marginBottom: '0.85rem',
          }}
        >
          On-chain flow
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Not enough priced transaction history to chart a flow curve yet.
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          marginBottom: '0.85rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '1px',
            color: '#36a6ba',
            textTransform: 'uppercase',
          }}
          title="Cumulative net USD in/out across tracked addresses. Estimated from on-chain flow — not a holdings/portfolio valuation."
        >
          On-chain flow · est. equity curve
        </div>
        {hover ? (
          <div style={{ fontFamily: FONT_MONO, fontSize: '0.7rem', color: '#9aa7b8' }}>
            <span>{hover.time}</span>{' '}
            <span style={{ color: hover.close >= 0 ? '#2ecc71' : '#e74c3c', fontWeight: 700 }}>
              {fmtUsd(hover.close)}
            </span>
          </div>
        ) : null}
      </div>
      <div ref={containerRef} style={{ width: '100%', height: `${height}px` }} />
      <div style={{ marginTop: '0.6rem', fontSize: '0.68rem', color: '#5a6a7a', lineHeight: 1.4 }}>
        Estimated from on-chain flow (cumulative net USD in/out across tracked addresses).
        Not a holdings or portfolio valuation.
      </div>
    </div>
  )
}
