'use client'
// Live Whale Feed — section 1 of the Whale Intelligence Terminal.
// Polls the existing /api/trades route (newest-first) every 30s and
// renders a terminal-styled ticker with chain badge, copyable wallet,
// token, formatted USD, in/out direction, and an explorer link.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import WhaleTerminalShell from '@/app/components/whale-terminal/WhaleTerminalShell'
import {
  Panel,
  PanelTitle,
  DataTable,
  Badge,
  ChainBadge,
  GhostButton,
  PillSelect,
  Notice,
  ErrorNotice,
} from '@/app/components/whale-terminal/primitives'
import { C, FONT_MONO } from '@/app/lib/terminalTheme'
import { shortenAddress, formatUsd, timeAgo, getTxExplorerUrl } from '@/lib/wallet-tracker'
import { chainDisplay } from '@/app/lib/entityHelpers'
import SonarLoader from '@/components/wallet-tracker/SonarLoader'

const POLL_MS = 30000

const Controls = styled.div`
  display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
`

const WalletButton = styled.button`
  background: transparent;
  border: none;
  color: ${C.cyan};
  font-family: ${FONT_MONO};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  &:hover { text-decoration: underline; }
  .copied { color: ${C.green}; font-size: 0.62rem; letter-spacing: 0.5px; }
  svg { width: 12px; height: 12px; opacity: 0.6; }
`

const ExplorerLink = styled.a`
  color: ${C.textMuted};
  font-family: ${FONT_MONO};
  font-size: 0.72rem;
  text-decoration: none;
  &:hover { color: ${C.cyan}; }
`

function directionFor(classification) {
  const c = (classification || '').toLowerCase()
  if (c === 'buy') return { label: 'IN', cls: 'in' }
  if (c === 'sell') return { label: 'OUT', cls: 'out' }
  return { label: (classification || 'TX').toUpperCase(), cls: 'transfer' }
}

function CopyableWallet({ address, chain }) {
  const [copied, setCopied] = useState(false)
  if (!address) return <span style={{ color: C.textMuted }}>—</span>
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // clipboard unavailable — ignore
    }
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <Link href={`/whale/${encodeURIComponent(address)}`} style={{ color: C.cyan, textDecoration: 'none', fontWeight: 600 }}>
        {shortenAddress(address, 5)}
      </Link>
      <WalletButton onClick={onCopy} title="Copy address" aria-label="Copy wallet address">
        {copied ? (
          <span className="copied">COPIED</span>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </WalletButton>
    </span>
  )
}

export default function WhaleFeedClient() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [minUsd, setMinUsd] = useState('0')
  const timerRef = useRef(null)
  const minUsdRef = useRef(minUsd)
  minUsdRef.current = minUsd

  const load = useCallback(async (initial = false) => {
    if (initial) setStatus('loading')
    else setRefreshing(true)
    try {
      const params = new URLSearchParams({ sinceHours: '24', limit: '100', page: '1' })
      const mu = minUsdRef.current
      if (mu && Number(mu) > 0) params.set('minUsd', String(mu))
      const res = await fetch(`/api/trades?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setRows(Array.isArray(json.data) ? json.data : [])
      setStatus('ready')
      setLastUpdated(new Date())
    } catch {
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(true)
    timerRef.current = setInterval(() => load(false), POLL_MS)
    return () => clearInterval(timerRef.current)
  }, [load])

  // Re-fetch immediately when the min-USD filter changes.
  useEffect(() => {
    if (status === 'loading') return
    load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minUsd])

  return (
    <WhaleTerminalShell title="WHALE_INTELLIGENCE // LIVE_FEED">
      <Panel>
        <PanelTitle>
          <h2>Live Whale Feed</h2>
          <Controls>
            <PillSelect value={minUsd} onChange={(e) => setMinUsd(e.target.value)} aria-label="Minimum USD value">
              <option value="0">All sizes</option>
              <option value="100000">≥ $100K</option>
              <option value="500000">≥ $500K</option>
              <option value="1000000">≥ $1M</option>
              <option value="5000000">≥ $5M</option>
            </PillSelect>
            <GhostButton type="button" onClick={() => load(false)} disabled={refreshing}>
              {refreshing ? 'SYNCING…' : 'REFRESH'}
            </GhostButton>
            <span style={{ fontFamily: FONT_MONO, fontSize: '0.68rem', color: C.textMuted }}>
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · auto 30s` : 'auto 30s'}
            </span>
          </Controls>
        </PanelTitle>

        {status === 'loading' ? (
          <SonarLoader text="Scanning the chain for whales…" size={60} compact />
        ) : status === 'error' ? (
          <ErrorNotice>
            <div>⚠ Unable to load the whale feed.</div>
            <div style={{ marginTop: '0.75rem' }}>
              <GhostButton type="button" onClick={() => load(true)}>RETRY</GhostButton>
            </div>
          </ErrorNotice>
        ) : rows.length === 0 ? (
          <Notice>No whale activity matches the current filter. Try lowering the minimum size.</Notice>
        ) : (
          <DataTable>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Chain</th>
                  <th>Token</th>
                  <th>Dir</th>
                  <th className="right">USD</th>
                  <th>Wallet</th>
                  <th className="right">Tx</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const dir = directionFor(t.classification)
                  const wallet = t.whale_address || t.from_address
                  const explorerUrl = getTxExplorerUrl(t.blockchain, t.transaction_hash)
                  const usdColor =
                    dir.cls === 'in' ? C.green : dir.cls === 'out' ? C.red : C.textPrimary
                  return (
                    <tr key={t.transaction_hash || `${wallet}-${t.timestamp}`}>
                      <td className="muted" style={{ fontSize: '0.74rem' }}>{timeAgo(t.timestamp)}</td>
                      <td><ChainBadge>{chainDisplay(t.blockchain)}</ChainBadge></td>
                      <td>
                        <Link href={`/token/${encodeURIComponent(t.token_symbol || '-')}`}>{t.token_symbol || '—'}</Link>
                      </td>
                      <td><Badge className={dir.cls}>{dir.label}</Badge></td>
                      <td className="right" style={{ fontWeight: 700, color: usdColor }}>{formatUsd(t.usd_value)}</td>
                      <td><CopyableWallet address={wallet} chain={t.blockchain} /></td>
                      <td className="right">
                        {explorerUrl ? (
                          <ExplorerLink href={explorerUrl} target="_blank" rel="noopener noreferrer">view ↗</ExplorerLink>
                        ) : (
                          <span style={{ color: C.textMuted }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </DataTable>
        )}
      </Panel>
    </WhaleTerminalShell>
  )
}
