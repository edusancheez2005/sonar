'use client'
import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useSignMessage, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useActiveWallet } from './ActiveWalletContext'
import { usePersonalizedDashboard } from './PersonalizedDashboardContext'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
// Static-import the Solana adapter UI styles so they ship in the main
// bundle. Dynamic CSS imports break across Vercel deploys when chunk
// hashes change.
// Solana wallet-adapter UI styles are imported in app/layout.jsx so they
// land in the main CSS bundle (no per-route chunk that can 404 across
// deploys).

// Re-use the address regex from the API
const ADDRESS_RE = /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44}|[13][a-km-zA-HJ-NP-Z1-9]{25,61}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/

const Backdrop = styled(motion.div)`
  position: fixed; inset: 0; background: rgba(5,8,15,0.78);
  backdrop-filter: blur(6px); z-index: 9999;
  display: flex; align-items: center; justify-content: center;
`
const Panel = styled(motion.div)`
  background: linear-gradient(180deg, #0d1320 0%, #0a0e17 100%);
  border: 1px solid rgba(0,229,255,0.25);
  border-radius: 14px;
  width: min(520px, 92vw);
  padding: 22px 22px 18px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,229,255,0.08);
  color: #e6edf7;
  font-family: 'Inter', system-ui, sans-serif;
`
const Title = styled.h3`
  margin: 0 0 4px; color: #00e5ff; font-family: 'JetBrains Mono', monospace;
  font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase;
  &::before { content: '> '; color: #00e676; }
`
const Sub = styled.p`
  margin: 0 0 16px; color: #94a3b8; font-size: 12.5px; line-height: 1.5;
`
const Tabs = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr);
  background: rgba(255,255,255,0.03); border-radius: 10px; padding: 4px;
  margin-bottom: 14px;
