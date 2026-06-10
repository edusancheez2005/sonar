'use client'
// Whale Terminal chart primitives. Hand-rolled SVG so the terminal looks
// identical everywhere with zero chart-library weight: candlesticks with an
// optional volume sub-pane, area sparklines, horizontal flow bars,
// probability lines and compact score bars. Mono axes, terminal green/red,
// cyan accents, square corners.
import React from 'react'
import { C, FONT_MONO } from '@/app/lib/terminalTheme'

const GRID = 'rgba(0, 229, 255, 0.06)'

export function fmtAxis(v) {
  const a = Math.abs(v)
  if (a >= 1e9) return (v / 1e9).toFixed(1) + 'B'
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  if (a >= 10) return v.toFixed(0)
  if (a > 0) return v.toFixed(2)
  return '0'
}

export function ChartEmpty({ height = 120, label = 'NO DATA' }) {
  return (
    <div
      style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_MONO,
        fontSize: '0.62rem',
        letterSpacing: '1px',
        color: C.textMuted,
      }}
    >
      {label}
    </div>
  )
}

/**
 * Candlestick chart + optional volume sub-pane + last-price line + hover
 * crosshair with OHLC readout. `ohlc` rows: { t, o, h, l, c, v? }.
 * Volume pane renders only when at least one row carries a volume.
 *
 * Price axis uses a symmetric log scale (symlog) by default: whale flow
 * curves span 4-5 orders of magnitude and cross zero, so a linear axis
 * squashes most candles into a flat line while plain log can't represent
 * negatives. Pass `logScale={false}` for a linear axis.
 */
