'use client'

import React from 'react'
import styled from 'styled-components'
import Link from 'next/link'

const MONO_FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace"
const SANS_FONT = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"

const GateWrapper = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 8px;
`

const BlurredContent = styled.div`
  filter: blur(6px);
  pointer-events: none;
  user-select: none;
  opacity: 0.5;
`

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  background: rgba(10, 14, 23, 0.6);
  backdrop-filter: blur(2px);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
`

const LockIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  
  svg {
    width: 18px;
    height: 18px;
    fill: #00e5ff;
  }
`

const GateTitle = styled.div`
  font-family: ${MONO_FONT};
  font-size: 0.75rem;
  font-weight: 700;
  color: #00e5ff;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 0.4rem;
`

const GateDescription = styled.div`
  font-family: ${SANS_FONT};
  font-size: 0.8rem;
  color: #5a6a7a;
  margin-bottom: 0.75rem;
  max-width: 300px;
  line-height: 1.4;
`

const UpgradeButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1rem;
  border-radius: 4px;
  background: linear-gradient(135deg, #00e5ff 0%, #00b8d4 100%);
  color: #0a0e17;
  font-family: ${MONO_FONT};
  font-size: 0.7rem;
  font-weight: 700;
  text-decoration: none;
  letter-spacing: 0.5px;
  transition: box-shadow 0.15s ease;
  
  &:hover {
    box-shadow: 0 4px 16px rgba(0, 229, 255, 0.3);
  }
`

export default function PremiumGate({ isPremium, feature = 'this feature', children }) {
  if (isPremium) return <>{children}</>

  return (
    <GateWrapper>
      <BlurredContent>{children}</BlurredContent>
      <Overlay>
        <LockIcon>
          <svg viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
        </LockIcon>
        <GateTitle>PREMIUM</GateTitle>
        <GateDescription>Unlock {feature} with Sonar Premium</GateDescription>
        <UpgradeButton href="/subscribe">UPGRADE →</UpgradeButton>
      </Overlay>
    </GateWrapper>
  )
}
