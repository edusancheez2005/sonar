'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import EntityAvatar from '@/app/components/entities/EntityAvatar'
import { categoryStyle, categoryLabel } from '@/app/lib/entityHelpers'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'recent', label: 'Recent' },
  { value: 'alphabetical', label: 'A → Z' },
  { value: 'category', label: 'Category' },
]

const SEARCH_RESULT_CAP = 100

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

export default function FiguresDirectoryClient({
  figures,
  page,
  totalPages,
  pageSize,
  sort,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [followedSlugs, setFollowedSlugs] = useState(new Set())
  const [q, setQ] = useState('')

  const refreshFollows = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers) {
      setFollowedSlugs(new Set())
      return
    }
    try {
      const res = await fetch('/api/watchlist/entities', { headers })
      if (!res.ok) return
      const json = await res.json()
      const slugs = (json?.follows || [])
        .filter((f) => f.entity_type === 'curated')
        .map((f) => f.entity_ref)
      setFollowedSlugs(new Set(slugs))
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    refreshFollows()
  }, [refreshFollows])

  const enriched = useMemo(
    () => figures.map((f) => ({ ...f, _isFollowed: followedSlugs.has(f.slug) })),
    [figures, followedSlugs]
  )

  // While a search query is present, bypass pagination entirely and
  // show up to SEARCH_RESULT_CAP matches. Sort selection is preserved
  // (the `figures` prop is already server-sorted).
  const searchActive = q.trim().length > 0
  const searchResults = useMemo(() => {
    if (!searchActive) return []
    const term = q.trim().toLowerCase()
    return enriched
      .filter((f) => {
        const name = String(f.display_name || '').toLowerCase()
        const handle = String(f.twitter_handle || '').toLowerCase()
        const desc = String(f.description || '').toLowerCase()
        return name.includes(term) || handle.includes(term) || desc.includes(term)
      })
      .slice(0, SEARCH_RESULT_CAP)
  }, [enriched, q, searchActive])

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize
    return enriched.slice(start, start + pageSize)
  }, [enriched, page, pageSize])

  const visible = searchActive ? searchResults : pageSlice

  // Mutate the current URL preserving everything except the one key
  // we're changing. router.replace is used for search/filter so we
  // don't flood history with intermediate states.
  const pushWithParam = useCallback(
    (changes) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(changes)) {
        if (v == null || v === '' || v === 'featured' || v === 1 || v === '1') {
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
    // Sort change resets the page so the user isn't left on page 5 of
    // a completely different ordering.
    pushWithParam({ sort: value, page: 1 })
  }

  const onPageChange = (next) => {
    pushWithParam({ page: next })
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (figures.length === 0) {
    return (
      <EmptyCard message="No public figures seeded yet." />
    )
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
        <EmptyCard
          message={
            searchActive ? `No figures match “${q}”.` : 'No figures on this page.'
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}
        >
          {visible.map((f) => (
            <FigureCard key={f.slug} f={f} />
          ))}
        </div>
      )}

      {!searchActive && totalPages > 1 ? (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      ) : null}
    </>
  )
}

// ─── Controls (sort + search) ────────────────────────────────────────────

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
        placeholder="Search figures by name, @handle, or keyword…"
        aria-label="Search figures"
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
          aria-label="Sort figures"
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

// ─── Pagination ──────────────────────────────────────────────────────────

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

function EmptyCard({ message }) {
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
      {message}
    </div>
  )
}

// ─── Figure card ─────────────────────────────────────────────────────────

function FigureCard({ f }) {
  const [hover, setHover] = useState(false)
  const style = categoryStyle(f.category)
  const addrCount = Array.isArray(f.addresses) ? f.addresses.length : 0
  const isFollowed = !!f._isFollowed
  const isFeatured = !!f.is_featured
  return (
    <a
      href={`/figure/${encodeURIComponent(f.slug)}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        background: hover
          ? 'linear-gradient(135deg, #112a40 0%, #1a3550 100%)'
          : 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: hover
          ? '1px solid rgba(54, 166, 186, 0.55)'
          : isFollowed || isFeatured
            ? '1px solid rgba(54, 166, 186, 0.4)'
            : '1px solid rgba(54, 166, 186, 0.2)',
        // Featured figures get a subtle teal accent on the left edge —
        // cheaper than adding another card variant.
        borderLeft: isFeatured
          ? '3px solid #36a6ba'
          : hover
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
      {isFollowed ? (
        <span
          aria-label="You follow this figure"
          title="Following"
          style={{
            position: 'absolute',
            top: '0.85rem',
            right: '0.85rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'rgba(54, 166, 186, 0.2)',
            border: '1px solid rgba(54, 166, 186, 0.55)',
            color: '#36a6ba',
            fontSize: '0.72rem',
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          ✓
        </span>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 0 }}>
        <EntityAvatar
          avatarUrl={f.avatar_url}
          twitterHandle={f.twitter_handle}
          displayName={f.display_name}
          category={f.category}
          size={40}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '1.125rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              marginBottom: '0.3rem',
              wordBreak: 'break-word',
              paddingRight: isFollowed ? '1.75rem' : 0,
            }}
          >
            {f.display_name}
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
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
            {isFeatured ? (
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.18rem 0.55rem',
                  background: 'rgba(241, 196, 15, 0.12)',
                  border: '1px solid rgba(241, 196, 15, 0.4)',
                  borderRadius: '999px',
                  color: '#f1c40f',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
              >
                ★ FEATURED
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {f.description ? (
        <div
          style={{
            fontSize: '0.86rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {f.description}
        </div>
      ) : null}

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
  )
}
