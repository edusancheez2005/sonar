'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { hasAnalyticsConsent } from './consent'

/**
 * Loads Vercel Analytics + Speed Insights ONLY after the user has granted
 * analytics consent via the cookie banner. Required for GDPR / PECR / CCPA
 * compliance — see LEGAL_AUDIT_2026-04-21.md §1.A finding A4.
 */
export default function AnalyticsGate() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const recompute = () => setAllowed(hasAnalyticsConsent())
    recompute()
    window.addEventListener('sonar:consent-changed', recompute)
    return () => window.removeEventListener('sonar:consent-changed', recompute)
  }, [])

  if (!allowed) return null
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
