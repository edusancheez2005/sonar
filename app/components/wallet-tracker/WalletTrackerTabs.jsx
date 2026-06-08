'use client'
import React, { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

// Shared tab bar for the Wallet Tracker hub. Sits directly under the
// page header on /wallet-tracker, /entities, /figures, /watchlist.
// Following tab is hidden when the viewer is signed out, and carries
// a live count badge once the signed-in user has followed anything.
const TABS = [
  { id: 'research', label: 'Research', href: '/wallet-tracker' },
  { id: 'entities', label: 'Entities', href: '/entities' },
  { id: 'figures', label: 'Figures', href: '/figures' },
  { id: 'polymarket', label: 'Polymarket', href: '/polymarket' },
  { id: 'following', label: 'Following', href: '/watchlist', requiresAuth: true },
]

function resolveActive(pathname) {
  if (!pathname) return null
  // `/wallet-tracker/0xabc...` and `/whale/0xabc...` are wallet profiles → Research.
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

export default function WalletTrackerTabs({ activeOverride } = {}) {
  const pathname = usePathname()
  const [isAuthed, setIsAuthed] = useState(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const sb = supabaseBrowser()
    const loadSession = async () => {
      try {
        const { data } = await sb.auth.getSession()
        if (cancelled) return
        setIsAuthed(!!data?.session)
      } catch {
        if (!cancelled) setIsAuthed(false)
      }
    }
    loadSession()
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      if (cancelled) return
      setIsAuthed(!!session)
    })
    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    // Lightweight count ping — re-runs on auth change and whenever the
    // route changes so the badge stays in sync after a follow/unfollow.
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

  const active = activeOverride || resolveActive(pathname)

  const visibleTabs = TABS.filter((t) => !t.requiresAuth || isAuthed === true)

  return (
    <>
      <nav
        aria-label="Wallet Tracker sections"
        style={{
          display: 'flex',
          gap: '0.25rem',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          marginBottom: '1.25rem',
          borderBottom: '1px solid rgba(34, 211, 238, 0.12)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="sonar-wt-tabs"
      >
        {visibleTabs.map((t) => {
          const isActive = active === t.id
          return (
            <NextLink
              key={t.id}
              href={t.href}
              prefetch={false}
              style={{
                position: 'relative',
                flexShrink: 0,
                padding: '0.6rem 0.95rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: isActive ? 'var(--neon-bright)' : 'var(--text-secondary)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                borderBottom: `2px solid ${isActive ? 'var(--neon-cyan)' : 'transparent'}`,
                marginBottom: '-1px',
                transition: 'color 160ms ease, border-color 160ms ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              {t.label}
              {t.id === 'following' && count > 0 ? (
                <span
                  aria-label={`${count} items in watchlist`}
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                  }}
                >
                  · {count}
                </span>
              ) : null}
            </NextLink>
          )
        })}
      </nav>
      <style>{`
        .sonar-wt-tabs::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  )
}
