'use client'
/**
 * OnboardingGate
 * =============================================================================
 * Wrapper that mounts <OnboardingFlow /> only when the gate says so. Keeps
 * the dashboard wrapper trivial and the trigger logic in one place.
 * =============================================================================
 */
import { useState } from 'react'
import OnboardingFlow from './OnboardingFlow'
import useOnboardingGate from './useOnboardingGate'

export default function OnboardingGate({ client }) {
  const gate = useOnboardingGate({ client })
  const [closed, setClosed] = useState(false)

  if (closed) return null
  if (gate.state !== 'show') return null

  return (
    <OnboardingFlow
      userId={gate.userId}
      client={client}
      onComplete={() => setClosed(true)}
      onDismiss={() => setClosed(true)}
    />
  )
}
