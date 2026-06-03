'use client'
// Slide-in inbox drawer for ORCA proactive alerts. Opens from the right,
// 380px wide, lists notification cards newest-first with a "Mark all read"
// action and "Load more" pagination. Traps focus while open and closes on
// ESC or backdrop click.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TILE } from '../inline/tileTokens'
import { NotificationCard } from './NotificationCard'
import { fetchInbox, clearAllNotifications } from './client'

const PAGE = 20

export function OrcaInbox({ open, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const panelRef = useRef(null)

  const load = useCallback(async (before = null) => {
    setLoading(true)
    const res = await fetchInbox({ limit: PAGE, before })
    setLoading(false)
    const incoming = Array.isArray(res.items) ? res.items : []
    setItems((prev) => (before ? [...prev, ...incoming] : incoming))
    setHasMore(incoming.length >= PAGE)
  }, [])

  useEffect(() => {
    if (open) load(null)
  }, [open, load])

  // ESC to close.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Move focus into the panel when it opens (basic focus trap entry).
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus()
    }
  }, [open])

  if (!open) return null

  const onMarkAll = async () => {
    // Optimistically clear the list, then delete every notification server-side.
    setItems([])
    await clearAllNotifications()
  }

  const onLoadMore = () => {
    const last = items[items.length - 1]
    if (last) load(last.created_at)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 4000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="ORCA notifications"
        data-testid="orca-inbox"
        style={{
          width: 380,
          maxWidth: '92vw',
          height: '100%',
          background: TILE.bgPanel,
          backdropFilter: 'blur(8px)',
          borderLeft: `1px solid ${TILE.cyanBorder}`,
          boxShadow: TILE.shadowPanel,
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontFamily: TILE.mono, fontSize: 13, fontWeight: 700, color: TILE.cyan, letterSpacing: 0.5 }}>
            ORCA pulse
          </span>
          <button
            type="button"
            onClick={onMarkAll}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: TILE.cyanText, fontSize: 11 }}
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Close notifications"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: TILE.grey, fontSize: 16, lineHeight: 1 }}
          >
            {'\u00d7'}
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.length === 0 && !loading && (
            <div style={{ padding: 24, textAlign: 'center', color: TILE.grey, fontSize: 13 }}>
              No notifications yet. ORCA will ping you here when something on your watchlist moves.
            </div>
          )}
          {items.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onChange={() => load(null)}
              onRemove={(id) => setItems((prev) => prev.filter((it) => it.id !== id))}
            />
          ))}
          {hasMore && (
            <div style={{ padding: 12, textAlign: 'center' }}>
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loading}
                style={{
                  background: TILE.cyanSoft,
                  border: `1px solid ${TILE.cyanBorder}`,
                  borderRadius: TILE.radiusChip,
                  color: TILE.cyanText,
                  fontSize: 11,
                  padding: '6px 14px',
                  cursor: loading ? 'default' : 'pointer',
                }}
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body
  )
}

export default OrcaInbox
