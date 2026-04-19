'use client'
import React, { useCallback, useEffect, useState } from 'react'
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

/**
 * FollowButton — toggle Sonar watchlist for either a label-aggregated
 * entity (`entity_type="label"`, ref = label string) or a curated figure
 * (`entity_type="curated"`, ref = slug).
 *
 * variant="full"     → pill-shaped "+ Follow" / "✓ Following" (default)
 * variant="icon"     → compact heart icon for card hover-reveal
 */
export default function FollowButton({
  entityType,
  entityRef,
  variant = 'full',
  onToggle,
}) {
  const [signedIn, setSignedIn] = useState(null) // null=unknown, bool once loaded
  const [followed, setFollowed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hover, setHover] = useState(false)

  const refresh = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers) {
      setSignedIn(false)
      return
    }
    setSignedIn(true)
    try {
      const res = await fetch('/api/watchlist/entities', { headers })
      if (!res.ok) return
      const json = await res.json()
      const list = json?.follows || []
      setFollowed(
        list.some(
          (r) => r.entity_type === entityType && r.entity_ref === entityRef
        )
      )
    } catch {
      // silent
    }
  }, [entityType, entityRef])

  useEffect(() => {
    refresh()
  }, [refresh])

  const toggle = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!signedIn || busy) return
    const headers = await getAuthHeaders()
    if (!headers) return

    const nowFollowed = !followed
    setFollowed(nowFollowed) // optimistic
    setBusy(true)
    try {
      const res = await fetch('/api/watchlist/entity', {
        method: nowFollowed ? 'POST' : 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_ref: entityRef,
        }),
      })
      if (!res.ok) throw new Error('request failed')
      if (onToggle) onToggle(nowFollowed)
    } catch {
      // revert
      setFollowed(!nowFollowed)
    } finally {
      setBusy(false)
    }
  }

  if (signedIn === null) {
    // While we don't know, reserve layout space to avoid jank.
    if (variant === 'icon') {
      return <span style={{ display: 'inline-block', width: 24, height: 24 }} />
    }
    return (
      <span
        style={{
          display: 'inline-block',
          height: '34px',
          width: '110px',
          borderRadius: '999px',
        }}
      />
    )
  }

  if (!signedIn) return null

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={followed ? 'Unfollow entity' : 'Follow entity'}
        title={followed ? 'Unfollow entity' : 'Follow entity'}
        style={{
          background: followed
            ? 'rgba(54, 166, 186, 0.2)'
            : hover
            ? 'rgba(54, 166, 186, 0.12)'
            : 'rgba(13, 33, 52, 0.6)',
          border: `1px solid ${
            followed ? 'rgba(54, 166, 186, 0.6)' : 'rgba(54, 166, 186, 0.35)'
          }`,
          borderRadius: '999px',
          width: '28px',
          height: '28px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: followed ? '#36a6ba' : 'var(--text-secondary)',
          cursor: busy ? 'wait' : 'pointer',
          padding: 0,
          transition: 'all 150ms ease',
          fontSize: '0.85rem',
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {followed ? '✓' : '+'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={busy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.5rem 1.1rem',
        background: followed
          ? hover
            ? 'rgba(54, 166, 186, 0.32)'
            : 'rgba(54, 166, 186, 0.2)'
          : hover
          ? '#36a6ba'
          : 'transparent',
        border: '1px solid #36a6ba',
        borderRadius: '999px',
        color: followed ? '#36a6ba' : hover ? '#0a1621' : '#36a6ba',
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '0.2px',
        cursor: busy ? 'wait' : 'pointer',
        transition: 'all 150ms ease',
        whiteSpace: 'nowrap',
      }}
    >
      {followed ? '✓ Following' : '+ Follow'}
    </button>
  )
}
