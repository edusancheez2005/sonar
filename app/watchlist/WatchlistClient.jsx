'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import EntityAvatar from '@/app/components/entities/EntityAvatar'
import {
  categoryStyle,
  categoryLabel,
  entityTypeStyle,
  inferEntityType,
  formatVolume,
  relativeTime,
  truncateAddress,
} from '@/app/lib/entityHelpers'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

async function getAuthHeaders() {
  try {
    const sb = supabaseBrowser()
    const { data } = await sb.auth.getSession()
    const token = data?.session?.access_token
    if (!token) return null
    return { Authorization: `Bearer ${token}` }
  } catch {
    return null
  }
}

const INNER_TABS = [
  { id: 'figures', label: 'Figures' },
  { id: 'entities', label: 'Entities' },
  { id: 'wallets', label: 'Wallets' },
]

const DEFAULT_INNER_TAB = 'figures'

function normalizeInnerTab(val) {
  return INNER_TABS.some((t) => t.id === val) ? val : DEFAULT_INNER_TAB
}

export default function WatchlistClient() {
  const [signedIn, setSignedIn] = useState(null) // null = unknown
  const [loading, setLoading] = useState(true)
  const [figures, setFigures] = useState([])
  const [entities, setEntities] = useState([])
  const [wallets, setWallets] = useState([])

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = normalizeInnerTab(searchParams.get('tab'))

  const setActiveTab = useCallback(
    (id) => {
      const nextId = normalizeInnerTab(id)
      const params = new URLSearchParams(searchParams.toString())
      if (nextId === DEFAULT_INNER_TAB) {
        params.delete('tab')
      } else {
        params.set('tab', nextId)
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const load = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers) {
      setSignedIn(false)
      setLoading(false)
      return
    }
    setSignedIn(true)
    try {
      const res = await fetch('/api/watchlist/all', { headers })
      if (!res.ok) {
        setLoading(false)
        return
      }
      const json = await res.json()
      setFigures(json?.figures || [])
      setEntities(json?.entities || [])
      setWallets(json?.wallets || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const unfollowFigure = async (slug) => {
    const prev = figures
    setFigures((list) => list.filter((f) => f.slug !== slug))
    const headers = await getAuthHeaders()
    if (!headers) {
      setFigures(prev)
      return
    }
    try {
      const res = await fetch('/api/watchlist/entity', {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: 'curated', entity_ref: slug }),
      })
      if (!res.ok) throw new Error('delete failed')
    } catch {
      setFigures(prev)
    }
  }

  const unfollowEntity = async (name) => {
    const prev = entities
    setEntities((list) => list.filter((e) => e.entity_name !== name))
    const headers = await getAuthHeaders()
    if (!headers) {
      setEntities(prev)
      return
    }
    try {
      const res = await fetch('/api/watchlist/entity', {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: 'label', entity_ref: name }),
      })
      if (!res.ok) throw new Error('delete failed')
    } catch {
      setEntities(prev)
    }
  }

  const unfollowWallet = async (address) => {
    const prev = wallets
    setWallets((list) => list.filter((w) => w.address !== address))
    const headers = await getAuthHeaders()
    if (!headers) {
      setWallets(prev)
      return
    }
    try {
      const res = await fetch(
        `/api/wallet-tracker/follows/${encodeURIComponent(address)}`,
        { method: 'DELETE', headers }
      )
      if (!res.ok) throw new Error('delete failed')
    } catch {
      setWallets(prev)
    }
  }

  const counts = useMemo(
    () => ({
      figures: figures.length,
      entities: entities.length,
      wallets: wallets.length,
    }),
    [figures.length, entities.length, wallets.length]
  )

  if (signedIn === false) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
          border: '1px solid rgba(54, 166, 186, 0.2)',
          borderRadius: '16px',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          color: 'var(--text-secondary)',
        }}
      >
        Sign in to see your watchlist.
      </div>
    )
  }

  if (loading) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
          border: '1px solid rgba(54, 166, 186, 0.2)',
          borderRadius: '16px',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          color: 'var(--text-secondary)',
        }}
      >
        Loading your watchlist…
      </div>
    )
  }

  return (
    <>
      <InnerTabs active={activeTab} counts={counts} onChange={setActiveTab} />

      {activeTab === 'figures' ? (
        <TabPanel
          id="figures"
          emptyLabel="figures"
          emptyBrowseHref="/figures"
          emptyBrowseLabel="the Figures tab"
          count={counts.figures}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem',
            }}
          >
            {figures.map((f) => (
              <FigureCard
                key={f.slug}
                f={f}
                onUnfollow={() => unfollowFigure(f.slug)}
              />
            ))}
          </div>
        </TabPanel>
      ) : null}

      {activeTab === 'entities' ? (
        <TabPanel
          id="entities"
          emptyLabel="entities"
          emptyBrowseHref="/entities"
          emptyBrowseLabel="the Entities tab"
          count={counts.entities}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {entities.map((e) => (
              <EntityCard
                key={e.entity_name}
                entity={e}
                onUnfollow={() => unfollowEntity(e.entity_name)}
              />
            ))}
          </div>
        </TabPanel>
      ) : null}

      {activeTab === 'wallets' ? (
        <TabPanel
          id="wallets"
          emptyLabel="wallets"
          emptyBrowseHref="/wallet-tracker"
          emptyBrowseLabel="the Research tab"
          count={counts.wallets}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {wallets.map((w) => (
              <WalletRow
                key={w.address}
                w={w}
                onUnfollow={() => unfollowWallet(w.address)}
              />
            ))}
          </div>
        </TabPanel>
      ) : null}
    </>
  )
}

