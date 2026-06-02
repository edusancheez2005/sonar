'use client'
// A single notification row inside the ORCA inbox drawer. A left stripe is
// colour-coded by kind. Two actions: "Open in ORCA →" (deep-links via the
// orca:reask event) and "Dismiss" (marks the single notification read).
import React from 'react'
import { TILE } from '../inline/tileTokens'
import { markRead, openNotificationInOrca } from './client'

const STRIPE_BY_KIND = {
  price_move: TILE.cyan,
  whale_flow: TILE.green,
  signal_flip: '#a78bfa',
  news_high_impact: '#fbbf24',
}

function relativeTime(iso) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}

export function NotificationCard({ notification, onChange }) {
  const { id, kind, title, body, read_at, created_at } = notification || {}
  const stripe = STRIPE_BY_KIND[kind] || TILE.grey
  const unread = !read_at

  const onOpen = async (e) => {
    e.preventDefault()
    if (unread) {
      await markRead(id)
      if (onChange) onChange()
    }
    openNotificationInOrca(notification)
  }

  const onDismiss = async (e) => {
    e.preventDefault()
    await markRead(id)
    if (onChange) onChange()
  }

  return (
    <div
      data-testid="notification-card"
      style={{
        display: 'flex',
        gap: 10,
        padding: '12px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: unread ? 'rgba(0,229,255,0.04)' : 'transparent',
      }}
    >
      <div style={{ width: 3, alignSelf: 'stretch', background: stripe, borderRadius: 2, flex: '0 0 auto' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: TILE.mono, fontSize: 13, color: '#e9eef5', lineHeight: 1.35 }}>{title}</div>
        <div style={{ fontSize: 12, color: TILE.grey, marginTop: 3, lineHeight: 1.4 }}>{body}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 7 }}>
          <button
            type="button"
            onClick={onOpen}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: TILE.cyanText,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {'Open in ORCA \u2192'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: TILE.grey, fontSize: 11 }}
          >
            Dismiss
          </button>
          <span style={{ marginLeft: 'auto', color: '#5b6675', fontSize: 10 }}>{relativeTime(created_at)}</span>
        </div>
      </div>
    </div>
  )
}

export default NotificationCard
