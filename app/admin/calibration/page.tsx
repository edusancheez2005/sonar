'use client'
/**
 * /admin/calibration — operator-facing UI for signal_calibration_snapshot.
 *
 * Replaces the "open Supabase SQL editor and INSERT manually" workflow
 * called out as known limitation #2 of the 2026-05-04 hardening.
 *
 * Layout:
 *   - Top: live calibration table (token_signal_calibration), so the
 *     operator can see what the calibrator currently believes per
 *     (token, eval_window).
 *   - Middle: snapshot table (signal_calibration_snapshot). Edit a row in
 *     place; "Approve" upserts via POST /api/admin/calibration. "Delete"
 *     drops the override and the engine falls back to the live calibrator.
 *   - Bottom: recent change log (calibration_change_log) + recent proposal
 *     log (calibration_proposal_log) so the operator can audit what
 *     hysteresis is or isn't promoting.
 *
 * Auth: /admin layout already gates on isAdmin(); this page also passes a
 * Supabase Bearer to every fetch so the route can verify server-side.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { isAdmin } from '@/app/lib/adminConfig'

type Snapshot = {
  token: string
  eval_window: string
  sign_multiplier: number | null
  confidence_score: number
  ic: number | null
  n_outcomes: number
  approved_by: string
  approved_at: string
  notes: string | null
}

type Change = {
  token: string
  eval_window: string
  old_sign: number | null
  new_sign: number | null
  ic: number | null
  hit_rate: number | null
  n_outcomes: number | null
  confirmed_runs: number | null
  decided_at: string
}

type Proposal = {
  token: string
  eval_window: string
  proposed_sign: number | null
  ic: number | null
  hit_rate: number | null
  n_outcomes: number | null
  proposed_at: string
}

type LiveCal = {
  token: string
  eval_window: string
  ic: number | null
  n_outcomes: number | null
  sign_multiplier: number | null
  confidence_score: number | null
}

const WINDOWS = ['1h', '6h', '24h']

async function getAuthHeaders(): Promise<Record<string, string> | null> {
  try {
    const sb = supabaseBrowser()
    const { data } = await sb.auth.getSession()
    const token = data?.session?.access_token
    if (!token) return null
    return { Authorization: `Bearer ${token}` }
  } catch {
    return null
  }
}

const cellStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderBottom: '1px solid rgba(54,166,186,0.15)',
  fontSize: '0.85rem',
  whiteSpace: 'nowrap',
}

const inputStyle: React.CSSProperties = {
  width: '70px',
  padding: '0.25rem 0.4rem',
  background: '#0a1825',
  border: '1px solid rgba(54,166,186,0.3)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
}

export default function AdminCalibrationPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [changes, setChanges] = useState<Change[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [liveCal, setLiveCal] = useState<LiveCal[]>([])
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'err' } | null>(null)

  // New-row form
  const [newToken, setNewToken] = useState('')
  const [newWindow, setNewWindow] = useState('24h')
  const [newSign, setNewSign] = useState<string>('1')
  const [newConfidence, setNewConfidence] = useState('60')
  const [newIc, setNewIc] = useState('')
  const [newN, setNewN] = useState('100')
  const [newNotes, setNewNotes] = useState('')

  useEffect(() => {
    let cancelled = false
    const sb = supabaseBrowser()
    sb.auth.getUser().then(({ data }) => {
      if (cancelled) return
      const email = data?.user?.email
      if (!email || !isAdmin(email)) {
        setAuthorized(false)
        router.replace('/')
      } else {
        setAuthorized(true)
      }
    })
    return () => { cancelled = true }
  }, [router])

  const flash = (msg: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ msg, tone })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const headers = await getAuthHeaders()
      if (!headers) { setError('Session expired. Sign in again.'); return }
      const res = await fetch('/api/admin/calibration', { headers, cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) { setError(json?.error || `Load failed (${res.status})`); return }
      setSnapshots(json.snapshots || [])
      setChanges(json.changes || [])
      setProposals(json.proposals || [])
      setLiveCal(json.live_calibration || [])
    } catch (e: any) {
      setError(e?.message || 'Unexpected error')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (authorized) load() }, [authorized, load])

  // Map (token, window) → most-recent proposal for the snapshot table.
  const proposalIndex = useMemo(() => {
    const m = new Map<string, Proposal[]>()
    for (const p of proposals) {
      const k = `${p.token}|${p.eval_window}`
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(p)
    }
    return m
  }, [proposals])

  const liveCalIndex = useMemo(() => {
    const m = new Map<string, LiveCal>()
    for (const r of liveCal) m.set(`${r.token}|${r.eval_window}`, r)
    return m
  }, [liveCal])

  const submitRow = async (row: Partial<Snapshot>) => {
    const headers = await getAuthHeaders()
    if (!headers) return flash('Session expired', 'err')
    const res = await fetch('/api/admin/calibration', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return flash(json?.error || `Save failed (${res.status})`, 'err')
    flash(`Approved ${row.token}/${row.eval_window}`)
    await load()
  }

  const deleteRow = async (token: string, evalWindow: string) => {
    if (!confirm(`Delete snapshot override for ${token} ${evalWindow}? Engine will fall back to the live calibrator.`)) return
    const headers = await getAuthHeaders()
    if (!headers) return flash('Session expired', 'err')
    const res = await fetch(
      `/api/admin/calibration?token=${encodeURIComponent(token)}&eval_window=${encodeURIComponent(evalWindow)}`,
      { method: 'DELETE', headers },
    )
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return flash(json?.error || `Delete failed (${res.status})`, 'err')
    flash(`Deleted ${token}/${evalWindow}`)
    await load()
  }

  const onAddRow = (e: React.FormEvent) => {
    e.preventDefault()
    submitRow({
      token: newToken,
      eval_window: newWindow,
      sign_multiplier: newSign === 'null' ? null : Number(newSign),
      confidence_score: Number(newConfidence),
      ic: newIc.trim() === '' ? null : Number(newIc),
      n_outcomes: Number(newN),
      notes: newNotes || null,
    } as any)
  }

  if (authorized === null) {
    return <main style={{ padding: '2rem', color: 'var(--text-primary)' }}>Checking access…</main>
  }
  if (authorized === false) return null

  return (
    <main style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto', color: 'var(--text-primary)' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Signal Calibration</h1>
      <p style={{ opacity: 0.7, fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Operator-curated <code>signal_calibration_snapshot</code> overrides. The engine consults this table when the live
        calibrator&apos;s confidence is too low or its sample size hasn&apos;t cleared the hysteresis gate yet.
      </p>

      {error && (
        <div style={{ background: '#3a1f1f', border: '1px solid #e74c3c', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, padding: '0.75rem 1rem', borderRadius: 6,
          background: toast.tone === 'ok' ? '#1f3a26' : '#3a1f1f',
          border: `1px solid ${toast.tone === 'ok' ? '#2ecc71' : '#e74c3c'}`,
          zIndex: 1000,
        }}>{toast.msg}</div>
      )}

      <Section title="Current snapshot overrides (active)">
        {loading ? <div>Loading…</div> : snapshots.length === 0 ? (
          <div style={{ opacity: 0.6, padding: '0.75rem' }}>
            No overrides. Every token uses the live calibrator (or default +1 if no live row).
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0d2134', textAlign: 'left' }}>
                <th style={cellStyle}>Token</th>
                <th style={cellStyle}>Window</th>
                <th style={cellStyle}>Sign</th>
                <th style={cellStyle}>Confidence</th>
                <th style={cellStyle}>IC</th>
                <th style={cellStyle}>n</th>
                <th style={cellStyle}>Approved by</th>
                <th style={cellStyle}>Approved at</th>
                <th style={cellStyle}>Recent proposals</th>
                <th style={cellStyle}>Notes</th>
                <th style={cellStyle}></th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map(s => {
                const recentProps = (proposalIndex.get(`${s.token}|${s.eval_window}`) || []).slice(0, 3)
                return (
                  <tr key={`${s.token}-${s.eval_window}`}>
                    <td style={cellStyle}><strong>{s.token}</strong></td>
                    <td style={cellStyle}>{s.eval_window}</td>
                    <td style={{ ...cellStyle, color: s.sign_multiplier === -1 ? '#e74c3c' : s.sign_multiplier === 0 ? '#f1c40f' : '#2ecc71' }}>
                      {s.sign_multiplier ?? 'null'}
                    </td>
                    <td style={cellStyle}>{Number(s.confidence_score).toFixed(0)}</td>
                    <td style={cellStyle}>{s.ic === null ? '—' : Number(s.ic).toFixed(3)}</td>
                    <td style={cellStyle}>{s.n_outcomes}</td>
                    <td style={cellStyle}>{s.approved_by}</td>
                    <td style={cellStyle}>{new Date(s.approved_at).toLocaleString()}</td>
                    <td style={{ ...cellStyle, fontSize: '0.75rem', opacity: 0.8 }}>
                      {recentProps.length === 0 ? '—' : recentProps.map(p => `${p.proposed_sign}@${new Date(p.proposed_at).toLocaleDateString()}`).join(', ')}
                    </td>
                    <td style={{ ...cellStyle, maxWidth: 200, whiteSpace: 'normal', fontSize: '0.75rem', opacity: 0.85 }}>{s.notes || '—'}</td>
                    <td style={cellStyle}>
                      <button
                        onClick={() => deleteRow(s.token, s.eval_window)}
                        style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', padding: '0.2rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Add / update snapshot row">
        <form onSubmit={onAddRow} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end', padding: '0.75rem' }}>
          <Field label="Token">
            <input value={newToken} onChange={e => setNewToken(e.target.value.toUpperCase())} placeholder="BTC" style={{ ...inputStyle, width: 90 }} required />
          </Field>
          <Field label="Window">
            <select value={newWindow} onChange={e => setNewWindow(e.target.value)} style={{ ...inputStyle, width: 80 }}>
              {WINDOWS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </Field>
          <Field label="Sign">
            <select value={newSign} onChange={e => setNewSign(e.target.value)} style={{ ...inputStyle, width: 80 }}>
              <option value="1">+1</option>
              <option value="0">0 (mute)</option>
              <option value="-1">−1 (invert)</option>
              <option value="null">null</option>
            </select>
          </Field>
          <Field label="Confidence (0-100)">
            <input type="number" min={0} max={100} value={newConfidence} onChange={e => setNewConfidence(e.target.value)} style={inputStyle} required />
          </Field>
          <Field label="IC">
            <input type="number" step="0.001" value={newIc} onChange={e => setNewIc(e.target.value)} placeholder="0.21" style={inputStyle} />
          </Field>
          <Field label="n outcomes">
            <input type="number" min={0} value={newN} onChange={e => setNewN(e.target.value)} style={inputStyle} required />
          </Field>
          <Field label="Notes (optional)" wide>
            <input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="why this override" style={{ ...inputStyle, width: 300 }} />
          </Field>
          <button type="submit" style={{
            background: '#2ecc71', color: '#0a1825', border: 'none', padding: '0.5rem 1.25rem',
            borderRadius: 4, fontWeight: 600, cursor: 'pointer',
          }}>Approve</button>
        </form>
      </Section>

      <Section title="Live calibrator state (read-only)">
        {liveCal.length === 0 ? (
          <div style={{ opacity: 0.6, padding: '0.75rem' }}>token_signal_calibration is empty.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead><tr style={{ background: '#0d2134', textAlign: 'left' }}>
              <th style={cellStyle}>Token</th><th style={cellStyle}>Window</th>
              <th style={cellStyle}>Sign</th><th style={cellStyle}>Confidence</th>
              <th style={cellStyle}>IC</th><th style={cellStyle}>n</th>
            </tr></thead>
            <tbody>
              {liveCal.slice(0, 200).map(r => (
                <tr key={`${r.token}-${r.eval_window}`}>
                  <td style={cellStyle}>{r.token}</td>
                  <td style={cellStyle}>{r.eval_window}</td>
                  <td style={cellStyle}>{r.sign_multiplier ?? '—'}</td>
                  <td style={cellStyle}>{r.confidence_score === null ? '—' : Number(r.confidence_score).toFixed(0)}</td>
                  <td style={cellStyle}>{r.ic === null ? '—' : Number(r.ic).toFixed(3)}</td>
                  <td style={cellStyle}>{r.n_outcomes ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Recent confirmed flips (calibration_change_log)">
        {changes.length === 0 ? (
          <div style={{ opacity: 0.6, padding: '0.75rem' }}>No flips recorded yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead><tr style={{ background: '#0d2134', textAlign: 'left' }}>
              <th style={cellStyle}>When</th><th style={cellStyle}>Token</th><th style={cellStyle}>Window</th>
              <th style={cellStyle}>Old → New</th><th style={cellStyle}>IC</th>
              <th style={cellStyle}>Hit rate</th><th style={cellStyle}>n</th><th style={cellStyle}>Confirmed runs</th>
            </tr></thead>
            <tbody>
              {changes.map((c, i) => (
                <tr key={i}>
                  <td style={cellStyle}>{new Date(c.decided_at).toLocaleString()}</td>
                  <td style={cellStyle}>{c.token}</td>
                  <td style={cellStyle}>{c.eval_window}</td>
                  <td style={cellStyle}>{c.old_sign ?? '—'} → <strong>{c.new_sign ?? '—'}</strong></td>
                  <td style={cellStyle}>{c.ic === null ? '—' : Number(c.ic).toFixed(3)}</td>
                  <td style={cellStyle}>{c.hit_rate === null ? '—' : Number(c.hit_rate).toFixed(2)}</td>
                  <td style={cellStyle}>{c.n_outcomes ?? '—'}</td>
                  <td style={cellStyle}>{c.confirmed_runs ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Recent proposals (calibration_proposal_log)">
        {proposals.length === 0 ? (
          <div style={{ opacity: 0.6, padding: '0.75rem' }}>No pending proposals.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead><tr style={{ background: '#0d2134', textAlign: 'left' }}>
              <th style={cellStyle}>When</th><th style={cellStyle}>Token</th><th style={cellStyle}>Window</th>
              <th style={cellStyle}>Proposed sign</th><th style={cellStyle}>IC</th>
              <th style={cellStyle}>Hit rate</th><th style={cellStyle}>n</th>
            </tr></thead>
            <tbody>
              {proposals.slice(0, 100).map((p, i) => (
                <tr key={i}>
                  <td style={cellStyle}>{new Date(p.proposed_at).toLocaleString()}</td>
                  <td style={cellStyle}>{p.token}</td>
                  <td style={cellStyle}>{p.eval_window}</td>
                  <td style={cellStyle}>{p.proposed_sign ?? '—'}</td>
                  <td style={cellStyle}>{p.ic === null ? '—' : Number(p.ic).toFixed(3)}</td>
                  <td style={cellStyle}>{p.hit_rate === null ? '—' : Number(p.hit_rate).toFixed(2)}</td>
                  <td style={cellStyle}>{p.n_outcomes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
      border: '1px solid rgba(54, 166, 186, 0.2)',
      borderRadius: 8,
      marginBottom: '1.25rem',
      overflow: 'auto',
    }}>
      <h2 style={{ fontSize: '0.95rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(54,166,186,0.2)', margin: 0 }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', opacity: 0.85, minWidth: wide ? 320 : undefined }}>
      <span>{label}</span>
      {children}
    </label>
  )
}
