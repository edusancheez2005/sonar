'use client'
import React, { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import WalletTrackerTabs from '@/app/components/wallet-tracker/WalletTrackerTabs'
import EntityAvatar from '@/app/components/entities/EntityAvatar'
import {
  categoryStyle,
  categoryLabel,
  entityInitials,
  truncateAddress,
} from '@/app/lib/entityHelpers'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import AlertBanner from '@/components/wallet-tracker/AlertBanner'
import TopPerformersWeek from '@/components/wallet-tracker/TopPerformersWeek'

// `/wallet-tracker` hub that sits above the existing leaderboard
// wrapper. Renders the new unified header, shared tab bar (Research
// active), an address-lookup hero, and two discovery strips
// (Featured figures + Your watchlist) to turn Wallet Tracker into a
// real hub rather than a bare leaderboard.

export default function WalletTrackerHub({ featuredFigures = [], topPerformers = [] }) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1680px',
        margin: '0 auto',
        padding: '1.5rem 1.5rem 2rem',
        color: 'var(--text-primary)',
      }}
      className="sonar-wt-hub"
    >
      <HubHeader />
      <WalletTrackerTabs activeOverride="research" />
      <HeroSearch />
      <TopPerformersWeek performers={topPerformers} />
      <FeaturedFiguresStrip figures={featuredFigures} />
      <WalletWatchlistStrip />
      <AlertBanner />
      <style>{`
        @media (min-width: 1280px) {
          .sonar-wt-hub { padding: 1.5rem 2rem 2rem; }
        }
        @media (max-width: 768px) {
          .sonar-wt-hub { padding: 1rem 1rem 1.5rem; }
        }
      `}</style>
    </div>
  )
}

function HubHeader() {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h1
        style={{
          fontSize: 'clamp(1.6rem, 3.4vw, 2.1rem)',
          fontWeight: 800,
          margin: 0,
          lineHeight: 1.1,
          color: 'var(--text-primary)',
          background: 'linear-gradient(135deg, #7af8ff 0%, #22d3ee 60%, #36a6ba 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.01em',
        }}
      >
        Whale Tracker
      </h1>
      <div
        style={{
          marginTop: '0.4rem',
          color: 'var(--text-secondary)',
          fontSize: '0.92rem',
        }}
      >
        Research wallets, track entities, follow public figures.
      </div>
    </div>
  )
}

function HeroSearch() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState(null)

  const submit = (e) => {
    e?.preventDefault?.()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Paste an address to research.')
      return
    }
    // Naive client-side validation — server / downstream page still
    // handles authoritative lookups. We just want to reject obvious
    // typos before navigating.
    const looksValid =
      /^0x[a-fA-F0-9]{40}$/.test(trimmed) || // EVM
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed) || // Solana / Base58-ish
      /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{10,87}$/.test(trimmed) // Bitcoin
    if (!looksValid) {
      setError('That does not look like a valid address.')
      return
    }
    setError(null)
    router.push(`/whale/${encodeURIComponent(trimmed)}`)
  }

  return (
    <form
      onSubmit={submit}
      style={{
        background: 'rgba(6, 14, 22, 0.6)',
        border: `1px solid ${error ? 'rgba(231, 76, 60, 0.4)' : 'rgba(34, 211, 238, 0.18)'}`,
        borderRadius: '12px',
        padding: '0.4rem 0.5rem 0.4rem 0.95rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.7rem',
        flexWrap: 'wrap',
      }}
    >
      <label
        htmlFor="wt-hero-search"
        style={{
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '1.5px',
          color: 'var(--neon-bright)',
          textTransform: 'uppercase',
          flexShrink: 0,
          fontFamily: 'var(--font-mono)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          style={{ display: 'block' }}
        >
          <path
            d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zM21 21l-4.35-4.35"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Research a wallet
      </label>
      <span
        aria-hidden
        style={{
          width: '1px',
          height: '20px',
          background: 'rgba(34, 211, 238, 0.18)',
          flexShrink: 0,
        }}
      />
      <input
        id="wt-hero-search"
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          if (error) setError(null)
        }}
        placeholder=""
        aria-label="Paste any wallet address to research"
        autoComplete="off"
        spellCheck={false}
        style={{
          flex: 1,
          minWidth: '200px',
          padding: '0.6rem 0.25rem',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: '0.92rem',
          outline: 'none',
          fontFamily: 'var(--font-mono)',
        }}
      />
      <button
        type="submit"
        style={{
          padding: '0.55rem 1.1rem',
          background: 'linear-gradient(180deg, #5dd5ed 0%, #22d3ee 100%)',
          border: '1px solid rgba(34, 211, 238, 0.5)',
          borderRadius: '8px',
          color: '#041018',
          fontSize: '0.85rem',
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.2px',
          whiteSpace: 'nowrap',
          boxShadow: '0 0 16px rgba(34, 211, 238, 0.18)',
        }}
      >
        Research →
      </button>
      {error ? (
        <div
          role="alert"
          style={{
            width: '100%',
            fontSize: '0.78rem',
            color: '#e74c3c',
            paddingLeft: '0.25rem',
          }}
        >
          {error}
        </div>
      ) : null}
    </form>
  )
}

