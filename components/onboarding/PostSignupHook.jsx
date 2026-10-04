'use client'
/**
 * PostSignupHook — invisible, mounted once in ClientRoot.
 * The first time a brand-new account (under 7 days old) is seen signed in on
 * this device, it calls /api/onboarding/first-login, the shared post-signup
 * hook (signup funnel event, user_profile row, optional welcome email). It runs
 * on whatever page the user lands on, so Google sign-ups that land on
 * /ai-advisor are covered. The server side is atomic and idempotent; the
 * localStorage flag only saves repeat requests.
 */
import { useEffect } from 'react'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const NEW_ACCOUNT_MS = 7 * 24 * 3600 * 1000
let inFlight = false

function flagKey(uid) {
  return `sonar_first_login_v1:${uid}`
}

async function run(session) {
  const user = session?.user
  const token = session?.access_token
  if (!user?.id || !token || inFlight) return
  try {
    if (localStorage.getItem(flagKey(user.id))) return
  } catch { /* storage blocked: the server still dedupes */ }
  const created = Date.parse(user.created_at || '')
  if (!Number.isFinite(created) || Date.now() - created > NEW_ACCOUNT_MS) {
    try { localStorage.setItem(flagKey(user.id), 'old') } catch { /* fine */ }
    return
  }
  inFlight = true
  try {
    const res = await fetch('/api/onboarding/first-login', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: window.location.pathname }),
      keepalive: true,
    })
    if (res.ok) {
      try { localStorage.setItem(flagKey(user.id), 'done') } catch { /* fine */ }
    }
  } catch {
    /* best-effort; retried on the next page load */
  } finally {
    inFlight = false
  }
}

export default function PostSignupHook() {
  useEffect(() => {
    let sub = null
    try {
      const sb = supabaseBrowser()
      sb.auth.getSession().then(({ data }) => run(data?.session)).catch(() => {})
      // OAuth redirects and magic links finish signing in after mount.
      const { data } = sb.auth.onAuthStateChange((evt, session) => {
        if (evt === 'SIGNED_IN') run(session)
      })
      sub = data?.subscription || null
    } catch { /* never surface */ }
    return () => {
      try { sub?.unsubscribe() } catch { /* fine */ }
    }
  }, [])
  return null
}
