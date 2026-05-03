'use client'
import React from 'react'
import NextLink from 'next/link'
import EntityAvatar from '@/app/components/entities/EntityAvatar'

// Pure presentational. Fed by app/wallet-tracker/page.jsx which reads
// the pre-computed return_pct_7d from the figure_backtests table
// (populated nightly by /api/cron/backtest-figures). Past-performance
// disclaimer is rendered inline so we never display a return number
// without it.

export default function TopPerformersWeek({ performers = [] }) {
  if (!performers || performers.length === 0) return null

  return (
    <section style={{ margin: '0 0 1.5rem' }} aria-labelledby="top-performers-week-heading">
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '0.55rem',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <h2
          id="top-performers-week-heading"
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            margin: 0,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          Top performers this week
        </h2>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
          Backtested 7d return on $10k. Past performance ≠ future results.
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.6rem',
        }}
      >
        {performers.map((p, i) => {
          const ret = Number(p.return_pct_7d)
          const positive = ret >= 0
          return (
            <NextLink
              key={p.slug}
              href={`/figure/${encodeURIComponent(p.slug)}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'rgba(6, 14, 22, 0.6)',
                border: '1px solid rgba(34, 211, 238, 0.18)',
                borderRadius: '10px',
                padding: '0.55rem 0.7rem',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                transition: 'transform 0.12s ease, border-color 0.12s ease',
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: 'var(--text-secondary)',
                  width: '1.2rem',
                  textAlign: 'center',
                }}
              >
                #{i + 1}
              </span>
              <EntityAvatar
                avatarUrl={p.avatar_url}
                twitterHandle={p.twitter_handle}
                displayName={p.display_name}
                category={p.category}
                size={32}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    lineHeight: 1.15,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.display_name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {p.category || ''}
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: positive ? '#2ecc71' : '#e74c3c',
                  whiteSpace: 'nowrap',
                }}
              >
                {positive ? '+' : ''}
                {Number.isFinite(ret) ? ret.toFixed(1) : '0.0'}%
              </span>
            </NextLink>
          )
        })}
      </div>
    </section>
  )
}
