'use client'
/**
 * Client funnel helper — `track('welcome_choice', { choice: 'tour' })`.
 * Only the browser-side events (CLIENT_EVENTS: welcome_choice, paywall_view)
 * are sent; the rest are recorded server-side. Signed-out visitors send
 * nothing. keepalive lets the beacon survive a navigation that starts right
 * after (e.g. clicking a choice card). Never throws, never blocks the UI.
 */
import { isClientEvent } from './events'

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
  if (typeof window === 'undefined' || !isClientEvent(event)) return false
  try {
    const token = await sessionToken()
    if (!token) return false // signed-out views are not part of the funnel
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
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
