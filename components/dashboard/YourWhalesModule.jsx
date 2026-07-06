'use client'
/**
 * "Your whales moved" — the personalization/retention centerpiece at the top
 * of the dashboard. Shows what the user's FOLLOWED wallets did in the last
 * 24h. Three states:
 *   - no follows      -> a nudge with one-tap ways to follow (drives the
 *                        %-of-users-with-≥1-follow metric that predicts return)
 *   - follows, quiet  -> reassurance + the wallets they follow
 *   - follows + moves -> the hero: ranked recent moves, each links to the wallet
 *
 * Self-guarding: renders nothing for signed-out visitors. Reuses the existing
 * /api/wallet-tracker/follows/feed endpoint.
 */
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const C = {
  cyan: '#00e5ff',
  green: '#00e676',
  red: '#ff5470',
  text: '#e0e6ed',
  muted: '#5a6a7a',
  panel: 'rgba(12, 16, 26, 0.92)',
  border: 'rgba(0, 229, 255, 0.14)',
}

const Panel = styled.div`
  background: ${C.panel};
  backdrop-filter: blur(12px);
  border: 1px solid ${C.border};
  border-radius: 10px;
  padding: 1.1rem 1.25rem;
  margin-top: 1rem;
`

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.9rem;
  flex-wrap: wrap;
`

const Kicker = styled.span`
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${C.cyan};
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
`

const CountPill = styled.span`
  font-family: var(--font-mono, monospace);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  color: ${C.green};
  border: 1px solid ${C.green}55;
  background: ${C.green}14;
`

const ViewAll = styled(Link)`
  margin-left: auto;
  font-family: var(--font-mono, monospace);
  font-size: 0.62rem;
  font-weight: 700;
  color: ${C.cyan};
  text-decoration: none;
  border: 1px solid rgba(0, 229, 255, 0.15);
  background: rgba(0, 229, 255, 0.06);
  border-radius: 4px;
  padding: 0.25rem 0.6rem;
  white-space: nowrap;
  &:hover { background: rgba(0, 229, 255, 0.12); }
