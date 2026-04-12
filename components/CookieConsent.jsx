'use client'
import { useState, useEffect } from 'react'
import styled from 'styled-components'

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

const Buttons = styled.div`display: flex; gap: 0.5rem; flex-shrink: 0;`

const Btn = styled.button`
  padding: 0.5rem 1.2rem; border-radius: 4px; font-weight: 600;
  font-size: 0.8rem; cursor: pointer; transition: all 0.15s ease;
  font-family: 'Inter', sans-serif;
`

const AcceptBtn = styled(Btn)`
  background: #00e5ff; color: #080f18; border: none;
  &:hover { background: #00c8e0; }
`

const RejectBtn = styled(Btn)`
  background: transparent; color: #5a6a7a; border: 1px solid rgba(255,255,255,0.1);
  &:hover { color: #e0e6ed; border-color: rgba(255,255,255,0.2); }
`

const CONSENT_KEY = 'sonar_cookie_consent'

export default function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const consent = localStorage.getItem(CONSENT_KEY)
    // Only hide if user explicitly accepted or rejected — not on dismissal
    if (consent === 'accepted' || consent === 'rejected') return
    setShow(true)
  }, [])

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setShow(false)
  }

  const reject = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected')
    localStorage.setItem('sonar_analytics_disabled', 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <Banner>
      <Text>
        We use essential cookies for authentication and security. We also use optional analytics (Vercel Web Analytics) to understand how the site is used.
        You can accept or reject non-essential cookies. See our <a href="/privacy">Privacy Policy</a> for full details.
      </Text>
      <Buttons>
        <RejectBtn onClick={reject}>Reject analytics</RejectBtn>
        <AcceptBtn onClick={accept}>Accept all</AcceptBtn>
      </Buttons>
    </Banner>
  )
}
