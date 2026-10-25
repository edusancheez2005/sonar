'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import styled from 'styled-components'
import { FLOW_TONE_COLORS, FLOW_TONE_TEXT } from '@/lib/whale/netFlow'

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
// Cell colour = the shared net-flow tone (lib/whale/netFlow.ts flowTone):
// in / out / flat (under $50K or 5% of the token's volume).
const TONE_LABELS = { in: 'Net inflow', out: 'Net outflow', flat: 'Flat' }

// The precompute cron keeps exactly these two windows fresh.
const TIME_OPTIONS = [
  { label: '24H', window: '24h' },
  { label: '7D', window: '7d' },
]

function asOfUtc(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `as of ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`
}

// ─── SQUARIFIED TREEMAP LAYOUT ──────────────────────────────────────────────
function squarify(items, containerWidth, containerHeight) {
  if (!items.length || containerWidth <= 0 || containerHeight <= 0) return []

  const totalValue = items.reduce((s, d) => s + d.total_volume, 0)
  if (totalValue <= 0) return []

  const scaled = items.map(d => ({
    ...d,
    area: (d.total_volume / totalValue) * containerWidth * containerHeight,
  }))

  const rects = []
  layoutStrip(scaled, { x: 0, y: 0, w: containerWidth, h: containerHeight }, rects)
  return rects
}

function layoutStrip(items, rect, out) {
  if (items.length === 0) return
  if (items.length === 1) {
    out.push({ ...items[0], x: rect.x, y: rect.y, w: rect.w, h: rect.h })
    return
  }

  const { x, y, w, h } = rect
  const totalArea = items.reduce((s, d) => s + d.area, 0)
  const isHorizontal = w >= h

  // Find best split: try adding items to current row, pick split that gives best aspect ratio
  let bestIdx = 0
  let bestWorst = Infinity

  for (let i = 0; i < items.length; i++) {
    const rowItems = items.slice(0, i + 1)
    const rowArea = rowItems.reduce((s, d) => s + d.area, 0)
    const side = isHorizontal ? (rowArea / h) : (rowArea / w)

    let worstAspect = 0
    for (const item of rowItems) {
      const other = isHorizontal ? (item.area / side) : (item.area / side)
      const aspect = isHorizontal
        ? Math.max(side / (item.area / side), (item.area / side) / side)
        : Math.max(side / (item.area / side), (item.area / side) / side)
      if (aspect > worstAspect) worstAspect = aspect
    }

    if (worstAspect <= bestWorst) {
      bestWorst = worstAspect
      bestIdx = i
    } else {
      break
    }
  }

  const rowItems = items.slice(0, bestIdx + 1)
  const remaining = items.slice(bestIdx + 1)
  const rowArea = rowItems.reduce((s, d) => s + d.area, 0)

  if (isHorizontal) {
    const rowWidth = rowArea / h
    let cy = y
    for (const item of rowItems) {
      const itemHeight = item.area / rowWidth
      out.push({ ...item, x, y: cy, w: rowWidth, h: itemHeight })
      cy += itemHeight
    }
    layoutStrip(remaining, { x: x + rowWidth, y, w: w - rowWidth, h }, out)
  } else {
    const rowHeight = rowArea / w
    let cx = x
    for (const item of rowItems) {
      const itemWidth = item.area / rowHeight
      out.push({ ...item, x: cx, y, w: itemWidth, h: rowHeight })
      cx += itemWidth
    }
    layoutStrip(remaining, { x, y: y + rowHeight, w, h: h - rowHeight }, out)
  }
}

// ─── STYLED COMPONENTS ──────────────────────────────────────────────────────
const Wrapper = styled.div`
  width: 100%;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`

const FilterGroup = styled.div`
  display: flex;
  gap: 0.25rem;
`

const AsOf = styled.span`
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.5px;
  color: #8896a6;
`

