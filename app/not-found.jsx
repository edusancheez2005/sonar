import React from 'react'

export default function NotFound() {
  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1>Page not found</h1>
      <p style={{ color: 'var(--text-secondary)' }}>The page you are looking for does not exist.</p>
    </div>
  )
}
