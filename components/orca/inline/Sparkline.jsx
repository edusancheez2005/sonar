'use client'
// Tiny inline SVG sparkline. Replaces duplicate SparkChart definitions
// previously inlined in ClientOrca.jsx and AskOrcaClient.jsx.
import React from 'react'
import { TILE } from './tileTokens'

export function Sparkline({
  data = [],
  width = 140,
  height = 36,
  stroke,
  fill = 'none',
  ariaLabel = 'sparkline',
}) {
  if (!Array.isArray(data) || data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${ariaLabel} (no data)`}
      />
    )
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)
  const points = data
    .map((v, i) => `${(i * stepX).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`)
    .join(' ')
  const last = data[data.length - 1]
  const first = data[0]
  const color = stroke || (last >= first ? TILE.green : TILE.red)
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      style={{ display: 'block' }}
    >
      <polyline points={points} fill={fill} stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default Sparkline
