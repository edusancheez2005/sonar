'use client'
/**
 * Client funnel helper — `track('welcome_choice', { choice: 'tour' })`.
 * Posts to /api/track with the session JWT when there is one (so the event is
 * attributed), anonymously otherwise. keepalive lets the beacon survive a
 * navigation that starts right after (e.g. clicking a choice card). Never
 * throws, never blocks the UI.
 */
import { isFunnelEvent } from './events'

async function sessionToken() {
  try {
    const { supabaseBrowser } = await import('@/app/lib/supabaseBrowserClient')
    const { data } = await supabaseBrowser().auth.getSession()
    return data?.session?.access_token || null
  } catch {
    return null
  }
}

export async function track(event, props = {}) {
  if (typeof window === 'undefined' || !isFunnelEvent(event)) return false
  try {
    const token = await sessionToken()
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch('/api/track', {
      method: 'POST',
      headers,
      keepalive: true,
      body: JSON.stringify({ event, props, path: window.location.pathname }),
    })
    return res.ok
  } catch {
    return false
  }
}

export default track
