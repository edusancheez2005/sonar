'use client'

import { useState } from 'react'

const fieldStyle = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  borderRadius: 8,
  border: '1px solid rgba(0,229,255,0.2)',
  background: 'rgba(0,229,255,0.04)',
  color: '#e0e6ed',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  marginTop: '0.3rem',
}
const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  color: '#b0b8c4',
  marginBottom: '0.85rem',
}

export default function DataRemovalForm() {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setResult(null)
    const fd = new FormData(e.currentTarget)
    const payload = {
      email: fd.get('email'),
      fullName: fd.get('fullName'),
      requestType: fd.get('requestType'),
      relationship: fd.get('relationship'),
      targetUrls: fd.get('targetUrls'),
      description: fd.get('description'),
      verificationStatement: fd.get('verificationStatement'),
    }
    try {
      const res = await fetch('/api/legal/data-removal-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Submission failed')
      setResult(json.message || 'Your request has been received.')
      e.currentTarget.reset()
    } catch (err) {
      setError(err?.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div
        style={{
          padding: '1.25rem',
          borderRadius: 12,
          border: '1px solid rgba(46, 204, 113, 0.4)',
          background: 'rgba(46, 204, 113, 0.08)',
          color: '#9fe6b8',
        }}
      >
        {result}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
      <label style={labelStyle}>
        Your email address (required)
        <input type="email" name="email" required maxLength={254} style={fieldStyle} />
      </label>

      <label style={labelStyle}>
        Your full name
        <input type="text" name="fullName" maxLength={200} style={fieldStyle} />
      </label>

      <label style={labelStyle}>
        Type of request
        <select name="requestType" defaultValue="gdpr-erasure" style={fieldStyle}>
          <option value="gdpr-erasure">GDPR Right to Erasure (Art. 17)</option>
          <option value="ccpa-deletion">CCPA Right to Delete (§1798.105)</option>
          <option value="right-of-publicity">Right of Publicity / Personality</option>
          <option value="trademark">Trademark complaint</option>
          <option value="defamation">Defamation / inaccurate statement</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label style={labelStyle}>
        Your relationship to the data
        <input
          type="text"
          name="relationship"
          maxLength={200}
          placeholder="e.g. I am the data subject, I am the registered trademark holder, I am acting under power of attorney"
          style={fieldStyle}
        />
      </label>

      <label style={labelStyle}>
        URL(s) on www.sonartracker.io (required)
        <textarea
          name="targetUrls"
          required
          rows={3}
          maxLength={4000}
          placeholder="One URL per line"
          style={{ ...fieldStyle, resize: 'vertical' }}
        />
      </label>

      <label style={labelStyle}>
        Describe the data you want removed and why (required)
        <textarea
          name="description"
          required
          rows={6}
          minLength={20}
          maxLength={8000}
          style={{ ...fieldStyle, resize: 'vertical' }}
        />
      </label>

      <label style={labelStyle}>
        Verification statement (optional)
        <textarea
          name="verificationStatement"
          rows={3}
          maxLength={4000}
          placeholder="If you are acting on behalf of someone else, briefly describe your authority. Do NOT paste government-ID numbers; we will request these separately if needed."
          style={{ ...fieldStyle, resize: 'vertical' }}
        />
      </label>

      {error && (
        <p
          style={{
            color: '#ff7e8a',
            background: 'rgba(255, 71, 87, 0.08)',
            border: '1px solid rgba(255, 71, 87, 0.25)',
            padding: '0.6rem 0.8rem',
            borderRadius: 8,
            margin: '0 0 1rem',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: '0.7rem 1.4rem',
          borderRadius: 10,
          border: 'none',
          background: 'linear-gradient(135deg, #00e5ff 0%, #36a6ba 100%)',
          color: '#080f18',
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: submitting ? 'wait' : 'pointer',
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? 'Submitting…' : 'Submit request'}
      </button>

      <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#8a9bb0' }}>
        By submitting, you confirm that the information above is accurate to
        the best of your knowledge. Knowingly submitting a false request may
        constitute a misrepresentation under applicable law.
      </p>
    </form>
  )
}
