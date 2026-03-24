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
  position: fixed;
  background: #1a2d42;
  border: 1px solid var(--secondary);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.5;
  width: max-content;
  max-width: 300px;
  z-index: 9999;
  pointer-events: none;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  white-space: normal;
  word-wrap: break-word;
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
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = React.useRef(null)

  if (score == null) return <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>—</span>
  const pct = Math.round(Math.min(1, Math.max(0, score)) * 100)
  const color = getColor(score)

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ x: rect.left + rect.width / 2, y: rect.top })
    }
    setShow(true)
  }

  return (
    <Wrapper
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      <BarOuter>
        <BarInner $pct={pct} $color={color} />
      </BarOuter>
      <ScoreText $color={color}>{pct}</ScoreText>
      {show && (
        <Tooltip style={{ top: pos.y - 8, left: pos.x, transform: 'translate(-50%, -100%)' }}>
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
