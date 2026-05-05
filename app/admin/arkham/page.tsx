'use client'
/**
 * /admin/arkham — Arkham Intelligence operations dashboard.
 *
 * Four blocks:
 *   1. Quota card        — month-to-date credit usage + projection vs guard.
 *   2. Spend by endpoint — last 30d, sortable.
 *   3. Cache hit rate    — last 24h.
 *   4. Recent errors     — last 25 non-2xx attempts.
 *
 * /admin layout already gates on isAdmin(); this page also Bearer-auths
 * its single fetch so the API verifies server-side.
 */
import React, { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import Link from 'next/link'

type Stats = {
  license: { commercialUse: boolean; monthlyBudget: number; budgetGuard: number }
  quota: {
    calls_used: number
    calls_remaining: number
    days_left: number
    projected_month_end: number
  } | null
  byEndpoint: Array<{
    endpoint: string
    calls: number
    spend: number
    cacheHits: number
    errors: number
    avgMs: number
  }>
  cache24h: { total: number; hits: number; rate: number }
  recentErrors: Array<{ endpoint: string; status: number | null; reason: string | null; called_at: string; ms: number }>
  lastHealth: { called_at: string; status: number | null; ms: number; reason: string | null } | null
}

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
  border: '1px solid rgba(54,166,186,0.2)',
  borderRadius: 8,
  padding: '1.25rem',
}

const tableHeader: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.5rem 0.75rem',
  borderBottom: '1px solid rgba(54,166,186,0.3)',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  opacity: 0.7,
  letterSpacing: '0.05em',
}

const tableCell: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderBottom: '1px solid rgba(54,166,186,0.1)',
  fontSize: '0.85rem',
}

function fmtNum(n: number | null | undefined, dp = 0): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

