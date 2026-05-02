'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { useActiveWallet } from './ActiveWalletContext'
import { usePersonalizedDashboard } from './PersonalizedDashboardContext'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const EVM_CHAINS = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'base',     label: 'Base' },
  { id: 'arbitrum', label: 'Arbitrum' },
  { id: 'polygon',  label: 'Polygon' },
  { id: 'optimism', label: 'Optimism' },
]

const ConnectWalletModal = dynamic(() => import('./ConnectWalletModal'), { ssr: false })

const Wrap = styled(motion.section)`
  margin: 12px 0;
  background: linear-gradient(180deg, rgba(13,19,32,0.85), rgba(10,14,23,0.85));
  border: 1px solid rgba(0,229,255,0.18);
  border-radius: 12px;
  padding: 14px 16px;
  backdrop-filter: blur(12px);
  color: #e6edf7;
  font-family: 'Inter', system-ui, sans-serif;
`
const Header = styled.div` display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; `
const Title = styled.div`
  color: #00e5ff; font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px; letter-spacing: 0.06em; text-transform: uppercase;
  &::before { content: '> '; color: #00e676; }
`
const Pill = styled.div`
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(0,229,255,0.08); color: #cfe8ee;
  padding: 5px 10px; border-radius: 999px;
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
`
const Total = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px; color: #e6edf7; margin-top: 6px;
`
const Sub = styled.div` color: #94a3b8; font-size: 12px; margin-top: 2px; `
const Chips = styled.div` display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; `
const Chip = styled.button`
  display: inline-flex; align-items: center; gap: 6px;
  background: ${(p) => (p.$active ? 'rgba(0,229,255,0.22)' : 'rgba(255,255,255,0.04)')};
  border: 1px solid ${(p) => (p.$active ? '#00e5ff' : 'rgba(255,255,255,0.08)')};
  color: ${(p) => (p.$active ? '#00e5ff' : '#cbd5e1')};
  padding: 6px 10px; border-radius: 999px; cursor: pointer;
  font-family: 'JetBrains Mono', monospace; font-size: 11.5px;
  &:hover { color: #e6edf7; }
`
const ChipPct = styled.span` color: #94a3b8; font-size: 10.5px; `
const Remove = styled.span`
  margin-left: 4px; color: #ff7a90; cursor: pointer;
  &:hover { color: #ff1744; }
`
const Btn = styled.button`
  background: linear-gradient(90deg, #00e5ff 0%, #00b8d4 100%);
  color: #0a0e17; padding: 9px 14px; border: 0; border-radius: 8px; cursor: pointer;
  font-family: 'JetBrains Mono', monospace; font-size: 11.5px;
  letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`
const Ghost = styled.button`
  background: transparent; border: 1px solid rgba(255,255,255,0.12);
  color: #cbd5e1; padding: 8px 12px; border-radius: 8px; cursor: pointer;
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  &:hover { color: #e6edf7; }
`
const Empty = styled.div`
  display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: center;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`
const AddInputWrap = styled.div` margin-top: 10px; display: flex; gap: 6px; `
const AddInput = styled.input`
  flex: 1; padding: 8px 10px; border-radius: 8px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #e6edf7; font-family: 'JetBrains Mono', monospace; font-size: 12px;
  &:focus { outline: 0; border-color: #00e5ff; }
`

