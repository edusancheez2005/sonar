'use client'
import React, { useState } from 'react'
import Landing from '@/src/views/Landing'

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubscribe(e) {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setMessage(json.message || 'Subscribed!')
      setEmail('')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Landing />
      <div className="container" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="email"
            placeholder="Get whale alerts — enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ flex: 1, padding: '0.5rem' }}
          />
          <button type="submit" disabled={submitting} className="buy">
            {submitting ? 'Submitting…' : 'Subscribe'}
          </button>
        </form>
        {message && <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>{message}</p>}
      </div>
    </>
  )
}
