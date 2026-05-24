'use client'
/**
 * useOnboardingGate
 * =============================================================================
 * Decides whether the OnboardingFlow modal should be shown for the current
 * session. Resolves to one of:
 *
 *   { state: 'loading' }                       — waiting for auth + profile lookup
 *   { state: 'hidden' }                        — user is not authed, or profile
 *                                                 already exists, or user
 *                                                 dismissed personalisation
 *   { state: 'show', userId: string }          — show the modal
 *
 * Trigger logic (matches §4.A of ORCA_COPILOT_BUILD_PROMPT.md):
 *   1. If there is no auth session → hidden.
 *   2. Else fetch user_profile for the user.
 *   3. If no row exists → show.
 *   4. If a row exists with personalization_dismissed = true → hidden.
 *   5. If a row exists with any required onboarding field still null → show.
 *      (Catches partial completions where the user closed the tab mid-flow.)
 *   6. Else → hidden.
 *
 * The Supabase client is injected via `client` for testability; the default
 * is the singleton `supabaseBrowser()`.
 * =============================================================================
 */
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const REQUIRED_FIELDS = [
  'experience_level',
  'primary_goal',
  'risk_tolerance',
  'time_horizon',
  'preferred_chains',
]

export function evaluateOnboardingGate({ session, profile }) {
  if (!session?.user?.id) return { state: 'hidden' }
  const userId = session.user.id
  if (!profile) return { state: 'show', userId }
  if (profile.personalization_dismissed === true) return { state: 'hidden' }
  for (const f of REQUIRED_FIELDS) {
    const v = profile[f]
    if (v === null || v === undefined) return { state: 'show', userId }
    if (Array.isArray(v) && v.length === 0) return { state: 'show', userId }
  }
  return { state: 'hidden' }
}

export default function useOnboardingGate({ client } = {}) {
  const [result, setResult] = useState({ state: 'loading' })

  useEffect(() => {
    let cancelled = false
    const sb = client ?? supabaseBrowser()

    async function check() {
      try {
        const { data: sessionData } = await sb.auth.getSession()
        const session = sessionData?.session ?? null
        if (!session?.user?.id) {
          if (!cancelled) setResult({ state: 'hidden' })
          return
        }
        const { data: profile } = await sb
          .from('user_profile')
          .select(
            'experience_level, primary_goal, risk_tolerance, time_horizon, preferred_chains, personalization_dismissed'
          )
          .eq('user_id', session.user.id)
          .maybeSingle()
        if (cancelled) return
        setResult(evaluateOnboardingGate({ session, profile }))
      } catch {
        if (!cancelled) setResult({ state: 'hidden' })
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [client])

  return result
}

export { REQUIRED_FIELDS }
