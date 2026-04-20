'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const CATEGORIES = [
  { value: 'person', label: 'Person' },
  { value: 'company', label: 'Company' },
  { value: 'government', label: 'Government' },
  { value: 'protocol', label: 'Protocol' },
  { value: 'celebrity', label: 'Celebrity' },
]

const CHAINS = [
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'solana', label: 'Solana' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'base', label: 'Base' },
]

const DESC_LIMIT = 280
const SLUG_MAX = 60

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
}

function emptyAddress() {
  return { address: '', chain: 'ethereum', note: '' }
}

export default function FigureSubmitClient() {
  const [displayName, setDisplayName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugDirty, setSlugDirty] = useState(false) // user has edited the slug manually
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('person')
  const [twitter, setTwitter] = useState('')
  const [addresses, setAddresses] = useState([emptyAddress()])
  const [proof, setProof] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth.getUser().then(({ data }) => {
      setUserEmail(data?.user?.email || '')
    })
  }, [])

  // Auto-fill slug from display name while the user hasn't explicitly
  // edited the slug field. Once they touch it we stop overwriting.
  useEffect(() => {
    if (!slugDirty) setSlug(slugify(displayName))
  }, [displayName, slugDirty])

  const addrErrors = useMemo(() => {
    return addresses.map((a) => {
      const v = a.address.trim()
      if (!v) return 'Address is required'
      // Very loose per-chain validation so we don't reject obscure formats.
      if (a.chain === 'ethereum' || a.chain === 'polygon' || a.chain === 'arbitrum' || a.chain === 'base') {
        return /^0x[a-fA-F0-9]{40}$/.test(v) ? null : 'Expected 0x-prefixed 40-hex address'
      }
      if (a.chain === 'bitcoin') {
        return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{10,87}$/.test(v) ? null : 'Expected Bitcoin address'
      }
      if (a.chain === 'solana') {
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v) ? null : 'Expected Solana Base58 address'
      }
      return null
    })
  }, [addresses])

  const clientErrors = useMemo(() => {
    const errors = {}
    if (!displayName.trim()) errors.displayName = 'Display name is required'
    if (!slug.trim()) errors.slug = 'Slug is required'
    else if (!/^[a-z0-9-]+$/.test(slug)) errors.slug = 'Slug must be lowercase letters, numbers, dashes'
    if (!description.trim()) errors.description = 'Description is required'
    else if (description.length > DESC_LIMIT) errors.description = `Max ${DESC_LIMIT} characters`
    if (!category) errors.category = 'Category is required'
    if (!proof.trim()) errors.proof = 'Proof link or source is required'
    if (addresses.length === 0) errors.addresses = 'Add at least one address'
    if (addrErrors.some((e) => e)) errors.addresses = 'Fix the address errors above'
    return errors
  }, [displayName, slug, description, category, proof, addresses, addrErrors])

  const canSubmit = !submitting && Object.keys(clientErrors).length === 0

  const updateAddress = (idx, patch) => {
    setAddresses((arr) => arr.map((a, i) => (i === idx ? { ...a, ...patch } : a)))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setServerError(null)
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const sb = supabaseBrowser()
      const { data } = await sb.auth.getSession()
      const token = data?.session?.access_token
      if (!token) {
        setServerError('Your session expired. Please sign in again.')
        return
      }
      const payload = {
        slug: slug.trim(),
        display_name: displayName.trim(),
        description: description.trim(),
        category,
        twitter_handle: twitter.trim().replace(/^@+/, '') || null,
        addresses: addresses.map((a) => ({
          address: a.address.trim(),
          chain: a.chain,
          note: a.note.trim() || null,
        })),
        submission_proof: proof.trim(),
      }
      const res = await fetch('/api/figures/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setServerError(json?.error || `Submission failed (${res.status})`)
        return
      }
      setSuccess({ slug: json?.slug || payload.slug })
    } catch (err) {
      setServerError(err?.message || 'Unexpected error')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div
        style={{
          background:
            'linear-gradient(135deg, rgba(46, 204, 113, 0.12) 0%, rgba(54, 166, 186, 0.08) 100%)',
          border: '1px solid rgba(46, 204, 113, 0.4)',
          borderRadius: '18px',
          padding: '2rem',
          color: 'var(--text-primary)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✓</div>
        <h2 style={{ marginBottom: '0.5rem', fontWeight: 800, fontSize: '1.4rem' }}>
          Submitted!
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Thanks — a Sonar editor will review <strong>{success.slug}</strong>{' '}
          within 48 hours. You'll see it on <code>/figures</code> once
          it's approved.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/figures"
            style={{
              padding: '0.7rem 1.25rem',
              background: 'rgba(54, 166, 186, 0.2)',
              border: '1px solid rgba(54, 166, 186, 0.4)',
              borderRadius: '12px',
              color: '#36a6ba',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            ← Back to figures
          </a>
          <button
            type="button"
            onClick={() => {
              setSuccess(null)
              setDisplayName('')
              setSlug('')
              setSlugDirty(false)
              setDescription('')
              setCategory('person')
              setTwitter('')
              setAddresses([emptyAddress()])
              setProof('')
            }}
            style={{
              padding: '0.7rem 1.25rem',
              background: 'transparent',
              border: '1px solid rgba(54, 166, 186, 0.3)',
              borderRadius: '12px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Submit another
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.25)',
        borderRadius: '20px',
        padding: '1.75rem',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {userEmail ? (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Submitting as <strong style={{ color: 'var(--text-primary)' }}>{userEmail}</strong>
        </div>
      ) : null}

      <Field label="Display name" error={clientErrors.displayName} required>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Brian Armstrong"
          maxLength={120}
          style={inputStyle(!!clientErrors.displayName)}
        />
      </Field>

      <Field
        label="Slug"
        error={clientErrors.slug}
        required
        hint="Lowercase letters, numbers, dashes. Auto-generated from display name."
      >
        <input
          type="text"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value)
            setSlugDirty(true)
          }}
          placeholder="brian-armstrong"
          maxLength={SLUG_MAX}
          style={{
            ...inputStyle(!!clientErrors.slug),
            fontFamily: "'Courier New', monospace",
          }}
        />
      </Field>

      <Field
        label="Description"
        error={clientErrors.description}
        required
        hint={`${description.length}/${DESC_LIMIT}`}
      >
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, DESC_LIMIT + 50))}
          placeholder="Co-founder and CEO of Coinbase"
          rows={3}
          style={{ ...inputStyle(!!clientErrors.description), resize: 'vertical' }}
        />
      </Field>

      <Field label="Category" error={clientErrors.category} required>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle(false)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Twitter handle"
        hint="Optional. We use this to fetch a profile photo if no avatar is pinned."
      >
        <input
          type="text"
          value={twitter}
          onChange={(e) => setTwitter(e.target.value)}
          placeholder="brian_armstrong"
          maxLength={20}
          style={inputStyle(false)}
        />
      </Field>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
          <span style={labelStyle()}>
            Addresses <span style={requiredStyle()}>*</span>
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            At least one required.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {addresses.map((a, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) minmax(120px, 1fr) minmax(0, 1.5fr) auto',
                gap: '0.5rem',
                alignItems: 'start',
                padding: '0.75rem',
                background: 'rgba(54, 166, 186, 0.05)',
                border: '1px solid rgba(54, 166, 186, 0.2)',
                borderRadius: '12px',
              }}
              className="sonar-address-row"
            >
              <div>
                <input
                  type="text"
                  value={a.address}
                  onChange={(e) => updateAddress(idx, { address: e.target.value })}
                  placeholder="0x… / bc1… / Base58"
                  style={{
                    ...inputStyle(!!addrErrors[idx]),
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.88rem',
                  }}
                />
                {addrErrors[idx] ? (
                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#e74c3c' }}>
                    {addrErrors[idx]}
                  </div>
                ) : null}
              </div>
              <select
                value={a.chain}
                onChange={(e) => updateAddress(idx, { chain: e.target.value })}
                style={inputStyle(false)}
              >
                {CHAINS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={a.note}
                onChange={(e) => updateAddress(idx, { note: e.target.value })}
                placeholder="note (optional)"
                style={inputStyle(false)}
              />
              <button
                type="button"
                aria-label="Remove address"
                onClick={() => {
                  setAddresses((arr) => (arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr))
                }}
                disabled={addresses.length === 1}
                style={{
                  padding: '0.6rem 0.7rem',
                  background: 'transparent',
                  border: '1px solid rgba(231, 76, 60, 0.35)',
                  borderRadius: '10px',
                  color: '#e74c3c',
                  cursor: addresses.length === 1 ? 'not-allowed' : 'pointer',
                  opacity: addresses.length === 1 ? 0.4 : 1,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAddresses((arr) => [...arr, emptyAddress()])}
          style={{
            marginTop: '0.6rem',
            padding: '0.6rem 1rem',
            background: 'rgba(54, 166, 186, 0.1)',
            border: '1px solid rgba(54, 166, 186, 0.3)',
            borderRadius: '10px',
            color: '#36a6ba',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add another address
        </button>
        {clientErrors.addresses ? (
          <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#e74c3c' }}>
            {clientErrors.addresses}
          </div>
        ) : null}
      </div>

      <Field
        label="Submission proof"
        error={clientErrors.proof}
        required
        hint="Paste a tweet URL, blog post, or other public source verifying this address belongs to this person/entity."
      >
        <textarea
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          placeholder="https://twitter.com/…/status/…"
          rows={3}
          maxLength={1000}
          style={{ ...inputStyle(!!clientErrors.proof), resize: 'vertical' }}
        />
      </Field>

      {serverError ? (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.4)',
            borderRadius: '10px',
            color: '#e74c3c',
            fontSize: '0.9rem',
          }}
        >
          {serverError}
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <a
          href="/figures"
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
          }}
        >
          ← Cancel
        </a>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: '0.85rem 1.75rem',
            background: canSubmit
              ? 'linear-gradient(135deg, #36a6ba 0%, #2980b9 100%)'
              : 'rgba(54, 166, 186, 0.25)',
            border: '1px solid rgba(54, 166, 186, 0.6)',
            borderRadius: '14px',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            letterSpacing: '0.3px',
            boxShadow: canSubmit ? '0 4px 14px rgba(54, 166, 186, 0.25)' : 'none',
            opacity: canSubmit ? 1 : 0.75,
            transition: 'all 160ms ease',
          }}
        >
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .sonar-address-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </form>
  )
}

function labelStyle() {
  return {
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    color: '#36a6ba',
  }
}

function requiredStyle() {
  return { color: '#e74c3c', marginLeft: '0.2rem' }
}

function inputStyle(hasError) {
  return {
    width: '100%',
    padding: '0.75rem 0.9rem',
    background: 'rgba(54, 166, 186, 0.08)',
    border: `1px solid ${hasError ? 'rgba(231, 76, 60, 0.55)' : 'rgba(54, 166, 186, 0.3)'}`,
    borderRadius: '12px',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    fontFamily: 'inherit',
  }
}

function Field({ label, error, required, hint, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={labelStyle()}>
          {label}
          {required ? <span style={requiredStyle()}>*</span> : null}
        </span>
        {hint && !error ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{hint}</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <span style={{ fontSize: '0.78rem', color: '#e74c3c' }}>{error}</span>
      ) : null}
    </label>
  )
}
