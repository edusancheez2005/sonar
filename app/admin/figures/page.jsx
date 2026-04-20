'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { isAdmin } from '@/app/lib/adminConfig'

const TABS = [
  { id: 'pending', label: 'Pending', color: '#f1c40f' },
  { id: 'approved', label: 'Approved', color: '#2ecc71' },
  { id: 'rejected', label: 'Rejected', color: '#e74c3c' },
]

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

export default function AdminFiguresPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(null) // null | false | true
  const [activeTab, setActiveTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState({
    pending: [],
    approved: [],
    rejected: [],
    counts: { pending: 0, approved: 0, rejected: 0 },
  })
  const [busySlugs, setBusySlugs] = useState(() => new Set())
  const [rejectDialog, setRejectDialog] = useState(null) // { slug, display_name } | null
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState(null)

  const markBusy = (slug, on) => {
    setBusySlugs((prev) => {
      const next = new Set(prev)
      if (on) next.add(slug)
      else next.delete(slug)
      return next
    })
  }

  // Belt-and-suspenders auth check. The /admin layout already redirects
  // non-admins server-side; this is a second gate for UX (we render a
  // "not authorized" state before dispatching any API calls).
  useEffect(() => {
    let cancelled = false
    const sb = supabaseBrowser()
    const check = async () => {
      try {
        const { data } = await sb.auth.getUser()
        if (cancelled) return
        const email = data?.user?.email
        if (!email || !isAdmin(email)) {
          setAuthorized(false)
          router.replace('/')
          return
        }
        setAuthorized(true)
      } catch {
        if (!cancelled) {
          setAuthorized(false)
          router.replace('/')
        }
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAuthHeaders()
      if (!headers) {
        setError('Session expired. Sign in again.')
        return
      }
      const res = await fetch('/api/admin/figures', { headers, cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || `Load failed (${res.status})`)
        return
      }
      setData({
        pending: json.pending || [],
        approved: json.approved || [],
        rejected: json.rejected || [],
        counts: json.counts || { pending: 0, approved: 0, rejected: 0 },
      })
    } catch (e) {
      setError(e?.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authorized === true) load()
  }, [authorized, load])

  const flashToast = (msg, tone = 'info') => {
    setToast({ msg, tone })
    setTimeout(() => setToast(null), 3200)
  }

  const patchRow = async (slug, status, rejection_reason = null) => {
    markBusy(slug, true)
    try {
      const headers = await getAuthHeaders()
      if (!headers) {
        flashToast('Session expired', 'error')
        return
      }
      const res = await fetch('/api/admin/figures', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, status, rejection_reason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        flashToast(json?.error || `Update failed (${res.status})`, 'error')
        return
      }
      // Fire-and-forget avatar pin on approval. We don't await because
      // the user feedback shouldn't be blocked on a network fetch that
      // may probe ENS + unavatar.
      if (status === 'approved') {
        fetch('/api/admin/fetch-avatar', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        })
          .then((r) => r.json().catch(() => null))
          .then((out) => {
            if (out?.source) {
              flashToast(`Avatar pinned via ${out.source}`, 'info')
            }
          })
          .catch(() => {
            // silent
          })
      }
      flashToast(
        status === 'approved'
          ? `Approved ${slug}`
          : status === 'rejected'
            ? `Rejected ${slug}`
            : `Updated ${slug}`,
        status === 'rejected' ? 'warn' : 'success'
      )
      await load()
    } finally {
      markBusy(slug, false)
    }
  }

  const onApprove = (row) => patchRow(row.slug, 'approved')
  const onReject = (row) => {
    setRejectDialog({ slug: row.slug, display_name: row.display_name })
    setRejectReason('')
  }
  const confirmReject = async () => {
    if (!rejectDialog) return
    const reason = rejectReason.trim()
    if (reason.length < 3) {
      flashToast('Rejection reason must be at least 3 characters', 'error')
      return
    }
    const slug = rejectDialog.slug
    setRejectDialog(null)
    await patchRow(slug, 'rejected', reason)
  }

  const activeRows = useMemo(() => data[activeTab] || [], [data, activeTab])

  if (authorized === null) {
    return (
      <main
        className="container"
        style={{ padding: '2rem 1rem', maxWidth: '1200px', color: 'var(--text-primary)' }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
            border: '1px solid rgba(54, 166, 186, 0.2)',
            borderRadius: '16px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          Verifying admin access…
        </div>
      </main>
    )
  }
  if (authorized === false) return null

  return (
    <main
      className="container"
      style={{ padding: '2rem 1rem', maxWidth: '1200px', color: 'var(--text-primary)' }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #0d2134 0%, #1a2f42 100%)',
          border: '1px solid rgba(54, 166, 186, 0.25)',
          borderRadius: '20px',
          padding: '1.75rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
                fontWeight: 800,
                marginBottom: '0.35rem',
                color: 'var(--text-primary)',
              }}
            >
              Figures moderation
            </h1>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Review community submissions and manage the public directory.
            </div>
          </div>
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

        {/* Stats bar */}
        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
          }}
        >
          <StatPill label="Pending" value={data.counts.pending} color="#f1c40f" />
          <StatPill label="Approved" value={data.counts.approved} color="#2ecc71" />
          <StatPill label="Rejected" value={data.counts.rejected} color="#e74c3c" />
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Moderation status"
        style={{
          display: 'flex',
          gap: '0.25rem',
          overflowX: 'auto',
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(54, 166, 186, 0.2)',
        }}
      >
        {TABS.map((t) => {
          const isActive = activeTab === t.id
          const count = data.counts?.[t.id] ?? 0
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '0.7rem 1.1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? t.color : 'transparent'}`,
                marginBottom: '-1px',
                color: isActive ? t.color : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.95rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {t.label} ({count})
            </button>
          )
        })}
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            padding: '0.85rem 1rem',
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.4)',
            borderRadius: '12px',
            color: '#e74c3c',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      ) : null}

      {loading && activeRows.length === 0 ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
            border: '1px solid rgba(54, 166, 186, 0.2)',
            borderRadius: '16px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          Loading…
        </div>
      ) : activeRows.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {activeRows.map((row) => (
            <FigureRow
              key={row.slug}
              row={row}
              tab={activeTab}
              busy={busySlugs.has(row.slug)}
              onApprove={() => onApprove(row)}
              onReject={() => onReject(row)}
            />
          ))}
        </div>
      )}

      {rejectDialog ? (
        <RejectModal
          figure={rejectDialog}
          reason={rejectReason}
          onReason={setRejectReason}
          onCancel={() => setRejectDialog(null)}
          onConfirm={confirmReject}
        />
      ) : null}

      {toast ? <Toast toast={toast} /> : null}
    </main>
  )
}

