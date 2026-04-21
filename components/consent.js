'use client'

/**
 * Reads the current cookie-consent state on the client.
 * Returns one of: 'accepted-all' | 'essentials-only' | 'analytics-only' | 'unknown'.
 *
 * IMPORTANT: this module is the single source of truth for whether
 * non-essential third-party scripts (Vercel Analytics, Speed Insights,
 * Google Analytics, GTM, etc.) are allowed to run. Any new third-party
 * tag added to the site MUST gate itself on `hasAnalyticsConsent()`.
 */

const CONSENT_KEY = 'sonar_cookie_consent'

export function readConsent() {
  if (typeof window === 'undefined') return 'unknown'
  try {
    return localStorage.getItem(CONSENT_KEY) || 'unknown'
  } catch {
    return 'unknown'
  }
}

export function hasAnalyticsConsent() {
  const v = readConsent()
  return v === 'accepted-all' || v === 'analytics-only'
}

export function CONSENT_EVENT() {
  return 'sonar:consent-changed'
}

export function emitConsentChanged() {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new Event('sonar:consent-changed'))
  } catch {}
}
