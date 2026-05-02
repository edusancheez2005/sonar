'use client'

/**
 * Lazy-mounted "Continue with Wallet" button for the landing-page signup
 * form. The wallet stack (wagmi + RainbowKit + Solana adapter, ~ several
 * hundred KB) is only loaded when the user actually clicks the button, so
 * landing-page first paint is unaffected.
 *
 * The button reuses the existing ConnectWalletModal which already handles:
 *   - EVM (MetaMask / WalletConnect / Coinbase) via RainbowKit
 *   - Solana (Phantom etc) via @solana/wallet-adapter
 *   - Paste-only address mode
 *   - SIWE-style signing + POST to /api/auth/wallet/verify
 *   - Account creation + attestation stamping
 */

import React, { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'

const WalletProvider = dynamic(() => import('@/components/wallet/WalletProvider'), { ssr: false })
const ActiveWalletProviderDyn = dynamic(
  () => import('@/components/wallet/ActiveWalletContext').then((m) => m.ActiveWalletProvider),
  { ssr: false }
)
const PersonalizedDashboardProviderDyn = dynamic(
  () => import('@/components/wallet/PersonalizedDashboardContext').then((m) => m.PersonalizedDashboardProvider),
  { ssr: false }
)
const ConnectWalletModal = dynamic(() => import('@/components/wallet/ConnectWalletModal'), { ssr: false })

export default function WalletSignupButton({ acceptedTerms, onError, onSignedIn }) {
  const [armed, setArmed] = useState(false)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const onClick = useCallback(async () => {
    if (!acceptedTerms) {
      onError?.('Please confirm you are 18+ and accept the Terms before continuing.')
      return
    }
    setLoading(true)
    // First click: arm the lazy providers, then open modal on next tick so
    // the providers have a chance to mount.
    setArmed(true)
    // Small delay lets dynamic imports start before we open
    setTimeout(() => { setOpen(true); setLoading(false) }, 50)
  }, [acceptedTerms, onError])

  return (
    <>
      <motion.button
        type="button"
        whileHover={acceptedTerms && !loading ? { scale: 1.02, boxShadow: '0 4px 20px rgba(124, 58, 237, 0.18)' } : {}}
        whileTap={acceptedTerms && !loading ? { scale: 0.98 } : {}}
        onClick={onClick}
        disabled={!acceptedTerms || loading}
        style={{
          width: '100%',
          padding: '0.7rem 1rem',
          marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, #1a1f3a 0%, #0f1428 100%)',
          color: '#fff',
          border: '1px solid rgba(124, 58, 237, 0.35)',
          borderRadius: '12px',
          fontSize: '0.95rem',
          fontWeight: 600,
          cursor: acceptedTerms && !loading ? 'pointer' : 'not-allowed',
          opacity: acceptedTerms && !loading ? 1 : 0.45,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          transition: 'opacity 0.2s ease',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="#a78bfa" strokeWidth="1.6" />
          <path d="M3 10h18" stroke="#a78bfa" strokeWidth="1.6" />
          <circle cx="17" cy="14.5" r="1.2" fill="#a78bfa" />
        </svg>
        {loading ? 'Loading wallet…' : 'Continue with Wallet'}
      </motion.button>

      {armed ? (
        <WalletProvider>
          <ActiveWalletProviderDyn>
            <PersonalizedDashboardProviderDyn>
              <ConnectWalletModal
                open={open}
                onClose={() => setOpen(false)}
                defaultAttestations={{ over18: true, terms: true, sanctions: true }}
                onSignedIn={onSignedIn}
              />
            </PersonalizedDashboardProviderDyn>
          </ActiveWalletProviderDyn>
        </WalletProvider>
      ) : null}
    </>
  )
}
