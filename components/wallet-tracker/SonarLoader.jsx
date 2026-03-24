'use client'
import React from 'react'
import styled, { keyframes } from 'styled-components'

const pulseRing = keyframes`
  0% { transform: scale(0.3); opacity: 0.6; }
  100% { transform: scale(1); opacity: 0; }
`

const sweep = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`

const fadeText = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
`

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ $compact }) => $compact ? '2rem 1rem' : '3rem 1rem'};
  gap: 1rem;
`

const Radar = styled.div`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Ring = styled.div`
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(54, 166, 186, 0.3);
  animation: ${pulseRing} ${({ $duration }) => $duration}s ease-out ${({ $delay }) => $delay}s infinite;
  width: 100%;
  height: 100%;
`

const InnerRing = styled.div`
  position: absolute;
  width: 50%;
  height: 50%;
  border-radius: 50%;
  border: 1px solid rgba(54, 166, 186, 0.2);
`

const SweepLine = styled.div`
  position: absolute;
  width: 50%;
  height: 1.5px;
  top: 50%;
  left: 50%;
  transform-origin: 0% 50%;
  background: linear-gradient(90deg, rgba(0, 229, 255, 0.8), transparent);
  animation: ${sweep} 2s linear infinite;
`

const CenterDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00e5ff;
  box-shadow: 0 0 8px #00e5ff, 0 0 16px rgba(0, 229, 255, 0.3);
  z-index: 2;
`

const Label = styled.div`
  font-size: ${({ $compact }) => $compact ? '0.8rem' : '0.85rem'};
  color: var(--primary);
  font-weight: 500;
  letter-spacing: 0.5px;
  animation: ${fadeText} 2s ease-in-out infinite;
`

export default function SonarLoader({ text = 'Scanning...', size = 80, compact = false }) {
  return (
    <Wrapper $compact={compact}>
      <Radar $size={size}>
        <Ring $duration={2.5} $delay={0} />
        <Ring $duration={2.5} $delay={0.8} />
        <Ring $duration={2.5} $delay={1.6} />
        <InnerRing />
        <SweepLine />
        <CenterDot />
      </Radar>
      <Label $compact={compact}>{text}</Label>
    </Wrapper>
  )
}
