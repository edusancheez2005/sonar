'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { StyleSheetManager } from 'styled-components'
import isPropValid from '@emotion/is-prop-valid'
import GlobalStyles from '@/src/styles/GlobalStyles'
import AppShell from '@/src/components/AppShell'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import FeedbackWidget from '@/src/components/FeedbackWidget'
import CookieConsent from '@/components/CookieConsent'
import { ActiveWalletProvider } from '@/components/wallet/ActiveWalletContext'
import { PersonalizedDashboardProvider } from '@/components/wallet/PersonalizedDashboardContext'

// WalletProvider (wagmi + rainbowkit) is heavy & browser-only. Lazy-load only on routes
// where the wallet UI is actually used.
const WalletProvider = dynamic(() => import('@/components/wallet/WalletProvider'), {
  ssr: false,
})

// OrcaDrawer (Stage D): floating "Ask ORCA" pill + slide-in chat. The
// component itself decides whether to render (hidden on /ai, /ai-advisor,
// landing, auth, legal). Lazy-loaded to keep the initial bundle lean.
const OrcaDrawer = dynamic(() => import('@/components/orca/OrcaDrawer'), {
  ssr: false,
})

// OnboardingGate (Stage E): mounts the personalisation wizard for signed-in
// users without a complete user_profile row. Already mounted inside
// DashboardWrapper; we skip remount on /dashboard/* to avoid duplicate
// modals. Hidden on landing + auth + legal surfaces.
const OnboardingGate = dynamic(() => import('@/components/onboarding/OnboardingGate'), {
  ssr: false,
})

const ONBOARDING_HIDE_PREFIXES = ['/dashboard', '/auth', '/legal', '/privacy', '/terms', '/subscribe']

const WALLET_ROUTES = ['/dashboard', '/personalize', '/profile', '/wallet-tracker', '/watchlist', '/whale']

export default function ClientRoot({ children }) {
  const pathname = usePathname()
  const hideFeedback = pathname === '/ai-advisor'
  const isLandingPage = pathname === '/'
  const useLegacyTopNav = process.env.NEXT_PUBLIC_LEGACY_TOP_NAV === '1'
  const inShell = !isLandingPage && !useLegacyTopNav
  const needsWallet = pathname && WALLET_ROUTES.some((r) => pathname.startsWith(r))
  const showOnboarding =
    !isLandingPage &&
    pathname &&
    !ONBOARDING_HIDE_PREFIXES.some((p) => pathname.startsWith(p))

  const shell = (
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
      <OrcaDrawer />
      {showOnboarding && <OnboardingGate />}
    </StyleSheetManager>
  )

  const withContexts = (
    <ActiveWalletProvider>
      <PersonalizedDashboardProvider>
        {shell}
      </PersonalizedDashboardProvider>
    </ActiveWalletProvider>
  )

  if (needsWallet) {
    return <WalletProvider>{withContexts}</WalletProvider>
  }
  return withContexts
} 