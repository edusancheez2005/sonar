'use client'
// Whale Terminal shell — the app-within-Sonar chrome shared by all four
// modules (Research / Entities / Figures / Polymarket) + Following.
// Terminal header (wordmark + module tabs + LIVE + UTC clock), scrolling
// price ticker tape, content column and a bottom status line. Square
// corners, hairline borders, mono uppercase labels, scanline texture.
// Auth + watchlist-count logic mirrors the previous shell.
import React, { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { C, FONT_MONO } from '@/app/lib/terminalTheme'
import { pulseGlow } from './primitives'
import AlertBanner from '@/components/wallet-tracker/AlertBanner'
import { useLivePoll } from '@/components/live/useLivePoll'
import { HealthChip, healthOf } from '@/components/live/HealthChip'

const TABS = [
  { id: 'research', label: 'Research', href: '/wallet-tracker' },
  { id: 'entities', label: 'Entities', href: '/entities' },
  { id: 'figures', label: 'Figures', href: '/figures' },
  { id: 'polymarket', label: 'Polymarket', href: '/polymarket' },
  { id: 'following', label: 'Following', href: '/watchlist', requiresAuth: true },
]

function resolveActive(pathname) {
  if (!pathname) return null
  if (pathname === '/wallet-tracker' || pathname.startsWith('/wallet-tracker/')) return 'research'
  if (pathname.startsWith('/whale/')) return 'research'
  if (pathname === '/entities' || pathname.startsWith('/entities/')) return 'entities'
  if (pathname === '/entity' || pathname.startsWith('/entity/')) return 'entities'
  if (pathname === '/figures' || pathname.startsWith('/figures/')) return 'figures'
  if (pathname === '/figure' || pathname.startsWith('/figure/')) return 'figures'
  if (pathname === '/polymarket' || pathname.startsWith('/polymarket/')) return 'polymarket'
  if (pathname === '/watchlist' || pathname.startsWith('/watchlist/')) return 'following'
  return null
}

// Hydration-safe UTC clock: renders a placeholder on the server pass and
// starts ticking after mount so SSR/CSR markup never diverges.
function useUtcClock() {
  const [now, setNow] = useState(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!now) return '--:--:-- UTC'
  const p = (x) => String(x).padStart(2, '0')
  return `${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())} UTC`
}

// ── styled ───────────────────────────────────────────────────────────
const Wrapper = styled.div`
  min-height: 100vh;
  background: ${C.pageBg};
  position: relative;
  display: flex;
  flex-direction: column;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 229, 255, 0.008) 2px, rgba(0, 229, 255, 0.008) 4px);
    pointer-events: none;
    z-index: 0;
  }
`

const TermHeader = styled.header`
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid ${C.borderSubtle};
  background: rgba(6, 10, 18, 0.95);
  position: relative;
  z-index: 1;
`

const Wordmark = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 1rem;
  border-right: 1px solid ${C.borderSubtle};
  flex-shrink: 0;
  .wm {
    font-family: ${FONT_MONO};
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 2px;
    color: ${C.textPrimary};
    white-space: nowrap;
  }
  .wm .u { color: ${C.cyan}; }
  .v {
    font-family: ${FONT_MONO};
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 1px;
    color: #041018;
    background: ${C.cyan};
    padding: 0.1rem 0.3rem;
  }
  @media (max-width: 640px) {
    padding: 0 0.7rem;
    .v { display: none; }
  }
`

const TabNav = styled.nav`
  display: flex;
  align-items: stretch;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
`

const Tab = styled(NextLink)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.78rem 1.15rem;
  background: ${(p) => (p.$active ? 'rgba(0, 229, 255, 0.06)' : 'none')};
  border-right: 1px solid ${C.borderSubtle};
  box-shadow: ${(p) => (p.$active ? `inset 0 -2px 0 ${C.cyan}` : 'none')};
  color: ${(p) => (p.$active ? C.cyan : C.textMuted)};
  font-family: ${FONT_MONO};
  font-size: 0.68rem;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  letter-spacing: 1.2px;
  text-transform: uppercase;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 140ms ease, background 140ms ease;
  &:hover { color: ${(p) => (p.$active ? C.cyan : C.textPrimary)}; }
  .count { color: ${C.textMuted}; font-weight: 500; }
  @media (max-width: 640px) { padding: 0.7rem 0.8rem; }
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 1rem;
  border-left: 1px solid ${C.borderSubtle};
  font-family: ${FONT_MONO};
  font-size: 0.62rem;
  white-space: nowrap;
  flex-shrink: 0;
  .live {
    color: ${C.green};
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    letter-spacing: 1px;
  }
  .live::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${C.green};
    animation: ${pulseGlow} 2s ease-in-out infinite;
  }
  .clock { color: ${C.textMuted}; }
  @media (max-width: 860px) { .clock { display: none; } }
  @media (max-width: 640px) { padding: 0 0.7rem; gap: 8px; }
`

const Content = styled.div`
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
  padding: 0.85rem;
  width: 100%;
  max-width: 1680px;
  margin: 0 auto;
  @media (max-width: 640px) { padding: 0.6rem; }
`

const StatusLine = styled.footer`
  display: flex;
  align-items: center;
  overflow: hidden;
  border-top: 1px solid ${C.borderSubtle};
  background: rgba(6, 10, 18, 0.95);
  font-family: ${FONT_MONO};
  font-size: 0.6rem;
  padding: 0.34rem 0;
  text-transform: uppercase;
  white-space: nowrap;
  position: relative;
  z-index: 1;

  .seg {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    padding: 0 0.9rem;
    border-right: 1px solid rgba(0, 229, 255, 0.07);
  }
  .seg .k { color: ${C.textMuted}; letter-spacing: 0.8px; }
  .seg .v { color: ${C.textPrimary}; font-weight: 600; }
  .conn { font-weight: 700; letter-spacing: 1px; display: inline-flex; align-items: center; gap: 6px; }
  .conn .dot { width: 6px; height: 6px; border-radius: 50%; }
  .clock { margin-left: auto; padding: 0 0.9rem; color: ${C.cyan}; font-weight: 600; flex-shrink: 0; }
`

const SrTitle = styled.h1`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

// ── feed status ──────────────────────────────────────────────────────
// Freshness of the Ethereum whale feed from /api/health/algorithm, once a
// minute and never while the tab is hidden. (It used to poll /api/ticker and
// said CONNECTED even when that returned nothing.)
function useWhaleFeedHealth(enabled) {
  const poll = useLivePoll((signal) => fetch('/api/health/algorithm', { cache: 'no-store', signal }), { intervalMs: 60_000, enabled })
  const lastTs = poll.data?.lastTs ?? null
  const health = healthOf({
    newestAt: lastTs,
    now: Date.now() + (poll.offsetMs || 0),
    lastPollOkAt: poll.lastFetchedAt,
    intervalMs: 60_000,
    consecutiveFailures: poll.consecutiveFailures,
  })
  return { health, lastTs, polled: poll.pollsOk > 0 || poll.consecutiveFailures > 0 }
}

export default function WhaleTerminalShell({
  title = 'WHALE_TERMINAL',
  live = false, // eslint-disable-line no-unused-vars -- kept for callers; the chip below replaced the static LIVE label
  statusSource = 'whale-feed', // 'whale-feed' | 'none' (Polymarket has its own refresh)
  statusSegments = [],
  whaleAlert = true, // scrolling whale-alert banner; Polymarket opts out
  children,
}) {
  const pathname = usePathname()
  const clock = useUtcClock()
  const [isAuthed, setIsAuthed] = useState(null)
  const [count, setCount] = useState(0)
  const feed = useWhaleFeedHealth(statusSource === 'whale-feed')

  useEffect(() => {
    let cancelled = false
    const sb = supabaseBrowser()
    const loadSession = async () => {
      try {
        const { data } = await sb.auth.getSession()
        if (!cancelled) setIsAuthed(!!data?.session)
      } catch {
        if (!cancelled) setIsAuthed(false)
      }
    }
    loadSession()
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      if (!cancelled) setIsAuthed(!!session)
    })
    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (isAuthed !== true) {
        if (!cancelled) setCount(0)
        return
      }
      try {
        const sb = supabaseBrowser()
        const { data } = await sb.auth.getSession()
        const token = data?.session?.access_token
        if (!token) {
          if (!cancelled) setCount(0)
          return
        }
        const res = await fetch('/api/watchlist/count', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setCount(Number(json?.total || 0))
      } catch {
        // silent
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [isAuthed, pathname])

  const active = resolveActive(pathname)
  const activeTab = TABS.find((t) => t.id === active)
  const visibleTabs = TABS.filter((t) => !t.requiresAuth || isAuthed === true)

  const connColor = !feed.polled ? C.amber : feed.health === 'live' ? C.green : feed.health === 'delayed' ? C.amber : C.red
  const connLabel = !feed.polled ? 'SYNCING' : `ETH WHALE FEED ${feed.health.toUpperCase()}`

  return (
    <Wrapper>
      <SrTitle>{title}</SrTitle>

      <TermHeader>
        <Wordmark>
          <span className="wm">
            WHALE<span className="u">_</span>TERMINAL
          </span>
          <span className="v">v2.0</span>
        </Wordmark>
        <TabNav aria-label="Whale terminal sections">
          {visibleTabs.map((t) => (
            <Tab
              key={t.id}
              href={t.href}
              prefetch={false}
              $active={active === t.id}
              aria-current={active === t.id ? 'page' : undefined}
            >
              {t.label}
              {t.id === 'following' && count > 0 ? <span className="count">· {count}</span> : null}
            </Tab>
          ))}
        </TabNav>
        <HeaderRight>
          {statusSource === 'whale-feed' && feed.polled ? (
            <HealthChip
              health={feed.health}
              prefix="ETH whale feed"
              testId="whale-feed-health"
              title={feed.lastTs ? `Newest Ethereum whale trade ${new Date(feed.lastTs).toISOString().slice(11, 16)} UTC` : 'No Ethereum whale trades in the last 3 hours'}
            />
          ) : null}
          <span className="clock">{clock}</span>
        </HeaderRight>
      </TermHeader>

      <Content>
        {whaleAlert ? <AlertBanner /> : null}
        {children}
      </Content>

      <StatusLine aria-hidden>
        {statusSource === 'whale-feed' ? (
          <span className="seg conn" style={{ color: connColor }}>
            <span className="dot" style={{ background: connColor }} />
            {connLabel}
          </span>
        ) : null}
        {activeTab ? (
          <span className="seg">
            <span className="k">MODULE</span>
            <span className="v" style={{ color: C.cyan }}>{activeTab.label}</span>
          </span>
        ) : null}
        {statusSegments.map((s) => (
          <span className="seg" key={s.k}>
            <span className="k">{s.k}</span>
            <span className="v" style={s.color ? { color: s.color } : undefined}>{s.v}</span>
          </span>
        ))}
        {statusSource === 'whale-feed' && feed.lastTs ? (
          <span className="seg">
            <span className="k">NEWEST TRADE</span>
            <span className="v">{Math.max(0, Math.round((Date.now() - feed.lastTs) / 60000))}M AGO</span>
          </span>
        ) : null}
        <span className="clock">{clock}</span>
      </StatusLine>
    </Wrapper>
  )
}
