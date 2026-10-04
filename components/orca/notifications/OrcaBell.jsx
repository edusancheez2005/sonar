'use client'
// Cyan bell in the global nav. Shows a numeric unread badge (9+ cap) when the
// user has unread ORCA notifications. Polls the inbox every 60s and also refreshes
// on the 'orca:notifications-changed' event so the dot clears instantly
// after marking read. Clicking opens the OrcaInbox drawer.
import React, { useCallback, useEffect, useState } from 'react'
import { TILE } from '../inline/tileTokens'
import { fetchInbox } from './client'
import { OrcaInbox } from './OrcaInbox'

const POLL_MS = 60_000

export function OrcaBell() {
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const refresh = useCallback(async () => {
    const res = await fetchInbox({ limit: 1 })
    setUnread(Number(res?.unread_count) || 0)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    refresh()
    const id = setInterval(refresh, POLL_MS)
    const onChanged = () => refresh()
    // Tab comes back into view → refresh at once, so an alert that fired
    // while the user was away shows the moment they return (not up to 60s).
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('orca:notifications-changed', onChanged)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      window.removeEventListener('orca:notifications-changed', onChanged)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [mounted, refresh])

  // Refresh once when the drawer closes (cards may have been read).
  useEffect(() => {
    if (!open) refresh()
  }, [open, refresh])

  if (!mounted) return null

  const hasUnread = unread > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={hasUnread ? `Notifications, ${unread} unread` : 'Notifications'}
        data-testid="orca-bell"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 34,
          height: 34,
          borderRadius: 8,
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer',
          color: hasUnread ? TILE.cyan : TILE.grey,
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {hasUnread && (
          <span
            data-testid="orca-bell-dot"
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              boxSizing: 'border-box',
              borderRadius: 9,
              background: TILE.cyan,
              color: '#04202a',
              fontSize: 10.5,
              fontWeight: 700,
              lineHeight: '18px',
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
              boxShadow: '0 0 0 2px #0b1118, 0 0 8px rgba(0,229,255,0.55)',
              pointerEvents: 'none',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <OrcaInbox open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export default OrcaBell
