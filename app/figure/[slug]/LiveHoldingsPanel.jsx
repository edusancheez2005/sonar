'use client'
// Live on-chain holdings for a curated figure — fetched client-side from
// the per-address portfolio API (Alchemy for EVM, Alchemy Solana RPC +
// Jupiter for SOL, mempool.space for BTC; results are server-cached for
// 5 min per address). This is what fills famous-wallet pages whose
// addresses never appear in the whale tape (governments, treasuries,
// celebrities): the tape says "0 transactions" but the balances are real.
import React, { useEffect, useMemo, useState } from 'react'

const SUPPORTED = new Set(['ethereum', 'polygon', 'arbitrum', 'base', 'solana', 'bitcoin'])
const MAX_ADDRESSES = 8

function fmtUsd(n) {
  if (!Number.isFinite(n)) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

export default function LiveHoldingsPanel({ addresses, displayName }) {
  const targets = useMemo(
    () =>
      (Array.isArray(addresses) ? addresses : [])
        .filter((a) => a?.address && SUPPORTED.has(String(a.chain || '').toLowerCase()))
        .slice(0, MAX_ADDRESSES),
    [addresses]
  )
  const [state, setState] = useState({ status: targets.length ? 'loading' : 'empty', rows: [] })

  useEffect(() => {
    if (targets.length === 0) return
    let cancelled = false
    Promise.allSettled(
      targets.map((a) =>
        fetch(`/api/wallet/${encodeURIComponent(a.address)}/portfolio?chain=${encodeURIComponent(String(a.chain).toLowerCase())}`)
          .then((r) => (r.ok ? r.json() : null))
      )
    ).then((results) => {
      if (cancelled) return
      const rows = results
        .map((r, i) => (r.status === 'fulfilled' && r.value ? { ...r.value, _chain: targets[i].chain } : null))
        .filter(Boolean)
      setState({ status: rows.length ? 'ready' : 'error', rows })
    })
    return () => { cancelled = true }
  }, [targets])

  const { total, tokens, checked } = useMemo(() => {
    let total = 0
    const bySymbol = new Map()
    for (const r of state.rows) {
      total += Number(r.total_usd) || 0
      for (const h of r.holdings || []) {
        const v = Number(h.value_usd) || 0
        if (v <= 0) continue
        const key = String(h.symbol || '?').toUpperCase()
        bySymbol.set(key, (bySymbol.get(key) || 0) + v)
      }
    }
    const tokens = [...bySymbol.entries()]
      .map(([symbol, usd]) => ({ symbol, usd }))
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 10)
    return { total, tokens, checked: state.rows.length }
  }, [state.rows])

  if (state.status === 'empty') return null

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0d2134 0%, #14293c 100%)',
        border: '1px solid rgba(0, 229, 255, 0.22)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Live on-chain balance
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {state.status === 'loading' ? '…' : fmtUsd(total)}
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
          {state.status === 'loading'
            ? `Checking ${targets.length} address${targets.length === 1 ? '' : 'es'} on-chain…`
            : state.status === 'error'
              ? 'Balance providers unavailable right now.'
              : `${checked} of ${targets.length} address${targets.length === 1 ? '' : 'es'} checked · refreshed every 5 min`}
        </div>
      </div>

      {tokens.length > 0 ? (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
          {tokens.map((t) => (
            <span
              key={t.symbol}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.3rem 0.7rem',
                borderRadius: '999px',
                background: 'rgba(0, 229, 255, 0.07)',
                border: '1px solid rgba(0, 229, 255, 0.2)',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {t.symbol}
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{fmtUsd(t.usd)}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.75 }}>
        Current balances at {displayName ? `${displayName}'s` : 'the'} verified addresses, priced live.
        Whale-feed stats above only count tracked whale-sized trades — a quiet tape doesn&apos;t mean empty wallets.
      </div>
    </div>
  )
}
