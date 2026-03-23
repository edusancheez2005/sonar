'use client'
import React from 'react'
import styled from 'styled-components'

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const BarOuter = styled.div`
  width: 60px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
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
`

function getColor(score) {
  if (score >= 0.7) return '#00d4aa'
  if (score >= 0.4) return '#ffd93d'
  return '#ff6b6b'
}

export default function SmartMoneyScore({ score }) {
  if (score == null) return <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>—</span>
  const pct = Math.round(Math.min(1, Math.max(0, score)) * 100)
  const color = getColor(score)

  return (
    <Wrapper>
      <BarOuter>
        <BarInner $pct={pct} $color={color} />
      </BarOuter>
      <ScoreText $color={color}>{pct}</ScoreText>
    </Wrapper>
  )
}
