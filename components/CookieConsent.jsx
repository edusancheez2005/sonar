'use client'
import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { emitConsentChanged } from './consent'

const Banner = styled.div`
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
  background: rgba(13, 17, 28, 0.97); backdrop-filter: blur(12px);
  border-top: 1px solid rgba(0, 229, 255, 0.15);
  padding: 1rem 2rem; display: flex; align-items: center;
  justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  font-family: 'Inter', sans-serif; font-size: 0.85rem; color: #b0b8c4;
`

const Text = styled.p`
  margin: 0; line-height: 1.5; flex: 1; min-width: 280px;
  a { color: #00e5ff; text-decoration: underline; }
`

const Buttons = styled.div`display: flex; gap: 0.5rem; flex-shrink: 0; flex-wrap: wrap;`

const Btn = styled.button`
  padding: 0.5rem 1.2rem; border-radius: 4px; font-weight: 600;
  font-size: 0.8rem; cursor: pointer; transition: all 0.15s ease;
  font-family: 'Inter', sans-serif;
`

const PrimaryBtn = styled(Btn)`
  background: #00e5ff; color: #080f18; border: none;
  &:hover { background: #00c8e0; }
`

const SecondaryBtn = styled(Btn)`
  background: transparent; color: #b0b8c4; border: 1px solid rgba(255,255,255,0.2);
  &:hover { color: #e0e6ed; border-color: rgba(255,255,255,0.4); }
`

const CONSENT_KEY = 'sonar_cookie_consent'
// Valid stored values:
//   'accepted-all'     — essential + analytics
//   'essentials-only'  — essential only (no analytics)
//   (legacy values 'accepted' / 'rejected' are migrated on read)

function migrateLegacy(v) {
  if (v === 'accepted') return 'accepted-all'
  if (v === 'rejected') return 'essentials-only'
  return v
}

export default function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem(CONSENT_KEY)
    const v = migrateLegacy(raw)
    if (v === 'accepted-all' || v === 'essentials-only') {
      // Persist the migrated value so we don't migrate again
      if (raw !== v) {
        try { localStorage.setItem(CONSENT_KEY, v) } catch {}
      }
      return
    }
    setShow(true)
  }, [])

  const persist = (value) => {
    try {
      localStorage.setItem(CONSENT_KEY, value)
      // Mirror to the legacy disabled flag so any code still reading it
      // continues to behave correctly during the deprecation window.
      localStorage.setItem(
        'sonar_analytics_disabled',
        value === 'accepted-all' ? 'false' : 'true',
      )
    } catch {}
    emitConsentChanged()
    setShow(false)
  }

  const acceptAll = () => persist('accepted-all')
  const essentialsOnly = () => persist('essentials-only')

  if (!show) return null

  return (
    <Banner role="dialog" aria-label="Cookie consent">
      <Text>
        We use <strong>essential cookies</strong> for authentication and security
        (always on). We would also like to use <strong>analytics cookies</strong>
        (Vercel Web Analytics, Google Analytics) to understand how the site is
        used. Analytics cookies are off until you accept. See our{' '}
        <a href="/privacy">Privacy Policy</a> for full details and our list of
        sub-processors.
      </Text>
      <Buttons>
        <SecondaryBtn onClick={essentialsOnly}>Essentials only</SecondaryBtn>
        <PrimaryBtn onClick={acceptAll}>Accept all</PrimaryBtn>
      </Buttons>
    </Banner>
  )
}
