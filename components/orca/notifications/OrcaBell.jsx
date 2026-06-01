'use client'
// Cyan bell in the global nav. Shows an unread dot when the user has
// unread ORCA notifications. Polls the inbox every 60s and also refreshes
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
    window.addEventListener('orca:notifications-changed', onChanged)
    return () => {
      clearInterval(id)
      window.removeEventListener('orca:notifications-changed', onChanged)
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
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: TILE.cyan,
              boxShadow: '0 0 6px rgba(0,229,255,0.8)',
            }}
          />
        )}
      </button>
      <OrcaInbox open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export default OrcaBell