`

const MoveRow = styled(Link)`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.15rem;
  border-bottom: 1px solid rgba(0, 229, 255, 0.07);
  text-decoration: none;
  transition: background 0.12s;
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(0, 229, 255, 0.04); }
`

const Who = styled.div`
  min-width: 0;
  .name { color: ${C.text}; font-weight: 700; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sub { color: ${C.muted}; font-size: 0.74rem; margin-top: 0.1rem; }
`

const Amount = styled.div`
  text-align: right;
  font-family: var(--font-mono, monospace);
  white-space: nowrap;
  .action { font-size: 0.66rem; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: ${(p) => (p.$buy ? C.green : C.red)}; }
  .usd { color: ${C.text}; font-weight: 700; font-size: 0.92rem; margin-top: 0.1rem; }
`

const Body = styled.p`
  color: ${C.muted};
  font-size: 0.86rem;
  line-height: 1.6;
  margin: 0 0 0.9rem;
`

const Actions = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
`

const ActionBtn = styled(Link)`
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
  padding: 0.5rem 0.95rem;
  border-radius: 8px;
  color: ${(p) => (p.$primary ? '#0a1621' : C.cyan)};
  background: ${(p) => (p.$primary ? 'linear-gradient(135deg,#7af8ff,#22d3ee 60%,#36a6ba)' : 'rgba(0,229,255,0.06)')};
  border: 1px solid ${(p) => (p.$primary ? 'transparent' : 'rgba(0,229,255,0.16)')};
  &:hover { filter: brightness(1.06); }
`

const WalletChips = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const Chip = styled(Link)`
  font-size: 0.78rem;
  color: ${C.text};
  text-decoration: none;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid ${C.border};
  background: rgba(0, 229, 255, 0.04);
  &:hover { border-color: rgba(0, 229, 255, 0.35); }
`

function fmtUsd(n) {
  const v = Number(n) || 0
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`
  return `$${Math.round(v)}`
}
function ago(ts) {
  const ms = Date.now() - new Date(ts).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'now'
  const h = Math.floor(ms / 3600000)
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60000))}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
function shortAddr(a) { return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '' }

export default function YourWhalesModule() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const sb = supabaseBrowser()
        const { data } = await sb.auth.getSession()
        const token = data?.session?.access_token
        if (!token) { if (!cancelled) setState({ status: 'hidden' }); return }

        const res = await fetch('/api/wallet-tracker/follows/feed?limit=30', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) { if (!cancelled) setState({ status: 'hidden' }); return }
        const json = await res.json()
        const wallets = json.wallets || []
        const feed = json.feed || []

        // Moves in the last 24h, biggest first.
        const dayAgo = Date.now() - 24 * 3600 * 1000
        const recent = feed
          .filter((t) => new Date(t.timestamp).getTime() >= dayAgo)
          .sort((a, b) => (Number(b.usd_value) || 0) - (Number(a.usd_value) || 0))

        if (!cancelled) {
          if (wallets.length === 0) setState({ status: 'empty' })
          else if (recent.length === 0) setState({ status: 'quiet', wallets })
          else setState({ status: 'moves', wallets, moves: recent })
        }
      } catch {
        if (!cancelled) setState({ status: 'hidden' })
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (state.status === 'loading' || state.status === 'hidden') return null

  // No follows yet — the nudge that drives the retention metric.
  if (state.status === 'empty') {
    return (
      <Panel>
        <Head>
          <Kicker><span style={{ color: C.green }}>&gt;</span> FOLLOW YOUR FIRST WHALES</Kicker>
        </Head>
        <Body>
          Follow a wallet and Sonar tells you the moment it moves — on your dashboard and in your inbox.
          Start with the wallets moving the most money right now.
        </Body>
        <Actions>
          <ActionBtn href="/whales/leaderboard" $primary>Browse the whale leaderboard →</ActionBtn>
          <ActionBtn href="/whales/entities">See named whales (Vitalik, Wintermute…)</ActionBtn>
        </Actions>
      </Panel>
    )
  }

  // Follows but no moves in 24h.
  if (state.status === 'quiet') {
    return (
      <Panel>
        <Head>
          <Kicker><span style={{ color: C.green }}>&gt;</span> YOUR WHALES</Kicker>
          <ViewAll href="/dashboard/personal">View all →</ViewAll>
        </Head>
        <Body>
          All quiet — the {state.wallets.length} wallet{state.wallets.length === 1 ? '' : 's'} you follow
          haven&rsquo;t traded in the last 24 hours. We&rsquo;ll surface it here the second they do.
        </Body>
        <WalletChips>
          {state.wallets.slice(0, 8).map((w) => (
            <Chip key={w.address} href={`/wallet-tracker/${w.address}`}>
              {w.nickname || w.entity_name || shortAddr(w.address)}
            </Chip>
          ))}
        </WalletChips>
      </Panel>
    )
  }

  // The hero: your whales moved.
  const { moves, wallets } = state
  return (
    <Panel>
      <Head>
        <Kicker><span style={{ color: C.green }}>&gt;</span> YOUR WHALES MOVED</Kicker>
        <CountPill>{moves.length} TRADE{moves.length === 1 ? '' : 'S'} · 24H</CountPill>
        <ViewAll href="/dashboard/personal">View all →</ViewAll>
      </Head>
      <div>
        {moves.slice(0, 5).map((m, i) => {
          const buy = String(m.classification || '').toUpperCase() === 'BUY'
          const name = m.entity_name || shortAddr(m.whale_address)
          return (
            <MoveRow key={`${m.whale_address}-${m.timestamp}-${i}`} href={`/wallet-tracker/${m.whale_address}`}>
              <Who>
                <div className="name">{name}</div>
                <div className="sub">{buy ? 'bought' : 'sold'} {m.token_symbol || '?'} · {ago(m.timestamp)}</div>
              </Who>
              <Amount $buy={buy}>
                <div className="action">{buy ? 'BUY' : 'SELL'}</div>
                <div className="usd">{fmtUsd(m.usd_value)}</div>
              </Amount>
            </MoveRow>
          )
        })}
      </div>
      {wallets.length > 0 && (
        <div style={{ marginTop: '0.85rem' }}>
          <ActionBtn href="/dashboard/personal" $primary>See all their moves →</ActionBtn>
        </div>
      )}
    </Panel>
  )
}
