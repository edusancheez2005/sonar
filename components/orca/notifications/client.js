'use client'
// Shared client helpers for the ORCA notifications inbox. Centralises the
// authenticated fetch (Supabase access token) so OrcaBell / OrcaInbox stay
// in sync and emit a single 'orca:notifications-changed' event after any
// mutation, which the bell listens for to refresh its unread dot.

async function authHeaders() {
  try {
    const { supabaseBrowser } = await import('@/app/lib/supabaseBrowserClient')
    const sb = supabaseBrowser()
    const { data } = await sb.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : null
  } catch {
    return null
  }
}

export function notifyChanged() {
  try {
    window.dispatchEvent(new CustomEvent('orca:notifications-changed'))
  } catch {}
}

export async function fetchInbox({ limit = 20, before = null } = {}) {
  const headers = await authHeaders()
  if (!headers) return { items: [], unread_count: 0 }
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  if (before) params.set('before', before)
  try {
    const res = await fetch(`/api/notifications/inbox?${params.toString()}`, {
      headers,
      cache: 'no-store',
    })
    if (!res.ok) return { items: [], unread_count: 0 }
    return await res.json()
  } catch {
    return { items: [], unread_count: 0 }
  }
}

export async function markRead(id) {
  const headers = await authHeaders()
  if (!headers) return false
  try {
    const res = await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    })
    if (res.ok) notifyChanged()
    return res.ok
  } catch {
    return false
  }
}

export async function markAllRead() {
  const headers = await authHeaders()
  if (!headers) return false
  try {
    const res = await fetch('/api/notifications/mark-all-read', { method: 'POST', headers })
    if (res.ok) notifyChanged()
    return res.ok
  } catch {
    return false
  }
}

export function reaskFromPayload(payload) {
  // Bridges a notification's stored reask hint into the same orca:reask event
  // NewsCard uses, so clicking "Open in ORCA" deep-links into the copilot.
  const reask = payload && payload.reask
  if (!reask) return false
  try {
    const detail =
      reask.intent === 'article_explain'
        ? { intent: 'article_explain', url: reask.url, headline: reask.prompt }
        : { intent: reask.intent, prompt: reask.prompt }
    return window.dispatchEvent(new CustomEvent('orca:reask', { detail }))
  } catch {
    return false
  }
}
