'use client'
import React, { useEffect, useMemo, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useSignMessage, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useActiveWallet } from './ActiveWalletContext'
import { usePersonalizedDashboard } from './PersonalizedDashboardContext'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
// Solana wallet-adapter UI styles are imported in app/layout.jsx so they
// land in the main always-loaded CSS bundle (no per-route chunk that can
// 404 across deploys).

const ADDRESS_RE = /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44}|[13][a-km-zA-HJ-NP-Z1-9]{25,61}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/

/* ---------------------------------------------------------------- styles */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`
const breathe = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.35); }
  50%      { box-shadow: 0 0 0 14px rgba(0, 229, 255, 0); }
`

const Backdrop = styled(motion.div)`
  position: fixed; inset: 0;
  background: radial-gradient(120% 120% at 50% -10%, rgba(124, 58, 237, 0.18), rgba(5,8,15,0.85) 60%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
`
const Panel = styled(motion.div)`
  position: relative;
  width: min(560px, 96vw);
  max-height: min(92vh, 760px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(0, 229, 255, 0.12), transparent 60%),
    radial-gradient(60% 50% at 100% 0%, rgba(124, 58, 237, 0.14), transparent 60%),
    linear-gradient(180deg, #0d1426 0%, #07090f 100%);
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.06);
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(0, 229, 255, 0.08) inset,
    0 1px 0 rgba(255,255,255,0.06) inset;
  color: #e6edf7;
  font-family: 'Inter', system-ui, sans-serif;
`
const ScrollArea = styled.div`
  overflow-y: auto;
  padding: 26px 26px 22px;
  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 8px; }
`
const CloseBtn = styled.button`
  position: absolute; top: 14px; right: 14px;
  width: 32px; height: 32px; border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #94a3b8; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .15s ease;
  &:hover { color: #fff; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
`
const Header = styled.div`
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 16px;
`
const Crest = styled.div`
  width: 46px; height: 46px; flex: 0 0 46px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(0,229,255,0.18), rgba(124,58,237,0.2));
  border: 1px solid rgba(0,229,255,0.3);
  color: #00e5ff;
  animation: ${breathe} 3.2s ease-in-out infinite;
`
const Title = styled.h3`
  margin: 0;
  color: #f8fafc;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
`
const Sub = styled.p`
  margin: 2px 0 0;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.45;
`

const Trust = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 6px 0 18px;
`
const TrustChip = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 10px 11px;
  background: rgba(0, 230, 118, 0.06);
  border: 1px solid rgba(0, 230, 118, 0.18);
  border-radius: 12px;
  color: #cfe8d8;
  font-size: 11.5px;
  line-height: 1.25;
  svg { flex: 0 0 14px; color: #34d399; }
`

const Tabs = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
`
const Tab = styled.button`
  position: relative;
  background: ${(p) => (p.$active ? 'linear-gradient(135deg, rgba(0,229,255,0.16), rgba(124,58,237,0.18))' : 'transparent')};
  color: ${(p) => (p.$active ? '#fff' : '#94a3b8')};
  border: 0;
  padding: 9px 8px;
  border-radius: 9px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: color .15s ease;
  &:hover { color: #e6edf7; }
`

const Body = styled.div`
  min-height: 200px;
  animation: ${fadeUp} .25s ease both;
`

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  margin: 4px 0 8px;
`

const Input = styled.input`
  width: 100%;
  padding: 13px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #e6edf7;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
  transition: border-color .15s ease, box-shadow .15s ease;
  &:focus { outline: 0; border-color: rgba(0,229,255,0.6); box-shadow: 0 0 0 4px rgba(0,229,255,0.12); }
  &::placeholder { color: #475569; }
`
const Select = styled.select`
  width: 100%;
  padding: 13px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #e6edf7;
  font-size: 13px;
  margin-top: 10px;
  cursor: pointer;
  &:focus { outline: 0; border-color: rgba(0,229,255,0.6); }
`
const Primary = styled(motion.button)`
  width: 100%;
  margin-top: 14px;
  padding: 14px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, #00e5ff 0%, #7c3aed 100%);
  color: #0a0e17;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.01em;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 6px 20px rgba(0, 229, 255, 0.18);
  transition: transform .12s ease, box-shadow .15s ease, opacity .15s ease;
  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(0, 229, 255, 0.28); }
  &:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
`
const Ghost = styled.button`
  background: transparent;
  border: 1px solid rgba(255,255,255,0.10);
  color: #cbd5e1;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 12.5px;
  transition: all .15s ease;
  &:hover { color: #fff; border-color: rgba(255,255,255,0.22); background: rgba(255,255,255,0.04); }
`
const Row = styled.div`
  display: flex; gap: 10px; align-items: center; justify-content: space-between;
  margin-top: 14px;
`
const Note = styled.div`
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(0,229,255,0.06), rgba(124,58,237,0.06));
  border: 1px solid rgba(0,229,255,0.18);
  color: #cfe8ee;
  font-size: 12.5px;
  line-height: 1.5;
`
const Err = styled(motion.div)`
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 122, 144, 0.08);
  border: 1px solid rgba(255, 122, 144, 0.25);
  color: #ffb3c1;
  font-size: 12.5px;
`
const Check = styled.label`
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 12.5px;
  color: #cbd5e1;
  padding: 8px 0;
  cursor: pointer;
  line-height: 1.45;
  input { margin-top: 3px; accent-color: #00e5ff; cursor: pointer; }
`

const Footer = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
  padding: 14px 26px;
  border-top: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.25);
  font-size: 11px;
  color: #64748b;