// ─── Inner tab bar ───────────────────────────────────────────────────────

function InnerTabs({ active, counts, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Watchlist sections"
      style={{
        display: 'flex',
        gap: '0.25rem',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        marginBottom: '1.25rem',
        borderBottom: '1px solid rgba(54, 166, 186, 0.12)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      className="sonar-watchlist-inner-tabs"
    >
      {INNER_TABS.map((t) => {
        const isActive = active === t.id
        const count = counts[t.id] || 0
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            style={{
              flexShrink: 0,
              padding: '0.6rem 1rem',
              fontSize: '0.9rem',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#36a6ba' : 'var(--text-secondary)',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${isActive ? '#36a6ba' : 'transparent'}`,
              marginBottom: '-1px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'color 160ms ease',
            }}
          >
            {t.label}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '22px',
                height: '20px',
                padding: '0 6px',
                borderRadius: '999px',
                background: isActive
                  ? 'rgba(54, 166, 186, 0.2)'
                  : 'rgba(160, 178, 198, 0.12)',
                border: isActive
                  ? '1px solid rgba(54, 166, 186, 0.45)'
                  : '1px solid rgba(160, 178, 198, 0.25)',
                color: isActive ? '#36a6ba' : 'var(--text-secondary)',
                fontSize: '0.72rem',
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {count}
            </span>
          </button>
        )
      })}
      <style>{`
        .sonar-watchlist-inner-tabs::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

// ─── Tab panel w/ empty state ────────────────────────────────────────────

function TabPanel({ id, children, count, emptyLabel, emptyBrowseHref, emptyBrowseLabel }) {
  if (count === 0) {
    return (
      <section role="tabpanel" aria-labelledby={`tab-${id}`}>
        <div
          style={{
            background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
            border: '1px solid rgba(54, 166, 186, 0.2)',
            borderRadius: '16px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            Not tracking any {emptyLabel} yet.
          </div>
          <div style={{ fontSize: '0.88rem' }}>
            Browse{' '}
            <a
              href={emptyBrowseHref}
              style={{ color: '#36a6ba', textDecoration: 'none', fontWeight: 600 }}
            >
              {emptyBrowseLabel}
            </a>{' '}
            to start.
          </div>
        </div>
      </section>
    )
  }
  return (
    <section role="tabpanel" aria-labelledby={`tab-${id}`}>
      {children}
    </section>
  )
}

// ─── Unfollow pill ───────────────────────────────────────────────────────

function UnfollowPill({ onClick }) {
  const [hover, setHover] = useState(false)
  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onClick?.()
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={hover ? 'Unfollow' : 'Following'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.35rem 0.8rem',
        background: hover ? 'rgba(231, 76, 60, 0.12)' : 'rgba(54, 166, 186, 0.15)',
        border: `1px solid ${
          hover ? 'rgba(231, 76, 60, 0.6)' : 'rgba(54, 166, 186, 0.55)'
        }`,
        borderRadius: '999px',
        color: hover ? '#e74c3c' : '#36a6ba',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.2px',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        whiteSpace: 'nowrap',
      }}
    >
      {hover ? 'Unfollow' : '✓ Following'}
    </button>
  )
}

// ─── Figure card ─────────────────────────────────────────────────────────

function FigureCard({ f, onUnfollow }) {
  const [hover, setHover] = useState(false)
  const style = categoryStyle(f.category)
  const addrCount = Array.isArray(f.addresses) ? f.addresses.length : 0
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', minWidth: 0 }}
    >
      <a
        href={`/figure/${encodeURIComponent(f.slug)}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          background: hover
            ? 'linear-gradient(135deg, #112a40 0%, #1a3550 100%)'
            : 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
          border: hover
            ? '1px solid rgba(54, 166, 186, 0.55)'
            : '1px solid rgba(54, 166, 186, 0.2)',
          borderRadius: '18px',
          padding: '1.35rem 1.25rem',
          textDecoration: 'none',
          color: 'var(--text-primary)',
          minWidth: 0,
          transform: hover ? 'scale(1.02) translateY(-2px)' : 'scale(1) translateY(0)',
          boxShadow: hover
            ? '0 8px 24px rgba(54, 166, 186, 0.18)'
            : '0 2px 6px rgba(0, 0, 0, 0.15)',
          transition: 'all 160ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 0 }}>
          <EntityAvatar
            avatarUrl={f.avatar_url}
            twitterHandle={f.twitter_handle}
            displayName={f.display_name}
            category={f.category}
            size={64}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: '1.125rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
                marginBottom: '0.3rem',
                wordBreak: 'break-word',
                paddingRight: '5.5rem',
              }}
            >
              {f.display_name}
            </div>
            <span
              style={{
                display: 'inline-block',
                padding: '0.18rem 0.55rem',
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: '999px',
                color: style.color,
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'capitalize',
              }}
            >
              {categoryLabel(f.category)}
            </span>
          </div>
        </div>

        {f.twitter_handle ? (
          <div style={{ fontSize: '0.8rem' }}>
            <span style={{ color: '#36a6ba', fontWeight: 600 }}>
              @{f.twitter_handle}
            </span>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid rgba(54, 166, 186, 0.12)',
            paddingTop: '0.6rem',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
          }}
        >
          {addrCount === 0
            ? 'No verified addresses yet'
            : `${addrCount} tracked address${addrCount === 1 ? '' : 'es'}`}
        </div>
      </a>

      <div
        style={{
          position: 'absolute',
          top: '0.9rem',
          right: '0.9rem',
          zIndex: 2,
        }}
      >
        <UnfollowPill onClick={onUnfollow} />
      </div>
    </div>
  )
}

