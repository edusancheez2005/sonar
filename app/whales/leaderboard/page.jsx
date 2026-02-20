import React from 'react'
import AuthGuard from '@/app/components/AuthGuard'

export const metadata = { 
  title: 'Whale Leaderboard — Top Net Flow Wallets (24h)',
  description: 'See the top crypto whale wallets by 24h net USD flow, tokens traded, buy/sell balance, and Whale Score. Featuring named entities like Vitalik, Justin Sun, Wintermute.',
  alternates: { canonical: 'https://www.sonartracker.io/whales/leaderboard' }
}

export default async function WhalesLeaderboardPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/whales/leaderboard`, { cache: 'no-store' })
  const json = await res.json()
  const rows = json?.data || []

  return (
    <AuthGuard>
      <main className="container" style={{ padding: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h1>Whale Leaderboard (24h)</h1>
            <a href="/whales/entities" style={{ 
              padding: '0.5rem 1.25rem', 
              background: 'rgba(54, 166, 186, 0.2)', 
              border: '1px solid rgba(54, 166, 186, 0.4)', 
              borderRadius: '12px', 
              color: '#36a6ba', 
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 600 
            }}>
              View Named Entities →
            </a>
          </div>
          <table>
            <thead>
              <tr>
                <th>Whale</th>
                <th style={{ textAlign: 'right' }}>Net Flow (USD)</th>
                <th style={{ textAlign: 'right' }}>Buy/Sell</th>
                <th>Tokens</th>
                <th style={{ textAlign: 'right' }}>Whale Score</th>
                <th style={{ textAlign: 'right' }}>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const displayName = r.entity_name || `${r.address?.slice(0, 6)}…${r.address?.slice(-4)}`
                const isFamous = r.is_famous
                return (
                  <tr key={r.address}>
                    <td>
                      <a href={`/whale/${encodeURIComponent(r.address || '-')}`} style={{ textDecoration: 'none' }}>
                        {isFamous && <span style={{ color: '#f1c40f', marginRight: '4px' }}>★</span>}
                        <span style={{ 
                          color: r.entity_name ? 'var(--text-primary)' : 'var(--primary)',
                          fontWeight: r.entity_name ? 700 : 400,
                          fontFamily: r.entity_name ? 'inherit' : "'Courier New', monospace"
                        }}>
                          {displayName}
                        </span>
                        {r.entity_name && r.entity_category && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: 'var(--text-secondary)', 
                            marginLeft: '0.5rem',
                            textTransform: 'capitalize'
                          }}>
                            ({r.entity_category})
                          </span>
                        )}
                      </a>
                    </td>
                    <td style={{ 
                      textAlign: 'right',
                      color: Number(r.netUsd || 0) > 0 ? '#2ecc71' : Number(r.netUsd || 0) < 0 ? '#e74c3c' : 'inherit'
                    }}>
                      {Number(r.netUsd || 0) > 0 ? '+' : ''}${Math.round(Number(r.netUsd || 0)).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>{r.buySellRatio}</td>
                    <td>{(r.tokens || []).slice(0, 3).join(', ')}{(r.tokens || []).length > 3 ? '…' : ''}</td>
                    <td style={{ textAlign: 'right' }}>{r.whaleScore ?? '-'}</td>
                    <td style={{ textAlign: 'right' }}>{r.lastSeen ? new Date(r.lastSeen).toLocaleString() : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
    </AuthGuard>
  )
} 