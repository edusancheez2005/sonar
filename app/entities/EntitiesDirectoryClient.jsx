'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  formatVolume,
  relativeTime,
  entityTypeStyle,
} from '@/app/lib/entityHelpers'
import EntityAvatar from '@/app/components/entities/EntityAvatar'
import FollowButton from '@/app/components/entities/FollowButton'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const SORT_OPTIONS = [
  { value: 'volume', label: 'Volume' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'recent', label: 'Recent activity' },
  { value: 'alphabetical', label: 'A → Z' },
  { value: 'verified', label: 'Verified first' },
]

const SEARCH_RESULT_CAP = 100
const BIG_MOVER_VOLUME_THRESHOLD = 100_000_000 // $100M

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

export default function EntitiesDirectoryClient({
  entities,
  page,
  totalPages,
  pageSize,
  sort,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState('')
  const [follows, setFollows] = useState(null) // null until we know
  const [signedIn, setSignedIn] = useState(null)

  const refreshFollows = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers) {
      setSignedIn(false)
      setFollows([])
      return
    }
    setSignedIn(true)
    try {
      const res = await fetch('/api/watchlist/entities', { headers })
      if (!res.ok) {
        setFollows([])
        return
      }
      const json = await res.json()
      setFollows(json?.follows || [])
    } catch {
      setFollows([])
    }
  }, [])

  useEffect(() => {
    refreshFollows()
  }, [refreshFollows])

  // Set of entity names the current user follows — used to render a
  // persistent ✓ badge on directory cards so followed state is obvious
  // at a glance (not just on hover).
  const followedEntityNames = useMemo(() => {
    if (!Array.isArray(follows)) return new Set()
    return new Set(
      follows
        .filter((f) => f.entity_type === 'label')
        .map((f) => f.entity_ref)
    )
  }, [follows])

  const searchActive = q.trim().length > 0
  const searchResults = useMemo(() => {
    if (!searchActive) return []
    const term = q.trim().toLowerCase()
    return entities
      .filter((e) => {
        const name = String(e.entity_name || '').toLowerCase()
        const desc = String(e.description || '').toLowerCase()
        return name.includes(term) || desc.includes(term)
      })
      .slice(0, SEARCH_RESULT_CAP)
  }, [entities, q, searchActive])

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize
    return entities.slice(start, start + pageSize)
  }, [entities, page, pageSize])

  const visible = searchActive ? searchResults : pageSlice

  // Mutate URL preserving other params. `volume`/`1` defaults are
  // dropped from the URL so shareable links stay clean.
  const pushWithParam = useCallback(
    (changes) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(changes)) {
        const isDefault =
          (k === 'sort' && v === 'volume') ||
          (k === 'page' && (v === 1 || v === '1'))
        if (v == null || v === '' || isDefault) {
          params.delete(k)
        } else {
          params.set(k, String(v))
        }
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const onSortChange = (value) => {
    // Reset to page 1 so the user isn't stranded on page 5 of a
    // different ordering.
    pushWithParam({ sort: value, page: 1 })
  }

  const onPageChange = (next) => {
    pushWithParam({ page: next })
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <>
      <Controls
        sort={sort}
        q={q}
        onQ={setQ}
        onSortChange={onSortChange}
        searchActive={searchActive}
        searchCount={searchResults.length}
        searchCap={SEARCH_RESULT_CAP}
      />

      {visible.length === 0 ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #0d2134 0%, #122a40 100%)',
            border: '1px solid rgba(54, 166, 186, 0.2)',
            borderRadius: '16px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          {searchActive
            ? `No entities match “${q}”.`
            : 'No entities to display on this page.'}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {visible.map((e) => (
            <EntityCard
              key={e.entity_name}
              entity={e}
              showFollowIcon={signedIn === true}
              isFollowed={followedEntityNames.has(e.entity_name)}
              onFollowChange={refreshFollows}
            />
          ))}
        </div>
      )}

      {!searchActive && totalPages > 1 ? (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      ) : null}
    </>
  )
}