// ─── Entity card ─────────────────────────────────────────────────────────

function EntityCard({ entity, onUnfollow }) {
  const [hover, setHover] = useState(false)
  const type = inferEntityType(entity.entity_name)
  const typeStyle = entityTypeStyle(type)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', minWidth: 0 }}
    >
      <a
        href={`/entity/${encodeURIComponent(entity.entity_name)}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          background: hover
            ? 'linear-gradient(135deg, #112a40 0%, #1a3550 100%)'
            : 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
          border: hover
            ? '1px solid rgba(54, 166, 186, 0.55)'
            : '1px solid rgba(54, 166, 186, 0.2)',
          borderRadius: '16px',
          padding: '1.2rem 1.25rem',
          color: 'var(--text-primary)',
          textDecoration: 'none',
          transform: hover ? 'scale(1.02) translateY(-2px)' : 'scale(1) translateY(0)',
          boxShadow: hover
            ? '0 8px 24px rgba(54, 166, 186, 0.18)'
            : '0 2px 6px rgba(0, 0, 0, 0.15)',
          transition: 'all 160ms ease',
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              lineHeight: 1.3,
              color: 'var(--text-primary)',
              wordBreak: 'break-word',
              minWidth: 0,
              paddingRight: '6rem',
            }}
          >
            {entity.entity_name}
          </div>
          <span
            style={{
              flexShrink: 0,
              padding: '0.25rem 0.6rem',
              background: typeStyle.bg,
              border: `1px solid ${typeStyle.border}`,
              borderRadius: '999px',
              color: typeStyle.color,
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
            }}
          >
            {type}
          </span>
        </div>

        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          {entity.tx_count.toLocaleString()} transactions
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {formatVolume(entity.total_volume)} tracked volume
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Active on {entity.chain_count} chain
          {entity.chain_count === 1 ? '' : 's'}
        </div>
        <div
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            marginTop: '0.15rem',
            borderTop: '1px solid rgba(54, 166, 186, 0.12)',
            paddingTop: '0.55rem',
          }}
        >
          Last activity {relativeTime(entity.last_active)}
        </div>
      </a>

      <div
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          zIndex: 2,
        }}
      >
        <UnfollowPill onClick={onUnfollow} />
      </div>
    </div>
  )
}

// ─── Wallet row ──────────────────────────────────────────────────────────

function WalletRow({ w, onUnfollow }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', minWidth: 0 }}
    >
      <a
        href={`/whale/${encodeURIComponent(w.address)}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: hover
            ? 'linear-gradient(135deg, #112a40 0%, #1a3550 100%)'
            : 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
          border: hover
            ? '1px solid rgba(54, 166, 186, 0.55)'
            : '1px solid rgba(54, 166, 186, 0.2)',
          borderRadius: '12px',
          padding: '0.7rem 1rem',
          color: 'var(--text-primary)',
          textDecoration: 'none',
          transition: 'all 160ms ease',
          minWidth: 0,
          paddingRight: '7rem',
        }}
      >
        <div
          style={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            flexShrink: 0,
          }}
        >
          {truncateAddress(w.address)}
        </div>

        {w.label ? (
          <div
            style={{
              fontSize: '0.82rem',
              color: '#36a6ba',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              flex: 1,
            }}
          >
            {w.label}
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }} />
        )}

        <div
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {w.last_active
            ? `Last activity ${relativeTime(w.last_active)}`
            : 'No recent activity'}
        </div>
      </a>

      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: '0.75rem',
          transform: 'translateY(-50%)',
          zIndex: 2,
        }}
      >
        <UnfollowPill onClick={onUnfollow} />
      </div>
    </div>
  )
}
