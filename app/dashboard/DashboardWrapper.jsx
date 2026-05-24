'use client'
import React from 'react'
import Dashboard from '@/src/views/Dashboard'
import RequirePremiumClient from './RequirePremiumClient'
import OnboardingGate from '@/components/onboarding/OnboardingGate'

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

