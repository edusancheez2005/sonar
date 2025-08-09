'use client'
import React from 'react'

export default function Error({ error, reset }) {
  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1>Something went wrong</h1>
      <p style={{ color: 'var(--text-secondary)' }}>{error?.message || 'Unexpected error.'}</p>
      <button onClick={() => reset()} style={{ marginTop: '1rem' }}>Try again</button>
    </div>
  )
}
