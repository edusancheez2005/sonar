'use client'
import React, { useState } from 'react'
import styled from 'styled-components'

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
`

const BarOuter = styled.div`
  width: 60px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  cursor: help;
`

const BarInner = styled.div`
  height: 100%;
  border-radius: 3px;
  width: ${({ $pct }) => $pct}%;
  background: ${({ $color }) => $color};
  transition: width 0.3s ease;
`

const ScoreText = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
  cursor: help;
`

const Tooltip = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1a2d42;
  border: 1px solid var(--secondary);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.5;
  width: 250px;
  z-index: 100;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #1a2d42;
  }
`

const ScoreLabel = styled.span`
  color: ${({ $color }) => $color};
  font-weight: 600;
`

function getColor(score) {
  if (score >= 0.7) return '#00d4aa'
  if (score >= 0.4) return '#ffd93d'
  return '#ff6b6b'
}

function getLabel(score) {
  if (score >= 0.7) return 'High'
  if (score >= 0.4) return 'Medium'
  return 'Low'
}

export default function SmartMoneyScore({ score }) {
  const [show, setShow] = useState(false)

  if (score == null) return <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>—</span>
  const pct = Math.round(Math.min(1, Math.max(0, score)) * 100)
  const color = getColor(score)

  return (
    <Wrapper
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <BarOuter>
        <BarInner $pct={pct} $color={color} />
      </BarOuter>
      <ScoreText $color={color}>{pct}</ScoreText>
      {show && (
        <Tooltip>
          <div style={{ marginBottom: '0.3rem' }}>
            <ScoreLabel $color={color}>{getLabel(score)}</ScoreLabel> — {pct}/100
          </div>
          Composite score based on:<br />
          &bull; Win rate & PnL consistency<br />
          &bull; Timing (buy low, sell high)<br />
          &bull; Volume & trade frequency<br />
          &bull; Portfolio diversification
        </Tooltip>
      )}
    </Wrapper>
  )
}