`
const Tab = styled.button`
  background: ${(p) => (p.$active ? 'rgba(0,229,255,0.14)' : 'transparent')};
  color: ${(p) => (p.$active ? '#00e5ff' : '#94a3b8')};
  border: 0; padding: 8px; border-radius: 8px; cursor: pointer;
  font-family: 'JetBrains Mono', monospace; font-size: 11.5px;
  letter-spacing: 0.05em; text-transform: uppercase;
  &:hover { color: #e6edf7; }
`
const Body = styled.div` min-height: 180px; `
const Input = styled.input`
  width: 100%; padding: 11px 12px; border-radius: 8px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #e6edf7; font-family: 'JetBrains Mono', monospace; font-size: 13px;
  &:focus { outline: 0; border-color: #00e5ff; }
`
const Select = styled.select`
  width: 100%; padding: 11px 12px; border-radius: 8px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #e6edf7; font-family: 'JetBrains Mono', monospace; font-size: 13px;
  margin-top: 10px;
`
const Primary = styled.button`
  width: 100%; margin-top: 12px; padding: 12px; border: 0; border-radius: 8px;
  background: linear-gradient(90deg, #00e5ff 0%, #00b8d4 100%);
  color: #0a0e17; font-weight: 700; font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer;
  font-size: 12.5px;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`
const Ghost = styled.button`
  background: transparent; border: 1px solid rgba(255,255,255,0.12);
  color: #94a3b8; padding: 10px 14px; border-radius: 8px; cursor: pointer;
  font-family: 'JetBrains Mono', monospace; font-size: 11.5px;
  &:hover { color: #e6edf7; border-color: rgba(255,255,255,0.25); }
`
const Row = styled.div` display: flex; gap: 8px; align-items: center; justify-content: space-between; margin-top: 10px; `
const Note = styled.div`
  margin-top: 12px; padding: 10px 12px; border-radius: 8px;
  background: rgba(0,229,255,0.06); border: 1px solid rgba(0,229,255,0.2);
  color: #cfe8ee; font-size: 11.5px; line-height: 1.5;
`
const Err = styled.div`
  margin-top: 10px; color: #ff7a90; font-size: 12px; font-family: 'JetBrains Mono', monospace;
`
const Check = styled.label`
  display: flex; align-items: flex-start; gap: 8px; font-size: 12px;
  color: #cbd5e1; padding: 6px 0; cursor: pointer;
  input { margin-top: 3px; }
`

const TABS = [
  { id: 'evm', label: 'EVM' },
  { id: 'solana', label: 'Solana' },
  { id: 'paste', label: 'Paste address' },
]

export default function ConnectWalletModal({ open, onClose, defaultAttestations, onSignedIn }) {
  const [tab, setTab] = useState('evm')
  const [pasteAddr, setPasteAddr] = useState('')
  const [pasteChain, setPasteChain] = useState('ethereum')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const { setActiveWallet } = useActiveWallet()
  const { refresh: refreshTokens } = usePersonalizedDashboard()
  const [showSignIn, setShowSignIn] = useState(false)
  const [att, setAtt] = useState(() => ({
    over18:    defaultAttestations?.over18 === true,
    terms:     defaultAttestations?.terms === true,
    sanctions: defaultAttestations?.sanctions === true,
  }))
  const [solanaAdapter, setSolanaAdapter] = useState(null)

  const wagmi = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()

  // Lazy-load Solana adapter only when the Solana tab is opened. CSS is
  // static-imported at the top of this file so it ships in the main bundle
  // and survives Vercel chunk-hash changes across deploys.
  useEffect(() => {
    if (tab !== 'solana' || solanaAdapter) return
    ;(async () => {
      try {
        const ui = await import('@solana/wallet-adapter-react-ui')
        const react = await import('@solana/wallet-adapter-react')
        const wallets = await import('@solana/wallet-adapter-wallets')
        setSolanaAdapter({ ui, react, wallets })
      } catch (e) {
        setErr(`Solana adapter failed to load: ${e?.message || 'unknown'}`)
      }
    })()
  }, [tab, solanaAdapter])

  // When wagmi connects an EVM wallet, mark it as active (read-only mode by default)
  useEffect(() => {
    if (wagmi.isConnected && wagmi.address) {
      setActiveWallet(wagmi.address.toLowerCase(), 'ethereum', false)
      // Auto-trigger personalize for read-only paste-equivalent UX
      personalize(wagmi.address.toLowerCase(), 'ethereum').catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wagmi.isConnected, wagmi.address])

  async function personalize(address, chain) {
    try {
      const sb = supabaseBrowser()
      const { data } = await sb.auth.getSession()
      const token = data?.session?.access_token
      const headers = { 'content-type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`
      await fetch('/api/wallet/personalize', {
        method: 'POST',
        headers,
        body: JSON.stringify({ address, chain }),
      })
      await refreshTokens()
    } catch { /* ignore */ }
  }

  function handlePaste() {
    setErr(null)
    const a = pasteAddr.trim()
    if (!ADDRESS_RE.test(a)) { setErr('Invalid address format'); return }
    setActiveWallet(a, pasteChain, false)
    personalize(a, pasteChain).then(() => onClose?.())
  }

  async function handleSignIn() {
    setErr(null)
    if (!att.over18 || !att.terms || !att.sanctions) {
      setErr('Please confirm all three attestations to create an account.')
      return
    }
    setBusy(true)
    try {
      let address, chain, signature, message, nonce

      if (tab === 'evm') {
        if (!wagmi.address) throw new Error('Connect an EVM wallet first')
        address = wagmi.address
        chain = 'ethereum'
        const nonceRes = await fetch('/api/auth/wallet/nonce', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ address, chain }),
        })
        const nj = await nonceRes.json()
        if (!nonceRes.ok) throw new Error(nj?.error || 'nonce failed')
        nonce = nj.nonce; message = nj.message
        signature = await signMessageAsync({ message })
      } else if (tab === 'solana') {
        if (typeof window === 'undefined' || typeof window.__sonarSolanaSignIn !== 'function') {
          throw new Error('Connect a Solana wallet first (Phantom / Solflare / Backpack)')
        }
        const r = await window.__sonarSolanaSignIn(att)
        address = r.address; chain = r.chain; signature = r.signature
        nonce = r.nonce; message = r.message
      } else {
        throw new Error('Connect a wallet first (paste-only does not create an account)')
      }

      const verifyRes = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          address, chain, signature, nonce, message,
          over18: att.over18, acceptsTerms: att.terms, notSanctioned: att.sanctions,
        }),
      })
      const vj = await verifyRes.json()
      if (!verifyRes.ok) throw new Error(vj?.error || 'verify failed')
      const sb = supabaseBrowser()
      await sb.auth.setSession(vj.session)
      setActiveWallet(address.toLowerCase(), chain, true)
      await personalize(address.toLowerCase(), chain)
      onSignedIn?.({ address: address.toLowerCase(), chain, user: vj.user })
      onClose?.()
    } catch (e) {
      setErr(e?.message || 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <Backdrop initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <Panel
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Title>Connect wallet</Title>
          <Sub>Read-only signature only. Sonar will <b>never</b> request transactions, token approvals, or your seed phrase.</Sub>

          <Tabs>
            {TABS.map((t) => (
              <Tab key={t.id} $active={tab === t.id} onClick={() => { setTab(t.id); setErr(null); setShowSignIn(false) }}>
                {t.label}
              </Tab>
            ))}
          </Tabs>

          <Body>
            {tab === 'evm' && (
              <div>
                <ConnectButton chainStatus="none" showBalance={false} accountStatus="address" />
                {wagmi.isConnected && (
                  <Row>
                    <Ghost onClick={() => disconnect()}>Disconnect</Ghost>
                    <Ghost onClick={() => setShowSignIn((v) => !v)}>{showSignIn ? 'Hide sign-in' : 'Sign in with this wallet'}</Ghost>
                  </Row>
                )}
              </div>
            )}

            {tab === 'solana' && (
              <SolanaTab
                adapter={solanaAdapter}
                onPaste={(addr) => { setActiveWallet(addr, 'solana', false); personalize(addr, 'solana'); onClose?.() }}
                showSignIn={showSignIn}
                setShowSignIn={setShowSignIn}
              />
            )}

            {tab === 'paste' && (
              <div>
                <Input
                  placeholder="0x… or Solana / BTC address"
                  value={pasteAddr}
                  onChange={(e) => setPasteAddr(e.target.value)}
                />
                <Select value={pasteChain} onChange={(e) => setPasteChain(e.target.value)}>
                  <option value="ethereum">Ethereum</option>
                  <option value="polygon">Polygon</option>
                  <option value="arbitrum">Arbitrum</option>
                  <option value="base">Base</option>
                  <option value="optimism">Optimism</option>
                  <option value="solana">Solana</option>
                  <option value="bitcoin">Bitcoin</option>
                </Select>
                <Primary onClick={handlePaste}>Use this address</Primary>
              </div>
            )}

            {showSignIn && tab !== 'paste' && (
              <div style={{ marginTop: 14 }}>
                <Note>
                  Signing in with your wallet creates a Sonar account so your personalized dashboard persists across devices.
                  We will request a single read-only signature.
                </Note>
                <Check><input type="checkbox" checked={att.over18} onChange={(e) => setAtt((s) => ({ ...s, over18: e.target.checked }))} /> I confirm I am 18 or older.</Check>
                <Check><input type="checkbox" checked={att.terms} onChange={(e) => setAtt((s) => ({ ...s, terms: e.target.checked }))} /> I accept the Terms of Service and Privacy Policy.</Check>
                <Check><input type="checkbox" checked={att.sanctions} onChange={(e) => setAtt((s) => ({ ...s, sanctions: e.target.checked }))} /> I confirm I am not located in a sanctioned jurisdiction.</Check>
                <Primary disabled={busy} onClick={handleSignIn}>{busy ? 'Signing…' : 'Sign and create account'}</Primary>
              </div>
            )}
          </Body>

          {err && <Err>{err}</Err>}

          <Row>
            <Ghost onClick={onClose}>Close</Ghost>
            <Sub style={{ margin: 0 }}>Sonar Tracker · informational only · not investment advice</Sub>
          </Row>
        </Panel>
      </Backdrop>
    </AnimatePresence>
  )
}

