'use client'
import React from 'react'
import Dashboard from '@/src/views/Dashboard'
import RequirePremiumClient from './RequirePremiumClient'
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
          {/* 2026-09-30: the 5-step personalisation questionnaire
              (components/onboarding/OnboardingGate) is no longer auto-mounted
              anywhere — it stacked under the tutorial on a new account's first
              paint. The dashboard's FirstRunWelcome card (inside <Dashboard/>)
              is the single first-run surface; ORCA calibration comes from the
              signup form's Experience answer + the card's one-click chips. */}
          {/* Dismissible follow-your-first-whale nudge (only when the user
              follows zero wallets AND has already seen the welcome card). */}
          <FollowNudgePopup />
        </>
      )}
    </RequirePremiumClient>
  )
}

