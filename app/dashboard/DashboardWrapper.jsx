'use client'
import React from 'react'
import Dashboard from '@/src/views/Dashboard'
import RequirePremiumClient from './RequirePremiumClient'
import OnboardingGate from '@/components/onboarding/OnboardingGate'

/**
 * Renders the existing global Dashboard untouched. The Personal entry-point
 * lives in the sidebar nav (see src/components/AppShell.jsx) — we no longer
 * inject a "Personal →" link above the dashboard body.
 */
export default function DashboardWrapper() {
  return (
    <RequirePremiumClient>
      {({ isPremium }) => (
        <>
          <Dashboard isPremium={true} />
          <OnboardingGate />
        </>
      )}
    </RequirePremiumClient>
  )
}