export function CandleChart({ ohlc, height = 300, logScale = true }) {
  const [hover, setHover] = React.useState(null)
  const wrapRef = React.useRef(null)
  const [w, setW] = React.useState(800)

  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => setW(el.clientWidth || 800))
    ro.observe(el)
    setW(el.clientWidth || 800)
    return () => ro.disconnect()
  }, [])

  if (!Array.isArray(ohlc) || ohlc.length < 2) {
    return <ChartEmpty height={height} label="NO CANDLE DATA" />
  }

  const hasVol = ohlc.some((d) => Number(d.v) > 0)
  const padR = 64
  const padT = 10
  const volH = hasVol ? Math.round(height * 0.18) : 0
  const priceH = height - volH - 22
  const n = ohlc.length
  const lo = Math.min(...ohlc.map((d) => d.l))
  const hi = Math.max(...ohlc.map((d) => d.h))
  const vMax = hasVol ? Math.max(...ohlc.map((d) => Number(d.v) || 0)) : 1

  // symlog: sign(v) · log10(1 + |v|/s) — linear near zero, log further out,
  // defined for negative values (net flow curves regularly dip below zero).
  const maxAbs = Math.max(Math.abs(lo), Math.abs(hi), 1)
  const linThresh = Math.max(1, maxAbs / 1000)
  const tf = logScale
    ? (v) => Math.sign(v) * Math.log10(1 + Math.abs(v) / linThresh)
    : (v) => v
  const tfInv = logScale
    ? (t) => Math.sign(t) * linThresh * (Math.pow(10, Math.abs(t)) - 1)
    : (t) => t
  const tLo = tf(lo)
  const tHi = tf(hi)

  const x = (i) => ((i + 0.5) / n) * (w - padR)
  const y = (p) => padT + (1 - (tf(p) - tLo) / (tHi - tLo || 1)) * (priceH - padT)
  // Cap body width so sparse series don't render as fat slabs.
  const bw = Math.min(14, Math.max(1.5, ((w - padR) / n) * 0.62))
  const last = ohlc[n - 1]
  const lastUp = last.c >= last.o

  // Gridlines evenly spaced in transformed space, labeled in real units.
  const gridLines = 5
  const grid = Array.from({ length: gridLines }, (_, i) => tfInv(tLo + ((tHi - tLo) * i) / (gridLines - 1)))

  const onMove = (e) => {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = Math.max(0, Math.min(n - 1, Math.floor((px / (w - padR)) * n)))
    setHover(px <= w - padR ? i : null)
  }

  const hov = hover != null ? ohlc[hover] : null

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: '100%' }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg width={w} height={height} style={{ display: 'block' }}>
        {grid.map((g, i) => (
          <g key={i}>
            <line x1={0} x2={w - padR} y1={y(g)} y2={y(g)} stroke={GRID} strokeWidth="1" />
            <text x={w - padR + 8} y={y(g) + 3} fill={C.textMuted} fontSize="9" fontFamily={FONT_MONO}>
              {fmtAxis(g)}
            </text>
          </g>
        ))}
        {hasVol
          ? ohlc.map((d, i) => {
              const up = d.c >= d.o
              // sqrt keeps a single volume spike from flattening the rest.
              const vh = Math.sqrt((Number(d.v) || 0) / (vMax || 1)) * volH
              return (
                <rect
                  key={'v' + i}
                  x={x(i) - bw / 2}
                  y={height - 14 - vh}
                  width={bw}
                  height={vh}
                  fill={up ? 'rgba(0, 230, 118, 0.22)' : 'rgba(255, 23, 68, 0.22)'}
                />
              )
            })
          : null}
        {ohlc.map((d, i) => {
          const up = d.c >= d.o
          const col = up ? C.green : C.red
          const bodyTop = y(Math.max(d.o, d.c))
          const bodyH = Math.max(1, Math.abs(y(d.o) - y(d.c)))
          return (
            <g key={'c' + i}>
              <line x1={x(i)} x2={x(i)} y1={y(d.h)} y2={y(d.l)} stroke={col} strokeWidth="1" />
              <rect
                x={x(i) - bw / 2}
                y={bodyTop}
                width={bw}
                height={bodyH}
                fill={up ? 'rgba(0, 230, 118, 0.85)' : 'rgba(255, 23, 68, 0.85)'}
              />
            </g>
          )
        })}
        {/* last price line */}
        <line
          x1={0}
          x2={w - padR}
          y1={y(last.c)}
          y2={y(last.c)}
          stroke={lastUp ? C.green : C.red}
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.7"
        />
        <rect
          x={w - padR + 2}
          y={y(last.c) - 8}
          width={padR - 4}
          height={16}
          fill={lastUp ? 'rgba(0, 230, 118, 0.14)' : 'rgba(255, 23, 68, 0.14)'}
        />
        <text
          x={w - padR + 8}
          y={y(last.c) + 3.5}
          fill={lastUp ? C.green : C.red}
          fontSize="9.5"
          fontWeight="700"
          fontFamily={FONT_MONO}
        >
          {fmtAxis(last.c)}
        </text>
        {hov ? (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={padT}
            y2={height - 14}
            stroke="rgba(0, 229, 255, 0.35)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
        ) : null}
      </svg>
      {/* OHLC readout */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 8,
          display: 'flex',
          gap: 12,
          fontFamily: FONT_MONO,
          fontSize: '0.62rem',
          letterSpacing: '0.4px',
          color: C.textMuted,
          pointerEvents: 'none',
          textTransform: 'uppercase',
          flexWrap: 'wrap',
        }}
      >
        {['o', 'h', 'l', 'c'].map((k) => (
          <span key={k}>
            {k.toUpperCase()}{' '}
            <span style={{ color: hov ? (hov.c >= hov.o ? C.green : C.red) : C.textPrimary }}>
              {fmtAxis((hov || last)[k])}
            </span>
          </span>
        ))}
        {hasVol ? (
          <span>
            VOL <span style={{ color: C.textPrimary }}>{fmtAxis(Number((hov || last).v) || 0)}</span>
          </span>
        ) : null}
        {(hov || last).t ? (
          <span style={{ color: C.textMuted }}>
            {new Date((hov || last).t).toISOString().slice(0, 10)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** Compact area sparkline (close series). `fluid` stretches to container width. */
export function AreaSpark({ data, width = 96, height = 26, stroke, fluid }) {
  const gid = React.useId()
  if (!Array.isArray(data) || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const rng = max - min || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - 2 - ((v - min) / rng) * (height - 4),
  ])
  const up = data[data.length - 1] >= data[0]
  const c = stroke || (up ? C.green : C.red)
  const line = pts.map((p) => p.join(',')).join(' ')
  const area = `0,${height} ` + line + ` ${width},${height}`
  const svgProps = fluid
    ? {
        viewBox: `0 0 ${width} ${height}`,
        preserveAspectRatio: 'none',
        style: { display: 'block', width: '100%', height },
      }
    : { width, height, style: { display: 'block' } }
  return (
    <svg {...svgProps} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.28" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline
        points={line}
        fill="none"
        stroke={c}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Horizontal in/out flow bars per row: [{ label, inflow, outflow }] in USD. */
export function FlowBars({ rows }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return <ChartEmpty height={80} label="NO FLOW DATA" />
  }
  const m = Math.max(...rows.map((r) => Math.max(r.inflow || 0, r.outflow || 0)), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {rows.map((r) => (
        <div
          key={r.label}
          style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr', gap: 8, alignItems: 'center' }}
        >
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: '0.6rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: C.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={r.label}
          >
            {r.label}
          </span>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div
              style={{ width: `${((r.outflow || 0) / m) * 100}%`, height: 8, background: 'rgba(255, 23, 68, 0.55)' }}
              title={`-${fmtAxis(r.outflow || 0)} out`}
            />
          </div>
          <div style={{ display: 'flex' }}>
            <div
              style={{ width: `${((r.inflow || 0) / m) * 100}%`, height: 8, background: 'rgba(0, 230, 118, 0.6)' }}
              title={`+${fmtAxis(r.inflow || 0)} in`}
            />
          </div>
        </div>
      ))}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '64px 1fr 1fr',
          gap: 8,
          fontFamily: FONT_MONO,
          fontSize: '0.56rem',
          color: C.textMuted,
          textTransform: 'uppercase',
        }}
      >
        <span />
        <span style={{ textAlign: 'right' }}>← sell</span>
        <span>buy →</span>
      </div>
    </div>
  )
}

/** Probability/odds line — auto-zooms to the data range. */
export function ProbLine({ data, width = 220, height = 44, fluid }) {
  if (!Array.isArray(data) || data.length < 2) return null
  const lo = Math.min(...data)
  const hi = Math.max(...data)
  const pad = Math.max(2, (hi - lo) * 0.15)
  const min = lo - pad
  const max = hi + pad
  const rng = max - min || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - 3 - ((v - min) / rng) * (height - 6),
  ])
  const line = pts.map((p) => p.join(',')).join(' ')
  const lastUp = data[data.length - 1] >= data[0]
  const c = lastUp ? C.green : C.red
  const svgProps = fluid
    ? {
        viewBox: `0 0 ${width} ${height}`,
        preserveAspectRatio: 'none',
        style: { display: 'block', width: '100%', height },
      }
    : { width, height, style: { display: 'block' } }
  return (
    <svg {...svgProps} aria-hidden>
      <line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke={GRID} strokeWidth="1" />
      <polyline
        points={line}
        fill="none"
        stroke={c}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={c} />
    </svg>
  )
}

/** Compact 0..1 score bar (smart-money score). */
export function ScoreBar({ score, width = 44 }) {
  const s = Math.max(0, Math.min(1, Number(score) || 0))
  const col = s >= 0.7 ? C.green : s >= 0.4 ? C.cyan : C.textMuted
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width, height: 5, background: 'rgba(255,255,255,0.06)', display: 'inline-block' }}>
        <span style={{ width: `${s * 100}%`, height: '100%', background: col, display: 'block' }} />
      </span>
      <span style={{ fontFamily: FONT_MONO, fontSize: '0.62rem', color: col }}>
        {(s * 100).toFixed(0)}
      </span>
    </span>
  )
}

/** ASCII dominance bar: █████░░░░░░░ */
export function asciiBar(frac, n = 12) {
  const f = Math.max(0, Math.min(1, Number(frac) || 0))
  const fill = Math.round(f * n)
  return '█'.repeat(fill) + '░'.repeat(n - fill)
}