const FilterBtn = styled.button`
  background: ${({ $active }) => $active ? 'rgba(54, 166, 186, 0.2)' : 'rgba(255,255,255,0.04)'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(54, 166, 186, 0.4)' : 'rgba(255,255,255,0.08)'};
  border-radius: 4px;
  padding: 0.25rem 0.6rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ $active }) => $active ? '#36a6ba' : '#a0b2c6'};
  cursor: pointer;
  font-family: var(--font-mono);
  letter-spacing: 0.5px;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(54, 166, 186, 0.15);
    border-color: rgba(54, 166, 186, 0.3);
  }
`

const TreemapContainer = styled.div`
  position: relative;
  width: 100%;
  height: 400px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--background-card, #0d2134);

  @media (max-width: 768px) {
    height: 300px;
  }
`

const Cell = styled.div`
  position: absolute;
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transition: filter 0.15s ease;
  padding: 4px;

  &:hover {
    filter: brightness(1.25);
    z-index: 2;
  }
`

const CellSymbol = styled.span`
  font-family: var(--font-mono);
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`

const CellDetail = styled.span`
  font-family: var(--font-mono);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`

const TooltipBox = styled.div`
  position: fixed;
  background: #1a2d42;
  border: 1px solid rgba(54, 166, 186, 0.4);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.78rem;
  color: var(--text-secondary, #a0b2c6);
  line-height: 1.5;
  width: max-content;
  max-width: 280px;
  z-index: 9999;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
`

const TooltipTitle = styled.div`
  font-weight: 700;
  font-size: 0.9rem;
  color: #fff;
  margin-bottom: 0.4rem;
  font-family: var(--font-mono);
`

const TooltipRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
`

const TooltipLabel = styled.span`
  color: #7a8fa3;
`

const TooltipValue = styled.span`
  font-weight: 600;
  color: ${({ $color }) => $color || '#fff'};
`

const SentimentTag = styled.span`
  display: inline-block;
  margin-top: 0.35rem;
  padding: 0.15rem 0.45rem;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: var(--font-mono);
  color: ${({ $tone }) => FLOW_TONE_TEXT[$tone] || '#a0b2c6'};
  background: ${({ $tone }) =>
    $tone === 'in' ? 'rgba(0, 230, 118, 0.12)' :
    $tone === 'out' ? 'rgba(255, 23, 68, 0.12)' :
    'rgba(90, 106, 122, 0.2)'};
`

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #5a6a7a;
  font-family: var(--font-mono);
  font-size: 0.85rem;
`

const ErrorState = styled(LoadingState)`
  color: #e74c3c;
`

// ─── HELPERS ────────────────────────────────────────────────────────────────
function formatCompact(n) {
  const num = Number(n || 0)
  const abs = Math.abs(num)
  const sign = num >= 0 ? '+' : ''
  if (abs >= 1e9) return `${sign}$${(num / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}$${(num / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}$${(num / 1e3).toFixed(1)}K`
  return `${sign}$${Math.round(num)}`
}