// ─── Controls (search + sort) ───────────────────────────────────────────

function Controls({ sort, q, onQ, onSortChange, searchActive, searchCount, searchCap }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <input
        type="text"
        value={q}
        onChange={(e) => onQ(e.target.value)}
        placeholder="Search entities by name or description…"
        aria-label="Search entities"
        style={{
          flex: '1 1 240px',
          minWidth: '220px',
          padding: '0.75rem 1rem',
          background: 'rgba(54, 166, 186, 0.08)',
          border: '1px solid rgba(54, 166, 186, 0.3)',
          borderRadius: '12px',
          color: 'var(--text-primary)',
          fontSize: '0.95rem',
          outline: 'none',
        }}
      />
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
        }}
      >
        <span>Sort by</span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="Sort entities"
          style={{
            padding: '0.6rem 0.75rem',
            background: 'rgba(54, 166, 186, 0.08)',
            border: '1px solid rgba(54, 166, 186, 0.3)',
            borderRadius: '10px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {searchActive ? (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {searchCount >= searchCap
            ? `Showing first ${searchCap} matches`
            : `${searchCount} match${searchCount === 1 ? '' : 'es'}`}
        </span>
      ) : null}
    </div>
  )
}

// ─── Pagination ─────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPageChange }) {
  const canPrev = page > 1
  const canNext = page < totalPages
  return (
    <nav
      aria-label="Pagination"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        marginTop: '1.5rem',
        padding: '1rem 0',
        color: 'var(--text-secondary)',
      }}
    >
      <PagerButton disabled={!canPrev} onClick={() => canPrev && onPageChange(page - 1)}>
        ← Previous
      </PagerButton>
      <span style={{ fontSize: '0.9rem' }}>
        Page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of {totalPages}
      </span>
      <PagerButton disabled={!canNext} onClick={() => canNext && onPageChange(page + 1)}>
        Next →
      </PagerButton>
    </nav>
  )
}

