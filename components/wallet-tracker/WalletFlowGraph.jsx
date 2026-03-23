'use client'
import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { shortenAddress, formatUsd } from '@/lib/wallet-tracker'

const Card = styled.div`
  background: var(--background-card);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`

const Title = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.4rem;
`

const Description = styled.p`
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 1rem;
`

const GraphContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  min-height: 300px;
  overflow: visible;
`

const SvgGraph = styled.svg`
  width: 100%;
  height: 100%;
`

const Legend = styled.div`
  display: flex;
  gap: 1.25rem;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
`

const LegendDot = styled.span`
  width: 10px;
  height: 4px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`

export default function WalletFlowGraph({ address, counterparties }) {
  if (!counterparties || counterparties.length === 0) {
    return (
      <Card>
        <Title>Wallet Flow</Title>
        <Description>Shows the top wallets this address has transacted with, sized by volume.</Description>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No flow data available</p>
      </Card>
    )
  }

  const top = counterparties.slice(0, 8)
  const maxVol = Math.max(...top.map(c => c.total_volume || 1))

  // Layout: center at 50%, 50%. Nodes in ellipse around it.
  const cx = 50
  const cy = 50
  const rx = 36 // horizontal radius %
  const ry = 38 // vertical radius %

  const nodes = top.map((cp, i) => {
    const angle = (i / top.length) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(angle) * rx
    const y = cy + Math.sin(angle) * ry
    const isInflow = (cp.net_flow || 0) >= 0
    const thickness = Math.max(1.5, (cp.total_volume / maxVol) * 5)
    return { ...cp, x, y, isInflow, thickness, angle }
  })

  return (
    <Card>
      <Title>Wallet Flow</Title>
      <Description>
        Connections between this wallet and its top counterparties by volume.
        Green lines indicate tokens flowing in, red lines indicate tokens flowing out.
        Thicker lines represent higher volume.
      </Description>
      <GraphContainer>
        <SvgGraph viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="centerGlow">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Connection lines */}
          {nodes.map((n, i) => {
            const midX = (cx + n.x) / 2 + Math.sin(n.angle) * 5
            const midY = (cy + n.y) / 2 - Math.cos(n.angle) * 5
            const color = n.isInflow ? 'rgba(0, 212, 170, 0.4)' : 'rgba(231, 76, 60, 0.4)'
            return (
              <path
                key={`line-${i}`}
                d={`M ${cx} ${cy} Q ${midX} ${midY} ${n.x} ${n.y}`}
                stroke={color}
                strokeWidth={n.thickness * 0.15}
                fill="none"
              />
            )
          })}

          {/* Center glow */}
          <circle cx={cx} cy={cy} r="5" fill="url(#centerGlow)" />

          {/* Center node */}
          <rect x={cx - 8} y={cy - 3} width="16" height="6" rx="2" fill="rgba(0, 229, 255, 0.15)" stroke="#00e5ff" strokeWidth="0.3" />
          <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="#00e5ff" fontSize="2.2" fontWeight="700" fontFamily="monospace">
            {shortenAddress(address, 3)}
          </text>

          {/* Counterparty nodes */}
          {nodes.map((n, i) => {
            const label = n.label || shortenAddress(n.address, 3)
            const volLabel = formatUsd(n.total_volume)
            const nodeColor = n.isInflow ? '#00d4aa' : '#e74c3c'
            const bgColor = n.isInflow ? 'rgba(0, 212, 170, 0.1)' : 'rgba(231, 76, 60, 0.1)'
            const labelLen = Math.max(label.length, volLabel.length)
            const boxW = Math.max(12, labelLen * 1.3)
            const boxH = 5.5

            return (
              <Link key={`node-${i}`} href={`/wallet-tracker/${encodeURIComponent(n.address)}`}>
                <rect
                  x={n.x - boxW / 2}
                  y={n.y - boxH / 2}
                  width={boxW}
                  height={boxH}
                  rx="1.5"
                  fill={bgColor}
                  stroke={nodeColor}
                  strokeWidth="0.25"
                  style={{ cursor: 'pointer' }}
                />
                <text x={n.x} y={n.y - 0.5} textAnchor="middle" dominantBaseline="middle" fill={nodeColor} fontSize="1.8" fontWeight="600" fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                  {label}
                </text>
                <text x={n.x} y={n.y + 2} textAnchor="middle" dominantBaseline="middle" fill={nodeColor} fontSize="1.4" opacity="0.7" fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                  {volLabel}
                </text>
              </Link>
            )
          })}
        </SvgGraph>
      </GraphContainer>
      <Legend>
        <LegendItem><LegendDot $color="#00d4aa" /> Inflow (received from)</LegendItem>
        <LegendItem><LegendDot $color="#e74c3c" /> Outflow (sent to)</LegendItem>
        <LegendItem><LegendDot $color="var(--text-secondary)" /> Thickness = volume</LegendItem>
      </Legend>
    </Card>
  )
}
