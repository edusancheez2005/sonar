'use client'
import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

/**
 * /try — willingness-to-pay fake-door landing for COLD traffic (IG/X/TikTok).
 * Roadmap: "≥100 visits; intent-click % recorded."
 *
 * Every visit and CTA click is counted server-side via POST /api/wtp
 * (consent-gated GA misses most cold visitors). Attribution comes from
 * ?src= (e.g. /try?src=ig), optional copy variant from ?v=.
 * The intent click continues into the REAL trial funnel (/subscribe).
 */

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.25rem;
  background:
    radial-gradient(1100px 520px at 15% -10%, rgba(34, 211, 238, 0.12), transparent 60%),
    radial-gradient(900px 480px at 100% 10%, rgba(54, 166, 186, 0.10), transparent 55%),
    var(--background-dark, #0a1621);
`

const Card = styled.div`
  max-width: 640px;
  width: 100%;
  text-align: center;
`

const Eyebrow = styled.div`
  font-family: var(--font-mono, monospace);
  font-size: 0.7rem;
  letter-spacing: 0.22em;
  color: var(--neon-cyan, #22d3ee);
  font-weight: 700;
  margin-bottom: 1rem;
`

const H1 = styled.h1`
  font-size: clamp(1.9rem, 5vw, 2.8rem);
  font-weight: 800;
  color: var(--text-primary, #fff);
  line-height: 1.15;
  margin: 0 0 1rem;

  span {
    background: linear-gradient(135deg, #7af8ff 0%, #22d3ee 60%, #36a6ba 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`

const Sub = styled.p`
  color: var(--text-secondary, #a0b2c6);
  font-size: 1.02rem;
  line-height: 1.65;
  margin: 0 auto 1.75rem;
  max-width: 46ch;
`

const Chips = styled.div`
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
`

const Chip = styled.span`
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--neon-border, rgba(34, 211, 238, 0.16));
  background: rgba(34, 211, 238, 0.06);
  color: var(--neon-bright, #7af8ff);
`

const PriceCard = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  padding: 1.5rem 2.25rem;
  border-radius: 16px;
  border: 1px solid var(--neon-border, rgba(34, 211, 238, 0.16));
  background: linear-gradient(180deg, rgba(13, 33, 52, 0.85) 0%, rgba(8, 16, 25, 0.75) 100%);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), 0 0 40px rgba(34, 211, 238, 0.06);
`

const PriceLine = styled.div`
  color: var(--text-primary, #fff);
  font-size: 1.05rem;
  font-weight: 700;

  small {
    display: block;
    color: var(--text-secondary, #a0b2c6);
    font-weight: 500;
    font-size: 0.82rem;
    margin-top: 0.25rem;
  }
`

const CTA = styled.button`
  border: none;
  cursor: pointer;
  padding: 0.9rem 2.2rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 800;
  color: #0a1621;
  background: linear-gradient(135deg, #7af8ff 0%, #22d3ee 60%, #36a6ba 100%);
  box-shadow: 0 8px 24px rgba(34, 211, 238, 0.35);
  transition: all 0.16s;

  &:hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
    box-shadow: 0 12px 32px rgba(34, 211, 238, 0.5);
  }
`

const Secondary = styled.button`
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-secondary, #a0b2c6);
  font-size: 0.88rem;
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover { color: var(--neon-bright, #7af8ff); }
`

const FinePrint = styled.p`
  color: var(--text-secondary, #a0b2c6);
  opacity: 0.6;
  font-size: 0.72rem;
  margin-top: 2rem;
`

function readParams() {
  if (typeof window === 'undefined') return { source: null, variant: null }
  const p = new URLSearchParams(window.location.search)
  return { source: p.get('src'), variant: p.get('v') }
}

function track(event, params) {
  try {
    fetch('/api/wtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ event, source: params.source, variant: params.variant, path: '/try' }),
    }).catch(() => {})
  } catch { /* never block the visitor */ }
}

export default function TryClient() {
  const paramsRef = useRef({ source: null, variant: null })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    paramsRef.current = readParams()
    // One visit per browser session (survives back-navigation)
    try {
      if (!sessionStorage.getItem('wtp_visit')) {
        sessionStorage.setItem('wtp_visit', '1')
        track('visit', paramsRef.current)
      }
    } catch {
      track('visit', paramsRef.current)
    }
  }, [])

  const onStart = () => {
    if (busy) return
    setBusy(true)
    track('intent_click', paramsRef.current)
    // Give the beacon a moment, then continue into the real trial funnel
    setTimeout(() => { window.location.href = '/subscribe' }, 150)
  }

  const onExplore = () => {
    track('explore_click', paramsRef.current)
    setTimeout(() => { window.location.href = '/wallet-tracker' }, 100)
  }

  return (
    <Page>
      <Card>
        <Eyebrow>SONAR TRACKER</Eyebrow>
        <H1>
          See what whales do.<br /><span>Before everyone else does.</span>
        </H1>
        <Sub>
          Sonar tracks the biggest wallets on-chain across 10+ blockchains, live.
          Follow any whale, get alerts the moment they move, and backtest what
          mirroring their trades would have looked like.
        </Sub>
        <Chips>
          <Chip>70,000+ tracked wallets</Chip>
          <Chip>10+ chains · real-time</Chip>
          <Chip>Whale Score + backtests</Chip>
        </Chips>
        <PriceCard>
          <PriceLine>
            7 days free, then $7.99/month
            <small>Cancel anytime — one click, no questions</small>
          </PriceLine>
          <CTA onClick={onStart} disabled={busy}>
            {busy ? 'Opening…' : 'Start my free trial →'}
          </CTA>
          <Secondary onClick={onExplore}>or explore the live whale terminal first</Secondary>
        </PriceCard>
        <FinePrint>
          Market data is informational only — not investment advice. Past performance
          does not indicate future results.
        </FinePrint>
      </Card>
    </Page>
  )
}