function SolanaTab({ adapter, onPaste, showSignIn, setShowSignIn }) {
  if (!adapter) return <Sub>Loading Solana adapter…</Sub>
  const { ConnectionProvider, WalletProvider } = adapter.react
  const { WalletModalProvider, WalletMultiButton } = adapter.ui
  const { PhantomWalletAdapter, SolflareWalletAdapter, BackpackWalletAdapter } =
    adapter.wallets
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new (BackpackWalletAdapter || PhantomWalletAdapter)()].filter(Boolean),
    [PhantomWalletAdapter, SolflareWalletAdapter, BackpackWalletAdapter]
  )
  return (
    <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SolanaInner onPaste={onPaste} showSignIn={showSignIn} setShowSignIn={setShowSignIn} adapter={adapter} />
          <div style={{ marginTop: 8 }}>
            <WalletMultiButton style={{ background: 'rgba(0,229,255,0.12)', color: '#00e5ff', borderRadius: 8 }} />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

function SolanaInner({ adapter, showSignIn, setShowSignIn, onPaste }) {
  const { useWallet } = adapter.react
  const { publicKey, signMessage, connected, disconnect } = useWallet()
  const { setActiveWallet } = useActiveWallet()
  const { refresh } = usePersonalizedDashboard()

  useEffect(() => {
    if (connected && publicKey) {
      const addr = publicKey.toBase58()
      setActiveWallet(addr, 'solana', false)
      ;(async () => {
        try {
          const sb = supabaseBrowser()
          const { data } = await sb.auth.getSession()
          const token = data?.session?.access_token
          const headers = { 'content-type': 'application/json' }
          if (token) headers.Authorization = `Bearer ${token}`
          await fetch('/api/wallet/personalize', {
            method: 'POST', headers,
            body: JSON.stringify({ address: addr, chain: 'solana' }),
          })
          await refresh()
        } catch {}
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey])

  // Expose sign-in handler via window so the parent button can trigger it
  useEffect(() => {
    if (!connected || !publicKey || !signMessage) return
    window.__sonarSolanaSignIn = async (att) => {
      const address = publicKey.toBase58()
      const nonceRes = await fetch('/api/auth/wallet/nonce', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, chain: 'solana' }),
      })
      const nj = await nonceRes.json()
      if (!nonceRes.ok) throw new Error(nj?.error || 'nonce failed')
      const sigBytes = await signMessage(new TextEncoder().encode(nj.message))
      const bs58 = (await import('bs58')).default
      const signature = bs58.encode(sigBytes)
      return { address, chain: 'solana', signature, nonce: nj.nonce, message: nj.message, attestations: att }
    }
    return () => { try { delete window.__sonarSolanaSignIn } catch {} }
  }, [connected, publicKey, signMessage])

  if (!connected) return null
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <button
        onClick={() => disconnect()}
        style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
          color: '#94a3b8', padding: '8px 12px', borderRadius: 8,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, cursor: 'pointer',
        }}
      >
        Disconnect Solana
      </button>
      <button
        onClick={() => setShowSignIn((v) => !v)}
        style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
          color: '#94a3b8', padding: '8px 12px', borderRadius: 8,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, cursor: 'pointer',
        }}
      >
        {showSignIn ? 'Hide sign-in' : 'Sign in with Solana wallet'}
      </button>
    </div>
  )
}
