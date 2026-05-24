'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Dashboard from '@/src/views/Dashboard'
import RequirePremiumClient from './RequirePremiumClient'
import OnboardingGate from '@/components/onboarding/OnboardingGate'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

/**
 * Renders the existing global Dashboard untouched, plus a small "Personal →"
 * link above it for users who have an onboarding profile row. The link is
 * the ONLY addition to the global surface, per §1.3 of
 * ORCA_COPILOT_BUILD_PROMPT.md.
 */
export default function DashboardWrapper() {
  return (
    <RequirePremiumClient>
      {({ isPremium }) => (
        <>
          <PersonalLink />
          <Dashboard isPremium={true} />
          <OnboardingGate />
        </>
      )}
    </RequirePremiumClient>
  )
}

function PersonalLink() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    let cancelled = false
    const sb = supabaseBrowser()
    ;(async () => {
      try {
        const { data: sessionData } = await sb.auth.getSession()
        const userId = sessionData?.session?.user?.id
        if (!userId) return
        const { data } = await sb
          .from('user_profile')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle()
        if (!cancelled && data) setShow(true)
      } catch {
        // Quietly hide on any error — the link is purely additive.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!show) return null
  return (
    <div
      style={{
        maxWidth: 1320,
        margin: '0 auto',
        padding: '12px 24px 0',
        textAlign: 'right',
      }}
    >
      <Link
        href="/dashboard/personal"
        style={{
          fontSize: 13,
          color: '#00e5ff',
          textDecoration: 'none',
        }}
        data-testid="personal-dashboard-link"
      >
        Personal →
      </Link>
    </div>
  )
}

