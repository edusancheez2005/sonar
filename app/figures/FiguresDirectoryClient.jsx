'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import EntityAvatar from '@/app/components/entities/EntityAvatar'
import { categoryStyle, categoryLabel } from '@/app/lib/entityHelpers'
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

export default function FiguresDirectoryClient({ figures }) {
  const [followedSlugs, setFollowedSlugs] = useState(new Set())

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

  if (figures.length === 0) {
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
        No public figures seeded yet.
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1rem',
      }}
    >
      {enriched.map((f) => (
        <FigureCard key={f.slug} f={f} />
      ))}
    </div>
  )
}

function FigureCard({ f }) {
  const [hover, setHover] = useState(false)
  const style = categoryStyle(f.category)
  const addrCount = Array.isArray(f.addresses) ? f.addresses.length : 0
  const isFollowed = !!f._isFollowed
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
          : isFollowed
            ? '1px solid rgba(54, 166, 186, 0.4)'
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
