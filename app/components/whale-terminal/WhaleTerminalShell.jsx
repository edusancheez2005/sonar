'use client'
// Unified shell + tab bar for the Whale Intelligence Terminal.
// Wraps Feed / Entities / Figures / Polymarket / Following sections in
// the shared terminal chrome so each route looks like one product.
// Auth + watchlist-count logic mirrors the existing WalletTrackerTabs.
import React, { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { C, FONT_MONO } from '@/app/lib/terminalTheme'
import { PageWrapper, Container, PageTitle, TitleText, LiveDot } from './primitives'

const TABS = [
  { id: 'research', label: 'Research', href: '/wallet-tracker' },
  { id: 'entities', label: 'Entities', href: '/entities' },
  { id: 'figures', label: 'Figures', href: '/figures' },
  { id: 'polymarket', label: 'Polymarket', href: '/polymarket' },
  { id: 'following', label: 'Following', href: '/watchlist', requiresAuth: true },
]

function resolveActive(pathname) {
  if (!pathname) return null
  // Wallet research hub + individual wallet/whale profiles.
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

const TabBar = styled.nav`
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid ${C.borderSubtle};
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
`

const Tab = styled(NextLink)`
  position: relative;
  flex-shrink: 0;
  padding: 0.6rem 0.95rem;
  font-family: ${FONT_MONO};
  font-size: 0.78rem;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${(p) => (p.$active ? C.cyan : C.textMuted)};
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 2px solid ${(p) => (p.$active ? C.cyan : 'transparent')};
  margin-bottom: -1px;
  transition: color 160ms ease, border-color 160ms ease;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  &:hover { color: ${(p) => (p.$active ? C.cyan : C.textPrimary)}; }
`

const CountBadge = styled.span`
  color: ${C.textMuted};
  font-size: 0.72rem;
  font-weight: 500;
`

export default function WhaleTerminalShell({ title = 'WHALE_INTELLIGENCE', live = false, children }) {
  const pathname = usePathname()
  const [isAuthed, setIsAuthed] = useState(null)
  const [count, setCount] = useState(0)

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
  const visibleTabs = TABS.filter((t) => !t.requiresAuth || isAuthed === true)

  return (
    <PageWrapper>
      <Container>
        <PageTitle>
          <TitleText>{title}</TitleText>
          {live ? <LiveDot>LIVE</LiveDot> : null}
        </PageTitle>

        <TabBar aria-label="Whale terminal sections">
          {visibleTabs.map((t) => (
            <Tab
              key={t.id}
              href={t.href}
              prefetch={false}
              $active={active === t.id}
              aria-current={active === t.id ? 'page' : undefined}
            >
              {t.label}
              {t.id === 'following' && count > 0 ? <CountBadge>· {count}</CountBadge> : null}
            </Tab>
          ))}
        </TabBar>

        {children}
      </Container>
    </PageWrapper>
  )
}
