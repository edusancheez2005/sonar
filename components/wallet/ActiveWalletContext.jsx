'use client'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

/**
 * Active wallet state shared across the dashboard.
 * Source of truth precedence (highest first):
 *   1. Supabase user with linked wallet_identities
 *   2. localStorage `sonar_active_wallet` (set by ConnectWalletModal after EVM/Solana connect or paste)
 */

const ActiveWalletContext = createContext({
  address: null,
  chain: null,
  isConnected: false,
  isVerified: false,
  setActiveWallet: () => {},
  disconnect: () => {},
})

const STORAGE_KEY = 'sonar_active_wallet'

export function ActiveWalletProvider({ children }) {
  const [state, setState] = useState({ address: null, chain: null, isVerified: false })

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.address && parsed?.chain) setState(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  // Override with Supabase identity if present
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const sb = supabaseBrowser()
        const { data: sess } = await sb.auth.getSession()
        const token = sess?.session?.access_token
        if (!token) return
        const res = await fetch('/api/wallet/identities', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        const j = await res.json()
        const list = j?.data || []
        if (cancelled || list.length === 0) return
        const primary = list.find((w) => w.is_primary) || list[0]
        setState({ address: primary.address, chain: primary.chain, isVerified: !!primary.verified_at })
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [])

  const setActiveWallet = useCallback((address, chain, isVerified = false) => {
    const next = { address, chain, isVerified }
    setState(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }, [])

  const disconnect = useCallback(() => {
    setState({ address: null, chain: null, isVerified: false })
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }, [])

  const value = useMemo(() => ({
    address: state.address,
    chain: state.chain,
    isConnected: !!state.address,
    isVerified: !!state.isVerified,
    setActiveWallet,
    disconnect,
  }), [state, setActiveWallet, disconnect])

  return <ActiveWalletContext.Provider value={value}>{children}</ActiveWalletContext.Provider>
}

export function useActiveWallet() {
  return useContext(ActiveWalletContext)
}
