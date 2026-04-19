'use client'
import React, { useEffect, useState } from 'react'
import { categoryStyle, entityInitials } from '@/app/lib/entityHelpers'

/**
 * EntityAvatar — renders a curated figure's profile picture with graceful
 * fallback to a branded initials circle.
 *
 * Resolution order:
 *   1. `avatarUrl` (curated_entities.avatar_url)
 *   2. unavatar.io Twitter proxy, if `twitterHandle` is present
 *   3. category-tinted initials circle
 *
 * Any load failure (e.g. handle doesn't exist → unavatar 404) falls back
 * to the initials circle via the <img>'s onError hook.
 */
export default function EntityAvatar({
  twitterHandle,
  avatarUrl,
  displayName,
  category,
  size = 40,
}) {
  const style = categoryStyle(category)
  const resolvedSrc =
    avatarUrl ||
    (twitterHandle
      ? `https://unavatar.io/twitter/${encodeURIComponent(twitterHandle)}?fallback=false`
      : null)

  const [errored, setErrored] = useState(false)

  useEffect(() => {
    setErrored(false)
  }, [resolvedSrc])

  const showImage = resolvedSrc && !errored

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={displayName || 'Entity avatar'}
        width={size}
        height={size}
        onError={() => setErrored(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: `2px solid ${style.border}`,
          background: style.bg,
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: style.bg,
        border: `2px solid ${style.border}`,
        color: style.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: `${Math.round(size * 0.38)}px`,
        letterSpacing: '0.5px',
        flexShrink: 0,
      }}
    >
      {entityInitials(displayName)}
    </div>
  )
}