function truncate(addr) {
  if (!addr) return ''
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function PortfolioPanel() {
  const { address, chain, isConnected, isVerified, disconnect, setActiveWallet } = useActiveWallet()
  const { tokens, addToken, removeToken, refresh, activeFilterToken, setActiveFilterToken } =
    usePersonalizedDashboard()
  const [open, setOpen] = useState(false)
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState(0)
  const [adding, setAdding] = useState('')

  const loadPortfolio = useCallback(async (force = false) => {
    if (!address || !chain) return
    setLoading(true)
    try {
      const u = `/api/wallet/${address}/portfolio?chain=${chain}${force ? '&refresh=1' : ''}`
      const res = await fetch(u, { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        setPortfolio(j)
        setRefreshedAt(Date.now())
      }
    } finally { setLoading(false) }
  }, [address, chain])

  useEffect(() => { loadPortfolio(false) }, [loadPortfolio])

  const onRefresh = useCallback(async () => {
    if (Date.now() - refreshedAt < 60000) return
    await loadPortfolio(true)

    // Re-run personalize to pull any new detected tokens
    try {
      const sb = supabaseBrowser()
      const { data } = await sb.auth.getSession()
      const headers = { 'content-type': 'application/json' }
      const t = data?.session?.access_token
      if (t) headers.Authorization = `Bearer ${t}`
      await fetch('/api/wallet/personalize', {
        method: 'POST', headers,
        body: JSON.stringify({ address, chain }),
      })
      await refresh()
    } catch {}
  }, [address, chain, loadPortfolio, refresh, refreshedAt])

  const topHoldings = useMemo(() => (portfolio?.holdings || []).slice(0, 8), [portfolio])
  const total = portfolio?.total_usd

  // Multi-chain scan results: [{chain, total_usd, tokens}], sorted by value
  const [scan, setScan] = useState(null)
  const [scanning, setScanning] = useState(false)
  const runScan = useCallback(async () => {
    if (!address) return
    setScanning(true)
    try {
      const res = await fetch(`/api/wallet/${address}/scan`, { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        setScan(j)
        // Auto-jump to the chain with the most value if it differs from current
        if (j?.best_chain && j.best_chain !== chain && j.grand_total > 0) {
          setActiveWallet(address, j.best_chain, isVerified)
          setPortfolio(null)
        }
      }
    } finally {
      setScanning(false)
    }
  }, [address, chain, isVerified, setActiveWallet])

  if (!isConnected) {
    return (
      <Wrap initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <Empty>
          <div>
            <Title>Personalize your dashboard</Title>
            <Sub style={{ marginTop: 8 }}>
              Connect a wallet (or paste a public address) to see whale flows, signals, and news for the tokens <b>you actually hold</b>.
              Read-only — Sonar never requests transactions.
            </Sub>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setOpen(true)}>Connect wallet</Btn>
          </div>
        </Empty>
        <ConnectWalletModal open={open} onClose={() => setOpen(false)} />
      </Wrap>
    )
  }

  return (
    <Wrap initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Header>
        <div>
          <Title>My portfolio</Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <Pill title={address}>
              <span>{truncate(address)}</span>
              <span style={{ opacity: 0.6 }}>· {chain}</span>
              {isVerified && <span style={{ color: '#00e676' }}>✓</span>}
            </Pill>
            <Ghost onClick={() => navigator.clipboard?.writeText(address)}>Copy</Ghost>
            <Ghost onClick={() => { disconnect(); setPortfolio(null) }}>Disconnect</Ghost>
          </div>
          {/* Chain switcher — only meaningful for EVM addresses (0x...). */}
          {address && address.startsWith('0x') && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {EVM_CHAINS.map((c) => (
                <Chip
                  key={c.id}
                  $active={chain === c.id}
                  onClick={() => { setActiveWallet(address, c.id, isVerified); setPortfolio(null) }}
                  title={`Show holdings on ${c.label}`}
                >
                  <span>{c.label}</span>
                </Chip>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <Total>{loading ? '…' : total != null ? `$${Math.round(total).toLocaleString()}` : '—'}</Total>
          <Sub>{portfolio?.holdings?.length || 0} tokens · {portfolio?.cached ? 'cached' : 'fresh'}</Sub>
          <div style={{ marginTop: 6 }}>
            <Ghost onClick={onRefresh} disabled={Date.now() - refreshedAt < 60000 || loading}>↻ Refresh</Ghost>
          </div>
        </div>
      </Header>

      <Chips>
        {topHoldings.map((h) => {
          const sym = String(h.symbol || '').toUpperCase()
          const active = activeFilterToken === sym
          return (
            <Chip key={sym + h.contract} $active={active} onClick={() => setActiveFilterToken(active ? null : sym)}>
              <span>{sym}</span>
              <ChipPct>{h.pct?.toFixed?.(1) ?? h.pct}%</ChipPct>
            </Chip>
          )
        })}
        {topHoldings.length === 0 && !loading && (
          <div style={{ width: '100%' }}>
            <Sub style={{ marginBottom: 8 }}>
              No tokens detected on <b>{chain}</b>. Your assets might live on a different chain.
            </Sub>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn onClick={runScan} disabled={scanning}>
                {scanning ? 'Scanning all chains…' : 'Scan all chains'}
              </Btn>
              <Ghost onClick={onRefresh} disabled={loading}>↻ Refresh this chain</Ghost>
            </div>
            {scan && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                {scan.grand_total > 0
                  ? `Found $${Math.round(scan.grand_total).toLocaleString()} across: ${scan.chains.filter((c) => c.total_usd > 0).map((c) => `${c.chain} $${Math.round(c.total_usd)}`).join(' · ')}`
                  : `Scanned ${scan.chains.length} chain${scan.chains.length === 1 ? '' : 's'} — nothing above the $0.05 dust threshold. If you expected to see balances, check the address is correct.`}
              </div>
            )}
          </div>
        )}
      </Chips>

      {tokens.length > 0 && (
        <>
          <div style={{ marginTop: 14, fontSize: 11, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>
            DASHBOARD TOKENS
          </div>
          <Chips>
            {tokens.map((sym) => (
              <Chip key={sym} $active={activeFilterToken === sym} onClick={() => setActiveFilterToken(activeFilterToken === sym ? null : sym)}>
                <span>{sym}</span>
                <Remove onClick={(e) => { e.stopPropagation(); removeToken(sym) }}>×</Remove>
              </Chip>
            ))}
          </Chips>
        </>
      )}

      <AddInputWrap>
        <AddInput
          placeholder="Add token (e.g. SOL, LINK)"
          value={adding}
          onChange={(e) => setAdding(e.target.value.toUpperCase().slice(0, 12))}
          onKeyDown={(e) => { if (e.key === 'Enter' && adding) { addToken(adding); setAdding('') } }}
        />
        <Ghost onClick={() => { if (adding) { addToken(adding); setAdding('') } }}>+ Add</Ghost>
      </AddInputWrap>

      <ConnectWalletModal open={open} onClose={() => setOpen(false)} />
    </Wrap>
  )
}
