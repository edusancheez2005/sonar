'use client'
// Fixed-position popover anchored to a chip. No portal lib — uses a
// position-fixed wrapper rendered as a sibling. Caller controls open
// state. Auto-flips above when there isn't 200 px below.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TILE } from './tileTokens'

export function HoverPopover({
  anchorRef,
  open,
  onClose,
  ariaLabel,
  children,
}) {
  const popRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, flipUp: false })

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current || typeof window === 'undefined') return
    const r = anchorRef.current.getBoundingClientRect()
    const flipUp = window.innerHeight - r.bottom < 220
    const top = flipUp ? Math.max(8, r.top - 8) : r.bottom + 6
    const left = Math.max(8, Math.min(window.innerWidth - 296, r.left))
    setPos({ top, left, flipUp })
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
        try { anchorRef?.current?.focus() } catch {}
      }
    }
    const onDocClick = (e) => {
      if (popRef.current?.contains(e.target)) return
      if (anchorRef?.current?.contains(e.target)) return
      onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDocClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [open, onClose, anchorRef])

  if (!open) return null
  return (
    <div
      ref={popRef}
      role="dialog"
      aria-label={ariaLabel}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: pos.flipUp ? 'translateY(-100%)' : 'none',
        zIndex: 9999,
        maxWidth: 280,
        minWidth: 220,
        padding: '10px 12px',
        background: TILE.bgPanel,
        border: `1px solid ${TILE.cyanBorder}`,
        borderRadius: TILE.radiusPanel,
        boxShadow: TILE.shadowPanel,
        color: '#dce8f3',
        fontFamily: TILE.mono,
        fontSize: 11,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  )
}

export default HoverPopover
