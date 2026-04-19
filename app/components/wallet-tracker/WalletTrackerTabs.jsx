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
  { id: 'following', label: 'Following', href: '/watchlist', requiresAuth: true },
]

function resolveActive(pathname) {
  if (!pathname) return null
  // `/wallet-tracker/0xabc...` is still the Research tab.
  if (pathname === '/wallet-tracker' || pathname.startsWith('/wallet-tracker/')) return 'research'
  if (pathname === '/entities' || pathname.startsWith('/entities/')) return 'entities'
  if (pathname === '/entity' || pathname.startsWith('/entity/')) return 'entities'
  if (pathname === '/figures' || pathname.startsWith('/figures/')) return 'figures'
  if (pathname === '/figure' || pathname.startsWith('/figure/')) return 'figures'
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
          marginBottom: '1.5rem',
          borderBottom: '1px solid rgba(54, 166, 186, 0.2)',
          // Hide the scrollbar while keeping the scroll affordance on mobile.
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
                padding: '0.75rem 1.1rem',
                fontSize: '0.95rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#36a6ba' : 'var(--text-secondary)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                borderBottom: `2px solid ${isActive ? '#36a6ba' : 'transparent'}`,
                marginBottom: '-1px',
                transition: 'color 160ms ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              {t.label}
              {t.id === 'following' && count > 0 ? (
                <span
                  aria-label={`${count} items in watchlist`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 6px',
                    borderRadius: '999px',
                    background: 'rgba(54, 166, 186, 0.2)',
                    border: '1px solid rgba(54, 166, 186, 0.55)',
                    color: '#36a6ba',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {count}
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
