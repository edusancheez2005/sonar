'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styled, { keyframes } from 'styled-components'
import { shortenAddress, formatUsd, timeAgo } from '@/lib/wallet-tracker'
import { FONT_MONO } from '@/src/styles/fontStacks'

const slideIn = keyframes`
  from { transform: translateX(10px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`

const pulseGlow = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 4px #00e5ff; }
  50% { opacity: 0.4; box-shadow: 0 0 8px #00e5ff; }
`

const BannerWrap = styled.div`
  background: rgba(13, 17, 28, 0.8);
  border: 1px solid rgba(0, 229, 255, 0.12);
  border-radius: 0;
  padding: 0.45rem 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  position: relative;
  margin: 0 0 10px;
  backdrop-filter: blur(8px);

  @media (max-width: 768px) {
    padding: 0.4rem 0.6rem;
    gap: 0.4rem;
  }
`

const LiveDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00e5ff;
  flex-shrink: 0;
  animation: ${pulseGlow} 2s ease-in-out infinite;
`

const Label = styled.span`
  font-family: ${FONT_MONO};
  font-size: 0.65rem;
  font-weight: 700;
  color: #00e5ff;
  letter-spacing: 1px;
  text-transform: uppercase;
  flex-shrink: 0;
  opacity: 0.7;
`

const SignalText = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-family: ${FONT_MONO};
  font-size: 0.75rem;
  color: #e0e6ed;
  text-decoration: none;
  animation: ${slideIn} 0.3s ease-out;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;

  &:hover { color: #00e5ff; }
`

const ActionTag = styled.span`
  font-weight: 800;
  font-size: 0.68rem;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  letter-spacing: 0.3px;
  color: ${({ $buy }) => $buy ? '#00e5ff' : '#e74c3c'};
  background: ${({ $buy }) => $buy ? 'rgba(0, 229, 255, 0.1)' : 'rgba(231, 76, 60, 0.1)'};
`

const Value = styled.span`
  color: #00e5ff;
  font-weight: 700;
`

const TimeLabel = styled.span`
  color: #5a6a7a;
  font-size: 0.65rem;
  flex-shrink: 0;
`

export default function AlertBanner() {
  const [signals, setSignals] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    async function fetchSignals() {
      try {
        const res = await fetch('/api/wallet-tracker/signals?limit=5')
        if (!res.ok) return
        const json = await res.json()
        setSignals(json.data || [])
      } catch {}
    }
    fetchSignals()
  }, [])

  useEffect(() => {
    if (signals.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % signals.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [signals.length])

  if (signals.length === 0) return null

  const signal = signals[currentIdx]
  if (!signal) return null

  const isBuy = (signal.classification || '').toUpperCase() === 'BUY'
  const action = isBuy ? 'bought' : 'sold'
  const entity = signal.entity_name || shortenAddress(signal.whale_address, 4)
  const token = signal.token_symbol || '???'
  const usd = formatUsd(signal.usd_value)
  const ago = timeAgo(signal.timestamp)
  // Canonical public wallet profile — same destination as every other
  // address link in the terminal (see walletAnalysisHref).
  const profileHref = `/whale/${encodeURIComponent(signal.whale_address)}`

  return (
    <BannerWrap>
      <LiveDot />
      <Label>Whale Alert</Label>
      <SignalText href={profileHref} key={currentIdx}>
        <strong>{entity}</strong>
        <ActionTag $buy={isBuy}>{action}</ActionTag>
        <strong>{token}</strong>
        <span style={{ color: '#5a6a7a' }}>for</span>
        <Value>{usd}</Value>
        <TimeLabel>— {ago}</TimeLabel>
      </SignalText>
    </BannerWrap>
  )
}