`
const FooterLink = styled.a`
  color: #94a3b8;
  text-decoration: none;
  &:hover { color: #00e5ff; text-decoration: underline; }
`

/* ----------------- icons (no extra deps) */
const ShieldIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 4 5v7c0 4.97 3.4 9.36 8 10 4.6-.64 8-5.03 8-10V5l-8-3z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)
const CheckSm = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 5 5L20 7" />
  </svg>
)
const XIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
const SignIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19 6 13l1.5-1.5L12 16l9-9L22.5 8.5z" />
  </svg>
)

const TABS = [
  { id: 'evm', label: 'EVM' },
  { id: 'solana', label: 'Solana' },
  { id: 'paste', label: 'Paste address' },
]

/* ---------------------------------------------------------------- modal */

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
  // When the parent has already collected the legal attestations (e.g. the
  // landing-page signup form's 18+/Terms checkbox) we hide the redundant
  // checkboxes inside the modal.
  const attestationsPreconfirmed = !!defaultAttestations &&
    defaultAttestations.over18 === true &&
    defaultAttestations.terms === true &&
    defaultAttestations.sanctions === true
  const [solanaAdapter, setSolanaAdapter] = useState(null)

  const wagmi = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()

  // Auto-reveal sign-in panel as soon as a wallet is connected so the user
  // does not have to hunt for a "Sign in" button.
  useEffect(() => {
    if (open && wagmi.isConnected && tab === 'evm') setShowSignIn(true)
  }, [open, wagmi.isConnected, tab])

  // Lazy-load Solana adapter only when the Solana tab is opened.
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

  // When wagmi connects an EVM wallet, mark it active (read-only by default)
  useEffect(() => {
    if (wagmi.isConnected && wagmi.address) {
      setActiveWallet(wagmi.address.toLowerCase(), 'ethereum', false)
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

  async function handlePaste() {
    setErr(null)
    const a = pasteAddr.trim()
    if (!ADDRESS_RE.test(a)) { setErr('That does not look like a valid wallet address.'); return }
    setBusy(true)
    try {
      setActiveWallet(a, pasteChain, false)
      // personalize() resolves silently on upstream error; explicitly fetch
      // so we can surface a friendlier message before closing.
      const sb = supabaseBrowser()
      const { data } = await sb.auth.getSession()
      const token = data?.session?.access_token
      const headers = { 'content-type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch('/api/wallet/personalize', {
        method: 'POST',
        headers,
        body: JSON.stringify({ address: a, chain: pasteChain }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || `Could not load this wallet (status ${res.status}).`)
      await refreshTokens()
      onClose?.()
    } catch (e) {
      setErr(e?.message || 'Could not load this wallet.')
    } finally {
      setBusy(false)
    }
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
      const msg = e?.message || 'Sign-in failed'
      // Friendlier wording for wallet-cancellation
      if (/User rejected|user denied|rejected the request/i.test(msg)) {
        setErr('Signature cancelled in your wallet — no account was created.')
      } else {
        setErr(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <Backdrop
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <Panel
          initial={{ y: 24, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 14, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-modal-title"
        >
          <CloseBtn type="button" onClick={onClose} aria-label="Close">{XIcon}</CloseBtn>

          <ScrollArea>
            <Header>
              <Crest>{ShieldIcon}</Crest>
              <div>
                <Title id="wallet-modal-title">Connect your wallet</Title>
                <Sub>Personalize your dashboard around the assets you actually hold.</Sub>
              </div>
            </Header>

            <Trust>
              <TrustChip>{CheckSm} Read-only signature</TrustChip>
              <TrustChip>{CheckSm} Never asks for transactions</TrustChip>
              <TrustChip>{CheckSm} We never see your seed</TrustChip>
            </Trust>

            <Tabs>
              {TABS.map((t) => (
                <Tab
                  key={t.id}
                  type="button"
                  $active={tab === t.id}
                  onClick={() => { setTab(t.id); setErr(null); setShowSignIn(false) }}
                >
                  {t.label}
                </Tab>
              ))}
            </Tabs>

            <Body key={tab}>
              {tab === 'evm' && (
                <div>
                  <SectionLabel>Step 1 · Choose a wallet</SectionLabel>
                  <ConnectButton chainStatus="none" showBalance={false} accountStatus="address" />
                  {wagmi.isConnected && (
                    <Row>
                      <Ghost type="button" onClick={() => disconnect()}>Disconnect</Ghost>
                      <Ghost type="button" onClick={() => setShowSignIn((v) => !v)}>
                        {showSignIn ? 'Hide sign-in' : 'Sign in with this wallet'}
                      </Ghost>
                    </Row>
                  )}
                </div>
              )}

              {tab === 'solana' && (
                <div>
                  <SectionLabel>Step 1 · Choose a Solana wallet</SectionLabel>
                  <SolanaTab
                    adapter={solanaAdapter}
                    onPaste={(addr) => { setActiveWallet(addr, 'solana', false); personalize(addr, 'solana'); onClose?.() }}
                    showSignIn={showSignIn}
                    setShowSignIn={setShowSignIn}
                  />
                </div>
              )}

              {tab === 'paste' && (
                <div>
                  <SectionLabel>Watch any address (read-only · no signature, no account)</SectionLabel>
                  <Sub style={{ margin: '0 0 12px' }}>
                    Paste any public wallet address. Sonar will personalize the dashboard around
                    its tokens. Nothing is signed, no account is created, and you can clear it
                    at any time.
                  </Sub>
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
                  <Primary type="button" disabled={busy} onClick={handlePaste} whileTap={busy ? {} : { scale: 0.98 }}>
                    {busy ? 'Loading wallet…' : 'Watch this address'}
                  </Primary>
                </div>
              )}

              {showSignIn && tab !== 'paste' && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ marginTop: 18 }}
                >
                  <SectionLabel>Step 2 · Sign to create your account</SectionLabel>
                  <Note>
                    Your wallet will pop up asking you to sign a short message.
                    {' '}This proves you own the address — it is <b>not</b> a transaction
                    {' '}and costs <b>no gas</b>.
                  </Note>
                  {!attestationsPreconfirmed && (
                    <div style={{ marginTop: 8 }}>
                      <Check>
                        <input type="checkbox" checked={att.over18} onChange={(e) => setAtt((s) => ({ ...s, over18: e.target.checked }))} />
                        <span>I confirm I am 18 or older.</span>
                      </Check>
                      <Check>
                        <input type="checkbox" checked={att.terms} onChange={(e) => setAtt((s) => ({ ...s, terms: e.target.checked }))} />
                        <span>I accept the <FooterLink href="/terms" target="_blank" rel="noopener">Terms of Service</FooterLink> and <FooterLink href="/privacy" target="_blank" rel="noopener">Privacy Policy</FooterLink>.</span>
                      </Check>
                      <Check>
                        <input type="checkbox" checked={att.sanctions} onChange={(e) => setAtt((s) => ({ ...s, sanctions: e.target.checked }))} />
                        <span>I am not located in a sanctioned jurisdiction.</span>
                      </Check>
                    </div>
                  )}
                  <Primary
                    type="button"
                    disabled={busy}
                    onClick={handleSignIn}
                    whileTap={busy ? {} : { scale: 0.98 }}
                  >
                    {busy ? 'Waiting for signature…' : <>{SignIcon} Sign &amp; continue</>}
                  </Primary>
                </motion.div>
              )}

              <AnimatePresence>
                {err && (
                  <Err
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {err}
                  </Err>
                )}
              </AnimatePresence>
            </Body>
          </ScrollArea>

          <Footer>
            <span>Sonar Tracker · informational only · not investment advice</span>
            <FooterLink href="/help/wallet-security" target="_blank" rel="noopener">How we keep you safe →</FooterLink>
          </Footer>
        </Panel>
      </Backdrop>
    </AnimatePresence>
  )
}

/* ---------------------------------------------------------------- Solana */

function SolanaTab({ adapter, onPaste, showSignIn, setShowSignIn }) {
  if (!adapter) return <Sub>Loading Solana adapter…</Sub>
  const { ConnectionProvider, WalletProvider } = adapter.react
  const { WalletModalProvider, WalletMultiButton } = adapter.ui
  const { PhantomWalletAdapter, SolflareWalletAdapter, BackpackWalletAdapter } = adapter.wallets
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new (BackpackWalletAdapter || PhantomWalletAdapter)()].filter(Boolean),
    [PhantomWalletAdapter, SolflareWalletAdapter, BackpackWalletAdapter]
  )
  return (
    <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SolanaInner onPaste={onPaste} showSignIn={showSignIn} setShowSignIn={setShowSignIn} adapter={adapter} />
          <div style={{ marginTop: 10 }}>
            <WalletMultiButton style={{
              background: 'linear-gradient(135deg, rgba(0,229,255,0.16), rgba(124,58,237,0.18))',
              color: '#fff',
              borderRadius: 12,
              fontWeight: 600,
              border: '1px solid rgba(0,229,255,0.25)',
            }} />
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

  // Auto-reveal Sonar sign-in step the moment Solana wallet is connected
  useEffect(() => {
    if (connected) setShowSignIn(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

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
    <Row style={{ marginTop: 10 }}>
      <Ghost type="button" onClick={() => disconnect()}>Disconnect Solana</Ghost>
      <Ghost type="button" onClick={() => setShowSignIn((v) => !v)}>
        {showSignIn ? 'Hide sign-in' : 'Sign in with this wallet'}
      </Ghost>
    </Row>
  )
}
