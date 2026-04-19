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

// `/wallet-tracker` hub that sits above the existing leaderboard
// wrapper. Renders the new unified header, shared tab bar (Research
// active), an address-lookup hero, and two discovery strips
// (Featured figures + Your watchlist) to turn Wallet Tracker into a
// real hub rather than a bare leaderboard.

export default function WalletTrackerHub({ featuredFigures = [] }) {
  return (
    <div
      style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 2rem',
        color: 'var(--text-primary)',
      }}
      className="sonar-wt-hub"
    >
      <HubHeader />
      <WalletTrackerTabs activeOverride="research" />
      <HeroSearch />
      <FeaturedFiguresStrip figures={featuredFigures} />
      <WatchlistPreviewStrip />
      <style>{`
        @media (max-width: 768px) {
          .sonar-wt-hub { padding: 0 1rem; }
        }
      `}</style>
    </div>
  )
}

function HubHeader() {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0d2134 0%, #1a2f42 100%)',
        border: '1px solid rgba(54, 166, 186, 0.25)',
        borderRadius: '20px',
        padding: '1.75rem',
        marginTop: '2rem',
        marginBottom: '1.25rem',
      }}
    >
      <h1
        style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          fontWeight: 800,
          marginBottom: '0.35rem',
          color: 'var(--text-primary)',
          background: 'linear-gradient(135deg, #00e5ff, #36a6ba, #00d4aa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Wallet Tracker
      </h1>
      <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
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
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.25)',
        borderRadius: '18px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}
    >
      <label
        htmlFor="wt-hero-search"
        style={{
          display: 'block',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '1px',
          color: '#36a6ba',
          textTransform: 'uppercase',
          marginBottom: '0.6rem',
        }}
      >
        Research a wallet
      </label>
      <div
        style={{
          display: 'flex',
          gap: '0.6rem',
          alignItems: 'stretch',
          flexWrap: 'wrap',
        }}
      >
        <input
          id="wt-hero-search"
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Paste any wallet address to research"
          aria-label="Paste any wallet address to research"
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1,
            minWidth: '240px',
            padding: '0.9rem 1.1rem',
            background: 'rgba(54, 166, 186, 0.08)',
            border: `1px solid ${error ? 'rgba(231, 76, 60, 0.55)' : 'rgba(54, 166, 186, 0.3)'}`,
            borderRadius: '14px',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            outline: 'none',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.9rem 1.6rem',
            background: 'linear-gradient(135deg, #36a6ba 0%, #2980b9 100%)',
            border: '1px solid rgba(54, 166, 186, 0.6)',
            borderRadius: '14px',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(54, 166, 186, 0.25)',
          }}
        >
          Research →
        </button>
      </div>
      {error ? (
        <div
          role="alert"
          style={{
            marginTop: '0.5rem',
            fontSize: '0.8rem',
            color: '#e74c3c',
          }}
        >
          {error}
        </div>
      ) : (
        <div
          style={{
            marginTop: '0.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          Supports Ethereum, Bitcoin, Solana, Polygon, Arbitrum, Base.
        </div>
      )}
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
        marginBottom: '0.75rem',
      }}
    >
      <div
        style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '1px',
          color: '#36a6ba',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>
      {actionHref ? (
        <a
          href={actionHref}
          style={{
            fontSize: '0.82rem',
            color: '#36a6ba',
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
              width: '200px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.55rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
              border: '1px solid rgba(54, 166, 186, 0.2)',
              borderRadius: '16px',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            <EntityAvatar
              avatarUrl={f.avatar_url}
              twitterHandle={f.twitter_handle}
              displayName={f.display_name}
              category={f.category}
              size={56}
            />
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
                wordBreak: 'break-word',
              }}
            >
              {f.display_name}
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: categoryStyle(f.category).color,
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

function WatchlistPreviewStrip() {
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
        // Figures first, then entities, then wallets — first 6 total.
        const merged = [
          ...(json?.figures || []).map((f) => ({
            type: 'figure',
            key: `figure:${f.slug}`,
            href: `/figure/${encodeURIComponent(f.slug)}`,
            title: f.display_name,
            subtitle: categoryLabel(f.category),
            avatar: f,
          })),
          ...(json?.entities || []).map((e) => ({
            type: 'entity',
            key: `entity:${e.entity_name}`,
            href: `/entity/${encodeURIComponent(e.entity_name)}`,
            title: e.entity_name,
            subtitle: `${(e.tx_count || 0).toLocaleString()} txs`,
          })),
          ...(json?.wallets || []).map((w) => ({
            type: 'wallet',
            key: `wallet:${w.address}`,
            href: `/whale/${encodeURIComponent(w.address)}`,
            title: w.label || truncateAddress(w.address),
            subtitle: w.label ? truncateAddress(w.address) : 'Wallet',
          })),
        ].slice(0, 6)
        if (!cancelled) setItems(merged)
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
    <section style={{ marginBottom: '1.5rem' }}>
      <SectionHeader
        title="Your watchlist"
        actionHref="/watchlist"
        actionLabel="Manage"
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
              gap: '0.65rem',
              padding: '0.75rem 0.9rem',
              background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
              border: '1px solid rgba(54, 166, 186, 0.2)',
              borderRadius: '14px',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              minWidth: 0,
            }}
          >
            {it.type === 'figure' && it.avatar ? (
              <EntityAvatar
                avatarUrl={it.avatar.avatar_url}
                twitterHandle={it.avatar.twitter_handle}
                displayName={it.avatar.display_name}
                category={it.avatar.category}
                size={36}
              />
            ) : (
              <div
                aria-hidden="true"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(54, 166, 186, 0.15)',
                  border: '1px solid rgba(54, 166, 186, 0.3)',
                  color: '#36a6ba',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  flexShrink: 0,
                }}
              >
                {entityInitials(it.title)}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
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
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
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