function SectionHeader({ title, actionHref, actionLabel }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '0.65rem',
      }}
    >
      <div
        style={{
          fontSize: '0.62rem',
          fontWeight: 700,
          letterSpacing: '1.5px',
          color: 'var(--neon-bright)',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {title}
      </div>
      {actionHref ? (
        <a
          href={actionHref}
          style={{
            fontSize: '0.78rem',
            color: 'var(--neon-cyan)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          {actionLabel} →
        </a>
      ) : null}
    </div>
  )
}

function FeaturedFiguresStrip({ figures }) {
  if (!figures || figures.length === 0) return null
  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <SectionHeader
        title="Featured public figures"
        actionHref="/figures"
        actionLabel="See all"
      />
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          scrollbarWidth: 'thin',
        }}
      >
        {figures.map((f) => (
          <NextLink
            key={f.slug}
            href={`/figure/${encodeURIComponent(f.slug)}`}
            prefetch={false}
            style={{
              flex: '0 0 auto',
              width: '170px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.9rem 0.75rem',
              background: 'rgba(6, 14, 22, 0.6)',
              border: '1px solid rgba(34, 211, 238, 0.12)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              textAlign: 'center',
              transition: 'border-color 160ms ease, background 160ms ease',
            }}
          >
            <EntityAvatar
              avatarUrl={f.avatar_url}
              twitterHandle={f.twitter_handle}
              displayName={f.display_name}
              category={f.category}
              size={44}
            />
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
                wordBreak: 'break-word',
              }}
            >
              {f.display_name}
            </div>
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: categoryStyle(f.category).color,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {categoryLabel(f.category)}
            </span>
          </NextLink>
        ))}
      </div>
    </section>
  )
}

/**
 * Wallets-only watchlist strip for the Wallet Tracker hub.
 * Figures + entities live behind the "Following" tab (`/watchlist`) so the
 * hub stays focused on wallet research.
 */
function WalletWatchlistStrip() {
  const [isAuthed, setIsAuthed] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const sb = supabaseBrowser()
    const check = async () => {
      try {
        const { data } = await sb.auth.getSession()
        if (cancelled) return
        setIsAuthed(!!data?.session)
      } catch {
        if (!cancelled) setIsAuthed(false)
      }
    }
    check()
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
    let cancelled = false
    const run = async () => {
      if (isAuthed !== true) {
        setItems([])
        return
      }
      setLoading(true)
      try {
        const sb = supabaseBrowser()
        const { data } = await sb.auth.getSession()
        const token = data?.session?.access_token
        if (!token) {
          if (!cancelled) setItems([])
          return
        }
        const res = await fetch('/api/watchlist/all', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (!res.ok) return
        const json = await res.json()
        // Wallets only on the hub. Figures/entities are surfaced in the
        // "Following" tab (`/watchlist`).
        const wallets = (json?.wallets || []).slice(0, 6).map((w) => ({
          type: 'wallet',
          key: `wallet:${w.address}`,
          href: `/whale/${encodeURIComponent(w.address)}`,
          title: w.label || truncateAddress(w.address),
          subtitle: w.label ? truncateAddress(w.address) : 'Wallet',
        }))
        if (!cancelled) setItems(wallets)
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [isAuthed])

  // Hide entire section when signed out, loading-initial, or no follows.
  if (isAuthed !== true) return null
  if (loading && items.length === 0) return null
  if (items.length === 0) return null

  return (
    <section style={{ marginTop: '1.25rem', marginBottom: '1.5rem' }}>
      <SectionHeader
        title="Quick follows"
        actionHref="/watchlist"
        actionLabel="Open following"
      />
      <div
        style={{
          display: 'flex',
          gap: '0.6rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          scrollbarWidth: 'thin',
        }}
      >
        {items.map((it) => (
          <NextLink
            key={it.key}
            href={it.href}
            prefetch={false}
            style={{
              flex: '0 0 auto',
              width: '220px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.65rem 0.8rem',
              background: 'rgba(6, 14, 22, 0.6)',
              border: '1px solid rgba(34, 211, 238, 0.12)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              minWidth: 0,
              transition: 'border-color 160ms ease, background 160ms ease',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(34, 211, 238, 0.1)',
                border: '1px solid rgba(34, 211, 238, 0.25)',
                color: 'var(--neon-bright)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.72rem',
                flexShrink: 0,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {entityInitials(it.title)}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {it.title}
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {it.subtitle}
              </div>
            </div>
          </NextLink>
        ))}
      </div>
    </section>
  )
}
