'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styled, { keyframes } from 'styled-components'
import { shortenAddress, formatUsd, timeAgo } from '@/lib/wallet-tracker'

const MONO_FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace"

const slideIn = keyframes`
  from { transform: translateY(-4px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`

const BannerWrap = styled.div`
  background: linear-gradient(90deg, rgba(54, 166, 186, 0.15), rgba(54, 166, 186, 0.08));
  border-bottom: 1px solid rgba(54, 166, 186, 0.2);
  padding: 0.5rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  position: relative;
  min-height: 36px;
  overflow: hidden;
  @media (max-width: 768px) { padding: 0.5rem 0.75rem; gap: 0.5rem; }
`

const SignalText = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: ${MONO_FONT};
  font-size: 0.72rem;
  font-weight: 600;
  color: #e0e6ed;
  text-decoration: none;
  animation: ${slideIn} 0.35s ease-out;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  &:hover { color: #36a6ba; }
`

const ActionTag = styled.span`
  font-weight: 800;
  font-size: 0.68rem;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  letter-spacing: 0.5px;
  color: ${props => props.$buy ? '#36a6ba' : '#e74c3c'};
  background: ${props => props.$buy ? 'rgba(54, 166, 186, 0.12)' : 'rgba(231, 76, 60, 0.12)'};
`

const TimeLabel = styled.span`
  color: #5a6a7a;
  font-size: 0.65rem;
  font-family: ${MONO_FONT};
  flex-shrink: 0;
`

const DismissBtn = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #5a6a7a;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  line-height: 1;
  border-radius: 3px;
  transition: all 0.15s ease;
  &:hover { color: #e0e6ed; background: rgba(255, 255, 255, 0.05); }
`

const PulseIcon = styled.span`
  font-size: 0.75rem;
  flex-shrink: 0;
`

export default function AlertBanner() {
  const [signals, setSignals] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [dismissed, setDismissed] = useState(false)

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

  // Auto-rotate every 4 seconds
  useEffect(() => {
    if (signals.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % signals.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [signals.length])

  const handleDismiss = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDismissed(true)
  }, [])

  if (dismissed || signals.length === 0) return null

  const signal = signals[currentIdx]
  if (!signal) return null

  const isBuy = (signal.classification || '').toUpperCase() === 'BUY'
  const action = isBuy ? 'bought' : 'sold'
  const entity = signal.entity_name || shortenAddress(signal.whale_address)
  const token = signal.token_symbol || '???'
  const usd = formatUsd(signal.usd_value)
  const ago = timeAgo(signal.timestamp)
  const profileHref = `/wallet-tracker/${signal.whale_address}`

  return (
    <BannerWrap>
      <PulseIcon>{'\uD83D\uDC0B'}</PulseIcon>
      <SignalText href={profileHref} key={currentIdx}>
        <strong>{entity}</strong>
        <ActionTag $buy={isBuy}>{action}</ActionTag>
        <strong>{token}</strong>
        <span>for</span>
        <span style={{ color: '#36a6ba', fontWeight: 700 }}>{usd}</span>
        <TimeLabel>{ago}</TimeLabel>
      </SignalText>
      <DismissBtn onClick={handleDismiss} title="Dismiss">&times;</DismissBtn>
    </BannerWrap>
  )
}
