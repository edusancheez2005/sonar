'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { isAdmin } from '@/app/lib/adminConfig'

// ─── Constants ──────────────────────────────────────────────────────────
const CHAINS = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'arbitrum', label: 'Arbitrum' },
  { id: 'optimism', label: 'Optimism' },
  { id: 'base', label: 'Base' },
  { id: 'bsc', label: 'BSC' },
  { id: 'avalanche', label: 'Avalanche' },
  { id: 'solana', label: 'Solana' },
  { id: 'bitcoin', label: 'Bitcoin' },
]

const FILTERS = [
  { id: 'empty', label: 'Empty (need backfill)' },
  { id: 'has-addresses', label: 'Has addresses' },
  { id: 'all', label: 'All approved' },
]

// ─── Helpers ────────────────────────────────────────────────────────────
async function getAuthHeaders() {
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

function truncate(addr) {
  if (!addr) return ''
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// ─── Page ───────────────────────────────────────────────────────────────
export default function AdminBackfillPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [figures, setFigures] = useState([])
  const [filter, setFilter] = useState('empty')
  const [search, setSearch] = useState('')
  const [openSlug, setOpenSlug] = useState(null) // slug of figure with side panel open
  const [toast, setToast] = useState(null)

  // Belt-and-suspenders client-side admin check (server layout already
  // gates /admin/*).
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

  const flashToast = (msg, tone = 'info') => {
    setToast({ msg, tone })
    setTimeout(() => setToast(null), 3200)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAuthHeaders()
      if (!headers) {
        setError('Session expired. Sign in again.')
        return
      }
      // Reuse the existing /api/admin/figures GET — we already get
      // every approved row with addresses inline.
      const res = await fetch('/api/admin/figures', { headers, cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || `Load failed (${res.status})`)
        return
      }
      setFigures(json.approved || [])
    } catch (e) {
      setError(e?.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authorized === true) load()
  }, [authorized, load])

  // Sort: empty first, then by display_name. The whole point of this
  // page is to surface the rows that still need backfilling.
  const sorted = useMemo(() => {
    const rows = [...figures]
    rows.sort((a, b) => {
      const ac = (a.addresses || []).length
      const bc = (b.addresses || []).length
      if (ac === 0 && bc > 0) return -1
      if (ac > 0 && bc === 0) return 1
      return String(a.display_name || '').localeCompare(String(b.display_name || ''))
    })
    return rows
  }, [figures])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sorted.filter((r) => {
      const count = (r.addresses || []).length
      if (filter === 'empty' && count > 0) return false
      if (filter === 'has-addresses' && count === 0) return false
      if (q) {
        const hay = `${r.display_name} ${r.slug} ${r.twitter_handle || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [sorted, filter, search])

  const counts = useMemo(() => {
    let empty = 0
    let withAddr = 0
    for (const r of figures) {
      if ((r.addresses || []).length === 0) empty += 1
      else withAddr += 1
    }
    return { empty, withAddr, total: figures.length }
  }, [figures])

  const openFigure = useMemo(
    () => figures.find((f) => f.slug === openSlug) || null,
    [figures, openSlug]
  )

  // After a mutation we refresh from the server (cheap — single
  // request) so the row's addresses + counts stay in sync. We could
  // optimistically patch the local state but the simple refetch is
  // robust against concurrent admin edits.
  const onMutated = async () => {
    await load()
  }

  if (authorized === null) {
    return (
      <main style={pageWrap}>
        <div style={cardCenter}>Verifying admin access…</div>
      </main>
    )
  }
  if (authorized === false) return null

  return (
    <main style={pageWrap}>
      {/* Header */}
      <div style={headerCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={h1Style}>Figures backfill</h1>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Attach verified on-chain addresses to approved figures. Empty figures appear first.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href="/admin/figures"
              style={{
                padding: '0.55rem 1rem',
                background: 'rgba(54, 166, 186, 0.1)',
                border: '1px solid rgba(54, 166, 186, 0.3)',
                borderRadius: '10px',
                color: '#36a6ba',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              ← Moderation
            </Link>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              style={{
                padding: '0.55rem 1rem',
                background: 'rgba(54, 166, 186, 0.15)',
                border: '1px solid rgba(54, 166, 186, 0.4)',
                borderRadius: '10px',
                color: '#36a6ba',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Refreshing…' : '⟳ Refresh'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Pill label="Empty" value={counts.empty} color="#f1c40f" />
          <Pill label="Has addresses" value={counts.withAddr} color="#2ecc71" />
          <Pill label="Total approved" value={counts.total} color="#36a6ba" />
        </div>
      </div>

      {/* Filter / search */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              style={{
                padding: '0.5rem 0.95rem',
                background: active ? 'rgba(54, 166, 186, 0.2)' : 'rgba(54, 166, 186, 0.06)',
                border: `1px solid ${active ? '#36a6ba' : 'rgba(54, 166, 186, 0.2)'}`,
                borderRadius: '999px',
                color: active ? '#36a6ba' : 'var(--text-secondary)',
                fontWeight: active ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          )
        })}
        <input
          type="search"
          placeholder="Search by name, slug, twitter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '1 1 240px',
            padding: '0.55rem 0.85rem',
            background: 'rgba(13, 33, 52, 0.6)',
            border: '1px solid rgba(54, 166, 186, 0.25)',
            borderRadius: '10px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
      </div>

      {error ? (
        <div style={errorBox} role="alert">{error}</div>
      ) : null}

      {loading && filtered.length === 0 ? (
        <div style={cardCenter}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={cardCenter}>No figures match the current filter.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {filtered.map((row) => (
            <BackfillRow
              key={row.slug}
              row={row}
              onOpen={() => setOpenSlug(row.slug)}
            />
          ))}
        </div>
      )}

      {openFigure ? (
        <SidePanel
          figure={openFigure}
          onClose={() => setOpenSlug(null)}
          onMutated={onMutated}
          flashToast={flashToast}
        />
      ) : null}

      {toast ? <Toast toast={toast} /> : null}
    </main>
  )
}

// ─── Row ────────────────────────────────────────────────────────────────
function BackfillRow({ row, onOpen }) {
  const count = (row.addresses || []).length
  const empty = count === 0
  return (
    <article
      onClick={onOpen}
      style={{
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: empty
          ? '1px solid rgba(241, 196, 15, 0.45)'
          : '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '14px',
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        cursor: 'pointer',
        transition: 'transform 80ms ease',
      }}
    >
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <strong style={{ color: 'var(--text-primary)', fontSize: '0.98rem' }}>
            {row.display_name}
          </strong>
          <code style={{ color: '#36a6ba', fontSize: '0.78rem', fontFamily: "'Courier New', monospace" }}>
            {row.slug}
          </code>
          <span
            style={{
              padding: '0.15rem 0.5rem',
              background: 'rgba(54, 166, 186, 0.1)',
              border: '1px solid rgba(54, 166, 186, 0.25)',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            {row.category}
          </span>
          {row.is_featured ? (
            <span
              style={{
                padding: '0.15rem 0.5rem',
                background: 'rgba(241, 196, 15, 0.12)',
                border: '1px solid rgba(241, 196, 15, 0.4)',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#f1c40f',
              }}
            >
              ★ FEATURED
            </span>
          ) : null}
        </div>
        {row.description ? (
          <div
            style={{
              marginTop: '0.2rem',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.description}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span
          style={{
            padding: '0.3rem 0.7rem',
            background: empty ? 'rgba(241, 196, 15, 0.12)' : 'rgba(46, 204, 113, 0.1)',
            border: empty
              ? '1px solid rgba(241, 196, 15, 0.4)'
              : '1px solid rgba(46, 204, 113, 0.3)',
            borderRadius: '999px',
            color: empty ? '#f1c40f' : '#2ecc71',
            fontSize: '0.78rem',
            fontWeight: 700,
          }}
        >
          {empty ? 'EMPTY' : `${count} addr`}
        </span>
        <span
          aria-hidden="true"
          style={{
            color: '#36a6ba',
            fontSize: '1.2rem',
            padding: '0.2rem 0.4rem',
          }}
        >
          ›
        </span>
      </div>
    </article>
  )
}

// ─── Side Panel (add / remove addresses) ────────────────────────────────
function SidePanel({ figure, onClose, onMutated, flashToast }) {
  const [chain, setChain] = useState('ethereum')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [source, setSource] = useState('')
  const [verified, setVerified] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState(null) // address being removed
  const [togglingFeatured, setTogglingFeatured] = useState(false)

  const reset = () => {
    setAddress('')
    setNote('')
    setSource('')
    setVerified(true)
  }

  const onAdd = async (e) => {
    e.preventDefault()
    if (submitting) return
    if (!address.trim()) {
      flashToast('Address is required', 'error')
      return
    }
    if (verified && !source.trim()) {
      flashToast('Source URL is required when marking verified', 'error')
      return
    }
    setSubmitting(true)
    try {
      const headers = await getAuthHeaders()
      if (!headers) {
        flashToast('Session expired', 'error')
        return
      }
      const res = await fetch(`/api/admin/figures/${encodeURIComponent(figure.slug)}/addresses`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          chain,
          note: note.trim(),
          source: source.trim(),
          verified,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        flashToast(json?.error || `Add failed (${res.status})`, 'error')
        return
      }
      flashToast('Address added', 'success')
      reset()
      await onMutated()
    } finally {
      setSubmitting(false)
    }
  }

  const onRemove = async (a) => {
    if (!confirm(`Remove ${a.address} (${a.chain}) from ${figure.display_name}?`)) return
    setRemoving(a.address)
    try {
      const headers = await getAuthHeaders()
      if (!headers) {
        flashToast('Session expired', 'error')
        return
      }
      const url = `/api/admin/figures/${encodeURIComponent(figure.slug)}/addresses?` +
        `address=${encodeURIComponent(a.address)}&chain=${encodeURIComponent(a.chain)}`
      const res = await fetch(url, { method: 'DELETE', headers })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        flashToast(json?.error || `Remove failed (${res.status})`, 'error')
        return
      }
      flashToast('Address removed', 'success')
      await onMutated()
    } finally {
      setRemoving(null)
    }
  }

  const onToggleFeatured = async () => {
    if (togglingFeatured) return
    setTogglingFeatured(true)
    try {
      const headers = await getAuthHeaders()
      if (!headers) {
        flashToast('Session expired', 'error')
        return
      }
      const res = await fetch(`/api/admin/figures/${encodeURIComponent(figure.slug)}/addresses`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !figure.is_featured }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        flashToast(json?.error || `Toggle failed (${res.status})`, 'error')
        return
      }
      flashToast(figure.is_featured ? 'Unfeatured' : 'Featured', 'success')
      await onMutated()
    } finally {
      setTogglingFeatured(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 90,
        }}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label={`Edit addresses for ${figure.display_name}`}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 'min(520px, 100vw)',
          background: '#0a1928',
          borderLeft: '1px solid rgba(54, 166, 186, 0.3)',
          zIndex: 100,
          padding: '1.5rem 1.25rem',
          overflowY: 'auto',
          color: 'var(--text-primary)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              {figure.display_name}
            </h2>
            <code style={{ color: '#36a6ba', fontSize: '0.8rem' }}>{figure.slug}</code>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: '1px solid rgba(54, 166, 186, 0.3)',
              color: '#36a6ba',
              borderRadius: '8px',
              padding: '0.3rem 0.6rem',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onToggleFeatured}
            disabled={togglingFeatured || (!figure.is_featured && (figure.addresses || []).length === 0)}
            title={
              !figure.is_featured && (figure.addresses || []).length === 0
                ? 'Add at least one address before featuring'
                : ''
            }
            style={{
              padding: '0.4rem 0.85rem',
              background: figure.is_featured ? 'rgba(241, 196, 15, 0.18)' : 'rgba(54, 166, 186, 0.1)',
              border: figure.is_featured
                ? '1px solid rgba(241, 196, 15, 0.5)'
                : '1px solid rgba(54, 166, 186, 0.3)',
              borderRadius: '999px',
              color: figure.is_featured ? '#f1c40f' : '#36a6ba',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: togglingFeatured ? 0.5 : 1,
            }}
          >
            {figure.is_featured ? '★ Featured (click to unfeature)' : '☆ Feature this figure'}
          </button>
          <a
            href={`/figure/${encodeURIComponent(figure.slug)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.4rem 0.85rem',
              background: 'rgba(54, 166, 186, 0.1)',
              border: '1px solid rgba(54, 166, 186, 0.3)',
              borderRadius: '999px',
              color: '#36a6ba',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            View public page ↗
          </a>
        </div>

        {/* Existing addresses */}
        <h3 style={{ marginTop: '1.25rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Current addresses ({(figure.addresses || []).length})
        </h3>
        {(figure.addresses || []).length === 0 ? (
          <div style={{ padding: '0.7rem 0.85rem', background: 'rgba(241, 196, 15, 0.06)', border: '1px dashed rgba(241, 196, 15, 0.4)', borderRadius: '10px', color: '#f1c40f', fontSize: '0.85rem' }}>
            No addresses yet. Add one below.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(figure.addresses || []).map((a) => (
              <li
                key={`${a.chain}-${a.address}`}
                style={{
                  padding: '0.6rem 0.7rem',
                  background: 'rgba(13, 33, 52, 0.7)',
                  border: '1px solid rgba(54, 166, 186, 0.2)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '0.1rem 0.45rem',
                      background: 'rgba(54, 166, 186, 0.18)',
                      borderRadius: '6px',
                      color: '#36a6ba',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {a.chain}
                  </span>
                  <code style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontFamily: "'Courier New', monospace" }} title={a.address}>
                    {truncate(a.address)}
                  </code>
                  {a.verified ? (
                    <span style={{ color: '#2ecc71', fontSize: '0.72rem', fontWeight: 700 }}>✓ verified</span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>unverified</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(a)}
                    disabled={removing === a.address}
                    style={{
                      marginLeft: 'auto',
                      padding: '0.2rem 0.55rem',
                      background: 'rgba(231, 76, 60, 0.12)',
                      border: '1px solid rgba(231, 76, 60, 0.4)',
                      borderRadius: '6px',
                      color: '#e74c3c',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      opacity: removing === a.address ? 0.5 : 1,
                    }}
                  >
                    {removing === a.address ? '…' : 'Remove'}
                  </button>
                </div>
                {a.note ? (
                  <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {a.note}
                  </div>
                ) : null}
                {a.source ? (
                  <a
                    href={a.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: '0.2rem', fontSize: '0.74rem', color: '#36a6ba', wordBreak: 'break-all' }}
                  >
                    {a.source}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {/* Add form */}
        <h3 style={{ marginTop: '1.25rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Add address
        </h3>
        <form onSubmit={onAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
          <label style={labelStyle}>
            Chain
            <select value={chain} onChange={(e) => setChain(e.target.value)} style={inputStyle}>
              {CHAINS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Address
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x… or base58"
              style={{ ...inputStyle, fontFamily: "'Courier New', monospace" }}
              required
            />
          </label>

          <label style={labelStyle}>
            Note <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(public name tag, e.g. "vitalik.eth")</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={280}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Source URL <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(required if verified)</span>
            <input
              type="url"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="https://etherscan.io/address/0x…"
              maxLength={500}
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
            />
            Verified (I confirmed ownership via the source URL above)
          </label>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.7rem 1rem',
              background: '#36a6ba',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Adding…' : '+ Add address'}
          </button>
        </form>
      </aside>
    </>
  )
}

// ─── Visual primitives ──────────────────────────────────────────────────
function Pill({ label, value, color }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.35rem 0.8rem',
        background: 'rgba(54, 166, 186, 0.08)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '999px',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
        }}
      />
      <strong style={{ color: 'var(--text-primary)' }}>{value}</strong>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </span>
  )
}

function Toast({ toast }) {
  const tones = {
    info: { bg: 'rgba(54, 166, 186, 0.15)', border: 'rgba(54, 166, 186, 0.4)', color: '#36a6ba' },
    success: { bg: 'rgba(46, 204, 113, 0.15)', border: 'rgba(46, 204, 113, 0.4)', color: '#2ecc71' },
    warn: { bg: 'rgba(241, 196, 15, 0.15)', border: 'rgba(241, 196, 15, 0.4)', color: '#f1c40f' },
    error: { bg: 'rgba(231, 76, 60, 0.15)', border: 'rgba(231, 76, 60, 0.4)', color: '#e74c3c' },
  }
  const s = tones[toast.tone] || tones.info
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        padding: '0.85rem 1.1rem',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: '10px',
        color: s.color,
        fontWeight: 600,
        fontSize: '0.9rem',
        zIndex: 200,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      {toast.msg}
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────
const pageWrap = {
  padding: '2rem 1rem',
  maxWidth: '1100px',
  margin: '0 auto',
  color: 'var(--text-primary)',
}

const cardCenter = {
  background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
  border: '1px solid rgba(54, 166, 186, 0.2)',
  borderRadius: '16px',
  padding: '2.5rem 1.5rem',
  textAlign: 'center',
  color: 'var(--text-secondary)',
}

const headerCard = {
  background: 'linear-gradient(135deg, #0d2134 0%, #1a2f42 100%)',
  border: '1px solid rgba(54, 166, 186, 0.25)',
  borderRadius: '20px',
  padding: '1.75rem',
  marginBottom: '1.25rem',
}

const h1Style = {
  fontSize: 'clamp(1.4rem, 3vw, 2rem)',
  fontWeight: 800,
  margin: '0 0 0.3rem 0',
  color: 'var(--text-primary)',
}

const errorBox = {
  padding: '0.85rem 1rem',
  background: 'rgba(231, 76, 60, 0.1)',
  border: '1px solid rgba(231, 76, 60, 0.4)',
  borderRadius: '12px',
  color: '#e74c3c',
  marginBottom: '1rem',
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
}

const inputStyle = {
  padding: '0.55rem 0.75rem',
  background: 'rgba(13, 33, 52, 0.7)',
  border: '1px solid rgba(54, 166, 186, 0.3)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
}
