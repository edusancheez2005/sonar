'use client'
import React from 'react'
import Dashboard from '@/src/views/Dashboard'
import RequirePremiumClient from './RequirePremiumClient'
import OnboardingGate from '@/components/onboarding/OnboardingGate'
import FollowNudgePopup from '@/components/dashboard/FollowNudgePopup'

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
          {/* Dismissible follow-your-first-whale nudge (only when the user
              follows zero wallets). Replaces the old inline top panel. */}
          <FollowNudgePopup />
        </>
      )}
    </RequirePremiumClient>
  )
}

