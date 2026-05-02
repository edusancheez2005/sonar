'use client'
import React from 'react'
import { usePathname } from 'next/navigation'
import { StyleSheetManager } from 'styled-components'
import isPropValid from '@emotion/is-prop-valid'
import GlobalStyles from '@/src/styles/GlobalStyles'
import AppShell from '@/src/components/AppShell'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import FeedbackWidget from '@/src/components/FeedbackWidget'
import CookieConsent from '@/components/CookieConsent'

export default function ClientRoot({ children }) {
  const pathname = usePathname()
  const hideFeedback = pathname === '/ai-advisor'
  const isLandingPage = pathname === '/'
  /** Set NEXT_PUBLIC_LEGACY_TOP_NAV=1 to restore the old horizontal navbar + footer layout. */
  const useLegacyTopNav = process.env.NEXT_PUBLIC_LEGACY_TOP_NAV === '1'
  /**
   * Inside AppShell the feedback trigger lives in the sidebar footer (above
   * Settings). Suppress the floating pill there so we don't show two CTAs.
   * Landing/legacy layouts keep the floating pill since they have no shell.
   */
  const inShell = !isLandingPage && !useLegacyTopNav

  return (
    <StyleSheetManager shouldForwardProp={(propName, target) => {
      if (typeof target === 'string') {
        return isPropValid(propName)
      }
      return true
    }}>
      <GlobalStyles />
      {isLandingPage ? (
        <>
          <main>{children}</main>
          <Footer />
        </>
      ) : useLegacyTopNav ? (
        <>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </>
      ) : (
        <AppShell>{children}</AppShell>
      )}
      {!hideFeedback && <FeedbackWidget hideTrigger={inShell} />}
      <CookieConsent />
    </StyleSheetManager>
  )
} 