// ─── Pieces ──────────────────────────────────────────────────────────────

function StatPill({ label, value, color }) {
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
          display: 'inline-block',
        }}
      />
      <strong style={{ color: 'var(--text-primary)' }}>{value}</strong>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </span>
  )
}

function EmptyState({ tab }) {
  const msg =
    tab === 'pending'
      ? 'Nothing pending. Great work.'
      : tab === 'approved'
        ? 'No approved submissions yet.'
        : 'No rejections yet.'
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '16px',
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        color: 'var(--text-secondary)',
      }}
    >
      {msg}
    </div>
  )
}

function FigureRow({ row, tab, busy, onApprove, onReject }) {
  const [expanded, setExpanded] = useState(false)
  const catStyle = categoryStyle(row.category)
  const created = row.created_at ? new Date(row.created_at) : null
  const proofUrl = extractFirstUrl(row.submission_proof)
  return (
    <article
      style={{
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '16px',
        padding: '1.1rem 1.2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.7rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
            <a
              href={`/figure/${encodeURIComponent(row.slug)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                textDecoration: 'none',
                wordBreak: 'break-word',
              }}
            >
              {row.display_name}
            </a>
            <span
              style={{
                padding: '0.18rem 0.55rem',
                background: catStyle.bg,
                border: `1px solid ${catStyle.border}`,
                borderRadius: '999px',
                color: catStyle.color,
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              {row.category}
            </span>
            {row.is_featured ? (
              <span
                style={{
                  padding: '0.18rem 0.55rem',
                  background: 'rgba(241, 196, 15, 0.12)',
                  border: '1px solid rgba(241, 196, 15, 0.4)',
                  borderRadius: '999px',
                  color: '#f1c40f',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
              >
                ★ FEATURED
              </span>
            ) : null}
          </div>
          <div
            style={{
              marginTop: '0.2rem',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <span>
              <code style={{ fontFamily: "'Courier New', monospace", color: '#36a6ba' }}>
                {row.slug}
              </code>
            </span>
            {row.submitter_email ? (
              <span>
                by{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {row.submitter_email}
                </strong>
              </span>
            ) : row.submitted_by ? (
              <span>by submitter {row.submitted_by.slice(0, 8)}…</span>
            ) : (
              <span>seed</span>
            )}
            {created ? (
              <span title={created.toISOString()}>
                · submitted {created.toLocaleString()}
              </span>
            ) : null}
            {row.twitter_handle ? (
              <span>
                ·{' '}
                <a
                  href={`https://twitter.com/${row.twitter_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#36a6ba', textDecoration: 'none' }}
                >
                  @{row.twitter_handle}
                </a>
              </span>
            ) : null}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {tab === 'pending' || tab === 'rejected' ? (
            <ActionButton tone="approve" onClick={onApprove} disabled={busy}>
              {tab === 'rejected' ? '↺ Re-approve' : '✓ Approve'}
            </ActionButton>
          ) : null}
          {tab === 'pending' || tab === 'approved' ? (
            <ActionButton tone="reject" onClick={onReject} disabled={busy}>
              {tab === 'approved' ? '↺ Re-reject' : '✗ Reject'}
            </ActionButton>
          ) : null}
        </div>
      </div>

      {row.description ? (
        <div style={{ color: 'var(--text-primary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
          {row.description}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {(row.addresses || []).slice(0, 8).map((a, i) => (
          <span
            key={`${a.address}-${i}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.6rem',
              background: 'rgba(54, 166, 186, 0.08)',
              border: '1px solid rgba(54, 166, 186, 0.2)',
              borderRadius: '8px',
              fontFamily: "'Courier New', monospace",
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
            }}
            title={a.address}
          >
            <span
              style={{
                padding: '0.05rem 0.4rem',
                background: 'rgba(54, 166, 186, 0.2)',
                borderRadius: '6px',
                color: '#36a6ba',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                fontFamily: 'inherit',
              }}
            >
              {a.chain}
            </span>
            <span>{truncate(a.address)}</span>
          </span>
        ))}
        {(row.addresses || []).length > 8 ? (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            +{row.addresses.length - 8} more
          </span>
        ) : null}
      </div>

      {row.submission_proof ? (
        <div
          style={{
            padding: '0.6rem 0.85rem',
            background: 'rgba(54, 166, 186, 0.05)',
            border: '1px solid rgba(54, 166, 186, 0.15)',
            borderRadius: '10px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: '#36a6ba',
              marginBottom: '0.3rem',
            }}
          >
            Proof
          </div>
          {proofUrl ? (
            <a
              href={proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#36a6ba', textDecoration: 'none' }}
            >
              {proofUrl}
            </a>
          ) : (
            <span style={{ color: 'var(--text-primary)' }}>
              {expanded
                ? row.submission_proof
                : row.submission_proof.length > 180
                  ? row.submission_proof.slice(0, 180) + '…'
                  : row.submission_proof}
            </span>
          )}
          {row.submission_proof.length > 180 ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              style={{
                display: 'block',
                marginTop: '0.3rem',
                background: 'none',
                border: 'none',
                color: '#36a6ba',
                cursor: 'pointer',
                fontSize: '0.78rem',
                padding: 0,
              }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          ) : null}
        </div>
      ) : null}

      {row.rejection_reason ? (
        <div
          style={{
            padding: '0.6rem 0.85rem',
            background: 'rgba(231, 76, 60, 0.08)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: '10px',
            color: '#e74c3c',
            fontSize: '0.85rem',
          }}
        >
          <strong>Rejection reason:</strong> {row.rejection_reason}
        </div>
      ) : null}
    </article>
  )
}

function ActionButton({ tone, children, disabled, onClick }) {
  const scheme =
    tone === 'approve'
      ? { bg: 'rgba(46, 204, 113, 0.18)', border: 'rgba(46, 204, 113, 0.5)', color: '#2ecc71' }
      : { bg: 'rgba(231, 76, 60, 0.15)', border: 'rgba(231, 76, 60, 0.5)', color: '#e74c3c' }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '0.5rem 0.95rem',
        background: scheme.bg,
        border: `1px solid ${scheme.border}`,
        borderRadius: '10px',
        color: scheme.color,
        fontSize: '0.85rem',
        fontWeight: 700,
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function RejectModal({ figure, reason, onReason, onCancel, onConfirm }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reject submission"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 22, 33, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        zIndex: 50,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(135deg, #0d2134 0%, #1a2f42 100%)',
          border: '1px solid rgba(231, 76, 60, 0.35)',
          borderRadius: '18px',
          padding: '1.5rem',
          color: 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '1px',
              color: '#e74c3c',
              textTransform: 'uppercase',
              marginBottom: '0.3rem',
            }}
          >
            Reject submission
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
            {figure.display_name}{' '}
            <span
              style={{
                fontFamily: "'Courier New', monospace",
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}
            >
              ({figure.slug})
            </span>
          </h2>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: '#36a6ba',
            }}
          >
            Rejection reason
          </span>
          <textarea
            value={reason}
            onChange={(e) => onReason(e.target.value)}
            placeholder="Briefly explain so the submitter knows what to improve"
            rows={4}
            maxLength={500}
            autoFocus
            style={{
              padding: '0.75rem 0.9rem',
              background: 'rgba(54, 166, 186, 0.08)',
              border: '1px solid rgba(54, 166, 186, 0.3)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.6rem 1.1rem',
              background: 'transparent',
              border: '1px solid rgba(54, 166, 186, 0.3)',
              borderRadius: '10px',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '0.6rem 1.25rem',
              background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
              border: '1px solid rgba(231, 76, 60, 0.6)',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

function Toast({ toast }) {
  const color =
    toast.tone === 'error'
      ? '#e74c3c'
      : toast.tone === 'warn'
        ? '#f1c40f'
        : toast.tone === 'success'
          ? '#2ecc71'
          : '#36a6ba'
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        padding: '0.7rem 1.1rem',
        background: 'rgba(13, 33, 52, 0.96)',
        border: `1px solid ${color}`,
        borderRadius: '12px',
        color: 'var(--text-primary)',
        fontSize: '0.9rem',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 60,
      }}
    >
      <strong style={{ color, marginRight: '0.4rem' }}>●</strong>
      {toast.msg}
    </div>
  )
}

// ─── Local helpers ───────────────────────────────────────────────────────
function truncate(v) {
  const s = String(v || '')
  if (s.length <= 12) return s
  return `${s.slice(0, 6)}…${s.slice(-4)}`
}

function extractFirstUrl(s) {
  if (!s) return null
  const m = String(s).match(/https?:\/\/[^\s]+/i)
  return m ? m[0] : null
}

function categoryStyle(cat) {
  const palette = {
    person: { color: '#36a6ba', bg: 'rgba(54, 166, 186, 0.12)', border: 'rgba(54, 166, 186, 0.35)' },
    company: { color: '#f1c40f', bg: 'rgba(241, 196, 15, 0.12)', border: 'rgba(241, 196, 15, 0.35)' },
    government: { color: '#9b59b6', bg: 'rgba(155, 89, 182, 0.14)', border: 'rgba(155, 89, 182, 0.4)' },
    protocol: { color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.12)', border: 'rgba(46, 204, 113, 0.35)' },
    celebrity: { color: '#e67e22', bg: 'rgba(230, 126, 34, 0.12)', border: 'rgba(230, 126, 34, 0.35)' },
  }
  return palette[String(cat || '').toLowerCase()] || palette.company
}
