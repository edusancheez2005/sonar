'use client'

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import Link from 'next/link'

const MONO_FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace"
const SANS_FONT = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"

const TEASERS = [
  'See which whales are buying right now',
  'Track smart money flows in real-time',
  'Galaxy Score, Alt Rank, social sentiment',
  '10 AI conversations per day with Orca',
  'Full whale transaction history + CSV export',
  '$0.26/day for institutional-grade intelligence',
]

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
  margin-bottom: 0.5rem;
  max-width: 300px;
  line-height: 1.4;
`

const TeaserText = styled.div`
  font-family: ${SANS_FONT};
  font-size: 0.7rem;
  color: #8a9ab0;
  margin-bottom: 0.75rem;
  font-style: italic;
  min-height: 1.2em;
  transition: opacity 0.3s ease;
`

const UpgradeButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.2rem;
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

const PriceTag = styled.span`
  font-family: ${MONO_FONT};
  font-size: 0.6rem;
  color: #5a6a7a;
  margin-top: 0.5rem;
`

export default function PremiumGate({ isPremium, feature = 'this feature', children }) {
  // All features are now free — gate removed
  return <>{children}</>
}