function PagerButton({ disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '0.55rem 1rem',
        background: disabled ? 'rgba(54, 166, 186, 0.05)' : 'rgba(54, 166, 186, 0.15)',
        border: `1px solid ${disabled ? 'rgba(54, 166, 186, 0.15)' : 'rgba(54, 166, 186, 0.4)'}`,
        borderRadius: '10px',
        color: disabled ? 'var(--text-secondary)' : '#36a6ba',
        fontSize: '0.85rem',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

// ─── Label entity card ────────────────────────────────────────────────────

function EntityCard({ entity, showFollowIcon, isFollowed = false, onFollowChange }) {
  const [hover, setHover] = useState(false)
  const typeStyle = entityTypeStyle(entity.entity_type)
  const isTracked = entity.tracked === true
  const isVerified = entity.verified === true
  const txCount = Number(entity.tx_count || 0)
  const totalVolume = Number(entity.total_volume || 0)
  // "Big" verified entity: curated-enriched AND carries meaningful
  // on-chain activity. Gets a left-accent + roomier padding so it
  // reads as more important in the grid.
  const isBigVerified = isVerified && txCount > 100
  // Amber "BIG MOVER" pill when we can confidently assert it. We
  // don't have 30-day-windowed data handy, so we use the cumulative
  // `total_volume` threshold as an imperfect proxy — per spec, we'd
  // rather skip the pill than display something misleading, so the
  // threshold is intentionally conservative.
  const isBigMover = isVerified && totalVolume >= BIG_MOVER_VOLUME_THRESHOLD
  // Muted "Tracked but dormant" card: curated row with no on-chain
  // activity. Scale down slightly + fade so active entities dominate.
  const isDormant = isTracked && txCount === 0

  // Curated rows have their own detail page at /figure/{slug}. Pure
  // label rows route to the existing /entity/{name} lookup.
  const detailHref = entity.curated_slug
    ? `/figure/${encodeURIComponent(entity.curated_slug)}`
    : `/entity/${encodeURIComponent(entity.entity_name)}`
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        minWidth: 0,
        opacity: isDormant ? 0.78 : 1,
      }}
    >
      <a
        href={detailHref}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          background: hover
            ? 'linear-gradient(135deg, #112a40 0%, #1a3550 100%)'
            : 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
          border: hover
            ? '1px solid rgba(54, 166, 186, 0.55)'
            : isFollowed || isVerified
              ? '1px solid rgba(54, 166, 186, 0.4)'
              : '1px solid rgba(54, 166, 186, 0.2)',
          // Big verified entities get a bold 3px teal accent on the
          // left edge for instant visual hierarchy.
          borderLeft: isBigVerified
            ? '3px solid #36a6ba'
            : hover
              ? '1px solid rgba(54, 166, 186, 0.55)'
              : isFollowed || isVerified
                ? '1px solid rgba(54, 166, 186, 0.4)'
                : '1px solid rgba(54, 166, 186, 0.2)',
          borderRadius: '16px',
          padding: isBigVerified ? '1.25rem 1.35rem' : isDormant ? '0.95rem 1.1rem' : '1.2rem 1.25rem',
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
            gap: '0.75rem',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', minWidth: 0, flex: 1 }}>
            {entity.avatar_url || entity.twitter_handle ? (
              <EntityAvatar
                avatarUrl={entity.avatar_url}
                twitterHandle={entity.twitter_handle}
                displayName={entity.entity_name}
                category="company"
                size={40}
              />
            ) : null}
            <div
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                lineHeight: 1.3,
                color: 'var(--text-primary)',
                wordBreak: 'break-word',
                minWidth: 0,
                paddingRight: showFollowIcon ? '2.5rem' : 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                flexWrap: 'wrap',
              }}
            >
              <span>{entity.entity_name}</span>
              {isFollowed ? (
                <span
                  aria-label="You follow this entity"
                  title="Following"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'rgba(54, 166, 186, 0.2)',
                    border: '1px solid rgba(54, 166, 186, 0.55)',
                    color: '#36a6ba',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
              ) : null}
            </div>
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
            {entity.entity_type}
          </span>
        </div>

        {isVerified || isTracked || isBigMover ? (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {isVerified ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.18rem 0.55rem',
                  background: 'rgba(54, 166, 186, 0.15)',
                  border: '1px solid rgba(54, 166, 186, 0.45)',
                  borderRadius: '999px',
                  color: '#36a6ba',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                ✓ Verified
              </span>
            ) : null}
            {isBigMover ? (
              <span
                title={`${formatVolume(totalVolume)} tracked volume`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.18rem 0.55rem',
                  background: 'rgba(241, 196, 15, 0.15)',
                  border: '1px solid rgba(241, 196, 15, 0.5)',
                  borderRadius: '999px',
                  color: '#f1c40f',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                🔥 Big mover
              </span>
            ) : null}
            {isTracked ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.18rem 0.55rem',
                  background: 'rgba(160, 178, 198, 0.1)',
                  border: '1px solid rgba(160, 178, 198, 0.35)',
                  borderRadius: '999px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                Tracked
              </span>
            ) : null}
          </div>
        ) : null}

        {entity.description ? (
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {entity.description}
          </div>
        ) : null}

        {isTracked && entity.tx_count === 0 ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No tracked on-chain activity yet
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                fontWeight: 600,
              }}
            >
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
          </>
        )}
      </a>

      {showFollowIcon ? (
        <div
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            zIndex: 2,
            // Visible when hovered, or always visible once followed so
            // users can unfollow directly from the directory card.
            opacity: hover || isFollowed ? 1 : 0,
            transition: 'opacity 150ms ease',
            pointerEvents: hover || isFollowed ? 'auto' : 'none',
          }}
        >
          <FollowButton
            entityType="label"
            entityRef={entity.entity_name}
            variant="icon"
            onToggle={onFollowChange}
          />
        </div>
      ) : null}
    </div>
  )
}
