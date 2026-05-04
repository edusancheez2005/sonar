'use client'
/**
 * /admin landing page — links to each admin sub-tool. The /admin/layout
 * already gates on isAdmin() (and the API routes verify Bearer tokens
 * server-side), so this page is just a directory.
 */
import Link from 'next/link'

const TILES = [
  {
    href: '/admin/calibration',
    title: 'Signal Calibration',
    body: 'Approve, mute, or invert per-token sign overrides. Audit recent flips and pending hysteresis proposals.',
  },
  {
    href: '/admin/figures',
    title: 'Figures Moderation',
    body: 'Review pending submissions for the curated trader/entity directory.',
  },
  {
    href: '/admin/sentiment-votes',
    title: 'Sentiment Votes',
    body: 'Inspect raw user sentiment-vote rows.',
  },
]

export default function AdminIndex() {
  return (
    <main style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto', color: 'var(--text-primary)' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Admin</h1>
      <p style={{ opacity: 0.7, fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Internal tools. All actions are logged server-side.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
      }}>
        {TILES.map(t => (
          <Link
            key={t.href}
            href={t.href}
            style={{
              display: 'block',
              padding: '1.25rem',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
              border: '1px solid rgba(54, 166, 186, 0.2)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6, color: '#36A6BA' }}>{t.title} →</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{t.body}</div>
          </Link>
        ))}
      </div>
    </main>
  )
}
