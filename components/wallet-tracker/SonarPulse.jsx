'use client'
import React from 'react'
import styled, { keyframes, css } from 'styled-components'

const pulseRing = keyframes`
  0% {
    transform: scale(0.3);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
`

const pingFade = keyframes`
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.5);
  }
`

const sweep = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`

const Wrapper = styled.div`
  width: 50px;
  height: 50px;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const Ring = styled.div`
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--primary, #36a6ba);
  opacity: ${({ $active }) => $active ? 0.4 : 0.15};
  width: ${({ $size }) => $size}%;
  height: ${({ $size }) => $size}%;

  ${({ $active, $delay }) => $active && css`
    animation: ${pulseRing} 3s ease-out ${$delay}s infinite;
  `}
`

const CenterDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $active }) => $active ? '#00e5ff' : 'var(--primary, #36a6ba)'};
  box-shadow: ${({ $active }) => $active ? '0 0 6px #00e5ff, 0 0 12px rgba(0, 229, 255, 0.3)' : 'none'};
  z-index: 2;
  position: relative;
`

const SweepLine = styled.div`
  position: absolute;
  width: 50%;
  height: 1px;
  top: 50%;
  left: 50%;
  transform-origin: 0% 50%;
  background: linear-gradient(90deg, rgba(54, 166, 186, 0.6), transparent);
  z-index: 1;

  ${({ $active }) => $active && css`
    animation: ${sweep} 4s linear infinite;
  `}

  ${({ $active }) => !$active && css`
    opacity: 0.2;
  `}
`

const Ping = styled.div`
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #00e5ff;
  box-shadow: 0 0 4px #00e5ff;
  top: ${({ $top }) => $top}%;
  left: ${({ $left }) => $left}%;
  animation: ${pingFade} 2s ease-out forwards;
  z-index: 3;
`

const CountBadge = styled.div`
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 14px;
  height: 14px;
  border-radius: 7px;
  background: #00e5ff;
  color: #0a1621;
  font-size: 0.55rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  z-index: 4;
`

// Deterministic positions for ping dots based on count
const PING_POSITIONS = [
  { top: 20, left: 65 },
  { top: 35, left: 25 },
  { top: 70, left: 60 },
  { top: 55, left: 15 },
  { top: 15, left: 40 },
]

export default function SonarPulse({ active = false, count = 0 }) {
  const pings = Math.min(count, PING_POSITIONS.length)

  return (
    <Wrapper>
      <Ring $size={100} $active={active} $delay={0} />
      <Ring $size={70} $active={active} $delay={0.5} />
      <Ring $size={40} $active={active} $delay={1} />
      <SweepLine $active={active} />
      <CenterDot $active={active} />
      {active && pings > 0 && PING_POSITIONS.slice(0, pings).map((pos, i) => (
        <Ping key={i} $top={pos.top} $left={pos.left} />
      ))}
      {count > 0 && <CountBadge>{count > 9 ? '9+' : count}</CountBadge>}
    </Wrapper>
  )
}