export default function ArkhamAdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const sb = supabaseBrowser()
        const { data: sess } = await sb.auth.getSession()
        const token = sess?.session?.access_token
        if (!token) {
          if (!cancelled) setError('Not signed in')
          return
        }
        const res = await fetch('/api/admin/arkham/stats', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (!res.ok) {
          if (!cancelled) setError(`HTTP ${res.status}`)
          return
        }
        const json = (await res.json()) as Stats
        if (!cancelled) setStats(json)
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (loading && !stats) {
    return <main style={{ padding: '1.5rem', color: 'var(--text-primary)', opacity: 0.7 }}>Loading Arkham stats…</main>
  }
  if (error) {
    return <main style={{ padding: '1.5rem', color: '#f87171' }}>Error: {error}</main>
  }
  if (!stats) return null

  const projected = stats.quota?.projected_month_end ?? 0
  const used = stats.quota?.calls_used ?? 0
  const guardPct = stats.license.budgetGuard ? (projected / stats.license.budgetGuard) * 100 : 0
  const usedPct = stats.license.monthlyBudget ? (used / stats.license.monthlyBudget) * 100 : 0
  const overGuard = projected > stats.license.budgetGuard

  return (
    <main style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto', color: 'var(--text-primary)' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Arkham Intelligence</h1>
      <p style={{ opacity: 0.7, fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Starter plan · {stats.license.monthlyBudget.toLocaleString()} credits/mo · guard at{' '}
        {stats.license.budgetGuard.toLocaleString()} ·{' '}
        <span style={{ color: stats.license.commercialUse ? '#36A6BA' : '#f59e0b' }}>
          commercial use {stats.license.commercialUse ? 'ENABLED' : 'DISABLED'}
        </span>
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <Link href="/admin/arkham/entities" style={{
          display: 'inline-block', padding: '0.4rem 0.9rem', borderRadius: 6,
          border: '1px solid rgba(54,166,186,0.4)', color: '#36A6BA',
          textDecoration: 'none', fontSize: '0.85rem',
        }}>
          Curated entities →
        </Link>
      </div>

      {/* QUOTA CARD */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Month-to-date</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
            {fmtNum(stats.quota?.days_left, 1)} days left
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase' }}>Used</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{fmtNum(used)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase' }}>Remaining</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{fmtNum(stats.quota?.calls_remaining)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase' }}>Projected month-end</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: overGuard ? '#f87171' : '#36A6BA' }}>
              {fmtNum(projected)}
            </div>
          </div>
        </div>
        {/* dual progress bars */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.7 }}>
            <span>Used vs ceiling</span><span>{usedPct.toFixed(1)}%</span>
          </div>
          <div style={{ height: 8, background: '#0a1825', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, usedPct)}%`,
              height: '100%',
              background: usedPct > 95 ? '#f87171' : '#36A6BA',
            }} />
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.7 }}>
            <span>Projection vs guard</span><span>{guardPct.toFixed(1)}%</span>
          </div>
          <div style={{ height: 8, background: '#0a1825', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, guardPct)}%`,
              height: '100%',
              background: overGuard ? '#f87171' : '#36A6BA',
            }} />
          </div>
        </div>
      </div>

      {/* HEALTH + CACHE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase', marginBottom: 8 }}>
            Cache hit rate (24h)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            {(stats.cache24h.rate * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: 4 }}>
            {stats.cache24h.hits} hits / {stats.cache24h.total} attempts
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase', marginBottom: 8 }}>
            Last health ping
          </div>
          {stats.lastHealth ? (
            <>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: stats.lastHealth.status === 200 ? '#36A6BA' : '#f87171' }}>
                {stats.lastHealth.status ?? '—'} · {stats.lastHealth.ms} ms
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: 4 }}>
                {fmtTime(stats.lastHealth.called_at)}
                {stats.lastHealth.reason ? ` · ${stats.lastHealth.reason}` : ''}
              </div>
            </>
          ) : (
            <div style={{ opacity: 0.6, fontSize: '0.85rem' }}>No health pings yet.</div>
          )}
        </div>
      </div>

      {/* SPEND BY ENDPOINT */}
      <div style={{ ...cardStyle, marginTop: '1rem', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', opacity: 0.7 }}>
          Spend by endpoint (last 30d)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeader}>Endpoint</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Calls</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Credits</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Cache hits</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Errors</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Avg ms</th>
              </tr>
            </thead>
            <tbody>
              {stats.byEndpoint.length === 0 && (
                <tr><td colSpan={6} style={{ ...tableCell, opacity: 0.6 }}>No calls yet.</td></tr>
              )}
              {stats.byEndpoint.map((r) => (
                <tr key={r.endpoint}>
                  <td style={{ ...tableCell, fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>{r.endpoint}</td>
                  <td style={{ ...tableCell, textAlign: 'right' }}>{fmtNum(r.calls)}</td>
                  <td style={{ ...tableCell, textAlign: 'right', fontWeight: 600 }}>{fmtNum(r.spend)}</td>
                  <td style={{ ...tableCell, textAlign: 'right', opacity: 0.7 }}>{fmtNum(r.cacheHits)}</td>
                  <td style={{ ...tableCell, textAlign: 'right', color: r.errors > 0 ? '#f87171' : 'inherit' }}>{fmtNum(r.errors)}</td>
                  <td style={{ ...tableCell, textAlign: 'right' }}>{fmtNum(r.avgMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECENT ERRORS */}
      <div style={{ ...cardStyle, marginTop: '1rem', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', opacity: 0.7 }}>
          Recent errors (last 25)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeader}>When</th>
                <th style={tableHeader}>Endpoint</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>Status</th>
                <th style={{ ...tableHeader, textAlign: 'right' }}>ms</th>
                <th style={tableHeader}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentErrors.length === 0 && (
                <tr><td colSpan={5} style={{ ...tableCell, opacity: 0.6 }}>No errors. Nice.</td></tr>
              )}
              {stats.recentErrors.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...tableCell, opacity: 0.7, whiteSpace: 'nowrap' }}>{fmtTime(r.called_at)}</td>
                  <td style={{ ...tableCell, fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>{r.endpoint}</td>
                  <td style={{ ...tableCell, textAlign: 'right', color: '#f87171' }}>{r.status ?? '—'}</td>
                  <td style={{ ...tableCell, textAlign: 'right' }}>{r.ms}</td>
                  <td style={{ ...tableCell, opacity: 0.7 }}>{r.reason ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
