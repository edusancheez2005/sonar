'use client'
/**
 * Follow-your-first-whale nudge — a small dismissible popup, bottom-right,
 * shown on the dashboard ONLY when the signed-in user follows zero wallets.
 * Replaces the inline top-of-dashboard panel (too heavy, per founder review).
 *
 * Dismiss is remembered in localStorage; following a wallet hides it forever
 * by definition (the zero-follows check fails).
 */
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import styled, { keyframes } from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const DISMISS_KEY = 'sonar-follow-nudge-dismissed'

const slideUp = keyframes`
  from { transform: translateY(14px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
`

const Card = styled.div`
  position: fixed;
  right: 1.25rem;
  bottom: 5.75rem; /* clears the Ask ORCA pill */
  z-index: 940;
  width: min(320px, calc(100vw - 2.5rem));
  background: rgba(12, 16, 26, 0.97);
  border: 1px solid rgba(0, 229, 255, 0.18);
  border-radius: 12px;
  padding: 1rem 1.1rem;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55), 0 0 24px rgba(34, 211, 238, 0.08);
  backdrop-filter: blur(12px);
  animation: ${slideUp} 0.28s cubic-bezier(0.22, 1, 0.36, 1);

  @media (max-width: 600px) {
    right: 0.75rem;
    bottom: 8.75rem; /* mobile: ORCA pill sits higher */
  }
`

const CloseBtn = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.55rem;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(160, 210, 220, 0.55);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  &:hover { color: #7af8ff; background: rgba(34, 211, 238, 0.08); }
`

const Kicker = styled.div`
  font-family: var(--font-mono, monospace);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #22d3ee;
  margin-bottom: 0.35rem;
`

const Title = styled.div`
  color: #e0e6ed;
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 0.3rem;
`

const Copy = styled.p`
  color: rgba(160, 210, 220, 0.7);
  font-size: 0.8rem;
  line-height: 1.55;
  margin: 0 0 0.75rem;
`

const CTA = styled(Link)`
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 700;
  text-decoration: none;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  color: #0a1621;
  background: linear-gradient(135deg, #7af8ff, #22d3ee 60%, #36a6ba);
  &:hover { filter: brightness(1.07); }
`

export default function FollowNudgePopup() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let cancelled = false
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return undefined
    } catch { /* ignore */ }

    const timer = setTimeout(async () => {
      try {
        const sb = supabaseBrowser()
        const { data } = await sb.auth.getSession()
        const token = data?.session?.access_token
        if (!token) return
        const res = await fetch('/api/wallet-tracker/follows', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const list = await res.json()
        if (!cancelled && Array.isArray(list) && list.length === 0) setShow(true)
      } catch { /* stay hidden on any failure */ }
    }, 1500)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  if (!show) return null

  const dismiss = () => {
    setShow(false)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
  }

  return (
    <Card role="dialog" aria-label="Follow your first whale">
      <CloseBtn type="button" aria-label="Dismiss" onClick={dismiss}>×</CloseBtn>
      <Kicker>Get personal</Kicker>
      <Title>Follow your first whale</Title>
      <Copy>
        Follow a wallet and Sonar tells you the moment it moves — on your
        dashboard and in your inbox.
      </Copy>
      <CTA href="/whales/leaderboard" onClick={dismiss}>Browse the leaderboard →</CTA>
    </Card>
  )
}