function formatVol(n) {
  const num = Number(n || 0)
  const abs = Math.abs(num)
  if (abs >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `$${(num / 1e3).toFixed(1)}K`
  return `$${Math.round(num)}`
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────
export default function TokenHeatmap() {
  const [tokens, setTokens] = useState([])
  const [windowKey, setWindowKey] = useState('24h')
  const [generatedAt, setGeneratedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const containerRef = useRef(null)

  // Fetch data
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/wallet-tracker/heatmap?window=${windowKey}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(json => {
        if (!cancelled) {
          setTokens(json.data || [])
          setGeneratedAt(json.generated_at || null)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [windowKey])

  // Measure container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      setContainerSize({ w: Math.floor(width), h: Math.floor(height) })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleMouseEnter = useCallback((e, token) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      token,
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  // Compute layout
  const rects = containerSize.w > 0 && tokens.length > 0
    ? squarify(tokens, containerSize.w, containerSize.h)
    : []

  // Compute max volume for opacity scaling
  const maxVol = tokens.length > 0 ? Math.max(...tokens.map(t => t.total_volume)) : 1

  return (
    <Wrapper>
      <Header>
        <FilterGroup>
          {TIME_OPTIONS.map(opt => (
            <FilterBtn
              key={opt.window}
              $active={windowKey === opt.window}
              onClick={() => setWindowKey(opt.window)}
            >
              {opt.label}
            </FilterBtn>
          ))}
        </FilterGroup>
        {asOfUtc(generatedAt) && <AsOf>{asOfUtc(generatedAt)}</AsOf>}
      </Header>

      <TreemapContainer ref={containerRef}>
        {loading ? (
          <LoadingState>Loading heatmap...</LoadingState>
        ) : error ? (
          <ErrorState>Error: {error}</ErrorState>
        ) : rects.length === 0 ? (
          <LoadingState>No token data available</LoadingState>
        ) : (
          rects.map((r, i) => {
            const color = FLOW_TONE_COLORS[r.tone] || FLOW_TONE_COLORS.flat
            const opacity = 0.4 + 0.6 * (r.total_volume / maxVol)
            const minDim = Math.min(r.w, r.h)
            const symbolSize = Math.max(0.55, Math.min(1.4, minDim / 55))
            const detailSize = Math.max(0.45, Math.min(0.75, minDim / 90))
            const showDetail = minDim > 40
            const showWallets = minDim > 60

            return (
              <Cell
                key={r.token_symbol}
                style={{
                  left: r.x,
                  top: r.y,
                  width: r.w,
                  height: r.h,
                  background: color,
                  opacity,
                }}
                onMouseEnter={(e) => handleMouseEnter(e, r)}
                onMouseLeave={handleMouseLeave}
              >
                <CellSymbol style={{ fontSize: `${symbolSize}rem` }}>
                  {r.token_symbol}
                </CellSymbol>
                {showDetail && (
                  <CellDetail style={{ fontSize: `${detailSize}rem` }}>
                    {formatCompact(r.net_flow)}
                  </CellDetail>
                )}
                {showWallets && (
                  <CellDetail style={{ fontSize: `${detailSize * 0.85}rem` }}>
                    {r.unique_wallets}w
                  </CellDetail>
                )}
              </Cell>
            )
          })
        )}
      </TreemapContainer>

      {tooltip && (
        <TooltipBox style={{
          top: tooltip.y - 8,
          left: tooltip.x,
          transform: 'translate(-50%, -100%)',
        }}>
          <TooltipTitle>{tooltip.token.token_symbol}</TooltipTitle>
          <TooltipRow>
            <TooltipLabel>Buy Vol</TooltipLabel>
            <TooltipValue $color={FLOW_TONE_TEXT.in}>{formatVol(tooltip.token.buy_volume)}</TooltipValue>
          </TooltipRow>
          <TooltipRow>
            <TooltipLabel>Sell Vol</TooltipLabel>
            <TooltipValue $color={FLOW_TONE_TEXT.out}>{formatVol(tooltip.token.sell_volume)}</TooltipValue>
          </TooltipRow>
          <TooltipRow>
            <TooltipLabel>Net Flow</TooltipLabel>
            <TooltipValue $color={FLOW_TONE_TEXT[tooltip.token.tone] || FLOW_TONE_TEXT.flat}>
              {formatCompact(tooltip.token.net_flow)}
            </TooltipValue>
          </TooltipRow>
          <TooltipRow>
            <TooltipLabel>Wallets</TooltipLabel>
            <TooltipValue>{tooltip.token.unique_wallets}</TooltipValue>
          </TooltipRow>
          <TooltipRow>
            <TooltipLabel>Trades</TooltipLabel>
            <TooltipValue>{tooltip.token.buy_count + tooltip.token.sell_count} ({tooltip.token.buy_count}B / {tooltip.token.sell_count}S)</TooltipValue>
          </TooltipRow>
          <SentimentTag $tone={tooltip.token.tone}>
            {TONE_LABELS[tooltip.token.tone] || 'Flat'}
          </SentimentTag>
        </TooltipBox>
      )}
    </Wrapper>
  )
}
