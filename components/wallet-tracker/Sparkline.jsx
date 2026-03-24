'use client'
import React from 'react'
import styled from 'styled-components'

const Svg = styled.svg`
  display: inline-block;
  vertical-align: middle;
`

export default function Sparkline({ data = [], $width = 60, $height = 20, $color = 'var(--primary)' }) {
  if (!data || data.length < 2) {
    return (
      <Svg width={$width} height={$height} viewBox={`0 0 ${$width} ${$height}`}>
        <line x1="0" y1={$height / 2} x2={$width} y2={$height / 2} stroke="var(--text-secondary)" strokeWidth="1" opacity="0.3" />
      </Svg>
    )
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const padding = 2

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * $width
    const y = padding + (1 - (val - min) / range) * ($height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <Svg width={$width} height={$height} viewBox={`0 0 ${$width} ${$height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={$color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
