'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  formatVolume,
  relativeTime,
  entityTypeStyle,
  categoryStyle,
  categoryLabel,
  entityInitials,
} from '@/app/lib/entityHelpers'
import FollowButton from '@/app/components/entities/FollowButton'
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

export default function EntitiesDirectoryClient({ entities, featuredFigures }) {
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

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return entities
    return entities.filter((e) =>
      String(e.entity_name).toLowerCase().includes(term)
    )
  }, [q, entities])

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

  const showFollowed =
    signedIn === true && Array.isArray(follows) && follows.length > 0

  return (
    <>
      {showFollowed ? (
        <FollowedStrip follows={follows} onChange={refreshFollows} />
      ) : null}

      {featuredFigures && featuredFigures.length > 0 ? (
        <FeaturedFiguresStrip figures={featuredFigures} />
      ) : null}

      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search entities by name…"
          aria-label="Search entities"
          style={{
            width: '100%',
            padding: '0.9rem 1.1rem',
            background: 'rgba(54, 166, 186, 0.08)',
            border: '1px solid rgba(54, 166, 186, 0.3)',
            borderRadius: '14px',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            outline: 'none',
          }}
        />
      </div>

      {filtered.length === 0 ? (
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
          No entities match “{q}”.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {filtered.map((e) => (
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
    </>
  )
}

// ─── Featured figures strip ───────────────────────────────────────────────

function FeaturedFiguresStrip({ figures }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
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
          Featured figures
        </div>
        <a
          href="/figures"
          style={{
            fontSize: '0.82rem',
            color: '#36a6ba',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          See all →
        </a>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
        }}
      >
        {figures.map((f) => (
          <CompactFigureCard key={f.slug} f={f} />
        ))}
      </div>
    </div>
  )
}

function CompactFigureCard({ f }) {
  const style = categoryStyle(f.category)
  const addrCount = Array.isArray(f.addresses) ? f.addresses.length : 0
  return (
    <a
      href={`/figure/${encodeURIComponent(f.slug)}`}
      style={{
        flex: '0 0 auto',
        width: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '1rem',
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '16px',
        color: 'var(--text-primary)',
        textDecoration: 'none',
        textAlign: 'center',
      }}
      className="sonar-compact-figure"
    >
      <div
        aria-hidden="true"
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: style.bg,
          border: `2px solid ${style.border}`,
          color: style.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1rem',
        }}
      >
        {f.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={f.avatar_url}
            alt={f.display_name}
            width={52}
            height={52}
            style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          entityInitials(f.display_name)
        )}
      </div>
      <div
        style={{
          fontSize: '0.88rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
          wordBreak: 'break-word',
        }}
      >
        {f.display_name}
      </div>
      <div style={{ fontSize: '0.72rem', color: style.color, textTransform: 'capitalize', fontWeight: 600 }}>
        {categoryLabel(f.category)}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
        {addrCount === 0 ? 'No addresses yet' : `${addrCount} address${addrCount === 1 ? '' : 'es'}`}
      </div>
    </a>
  )
}

// ─── Followed strip ───────────────────────────────────────────────────────

function FollowedStrip({ follows, onChange }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
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
          Followed
        </div>
        <a
          href="/profile"
          style={{
            fontSize: '0.82rem',
            color: '#36a6ba',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Manage →
        </a>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
        }}
      >
        {follows.map((f) => (
          <FollowedChip key={`${f.entity_type}-${f.entity_ref}`} follow={f} onChange={onChange} />
        ))}
      </div>
    </div>
  )
}

function FollowedChip({ follow, onChange }) {
  const isCurated = follow.entity_type === 'curated'
  const href = isCurated
    ? `/figure/${encodeURIComponent(follow.entity_ref)}`
    : `/entity/${encodeURIComponent(follow.entity_ref)}`
  const displayName = isCurated
    ? follow.curated?.display_name || follow.entity_ref
    : follow.entity_ref
  const category = isCurated ? follow.curated?.category : null
  const style = isCurated ? categoryStyle(category) : entityTypeStyle('Entity')

  return (
    <a
      href={href}
      style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: '0.55rem',
        padding: '0.55rem 0.85rem',
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.25)',
        borderRadius: '999px',
        color: 'var(--text-primary)',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        maxWidth: '320px',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: style.bg,
          border: `1px solid ${style.border}`,
          color: style.color,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {entityInitials(displayName)}
      </span>
      <span
        style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {displayName}
      </span>
      <span
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'inline-flex', flexShrink: 0 }}
      >
        <FollowButton
          entityType={follow.entity_type}
          entityRef={follow.entity_ref}
          variant="icon"
          onToggle={onChange}
        />
      </span>
    </a>
  )
}

// ─── Label entity card ────────────────────────────────────────────────────

function EntityCard({ entity, showFollowIcon, isFollowed = false, onFollowChange }) {
  const [hover, setHover] = useState(false)
  const typeStyle = entityTypeStyle(entity.entity_type)
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
            : isFollowed
              ? '1px solid rgba(54, 166, 186, 0.4)'
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
