import React from 'react'
import AuthGuard from '@/app/components/AuthGuard'

export const metadata = { 
  title: 'Token Leaderboard — Most Traded & Net Inflows (24h)',
  description: 'Explore the most traded crypto tokens and top net inflows over the last 24 hours. Drill into token pages for whale trades, volume, and net flow.',
  alternates: { canonical: 'https://www.sonartracker.io/tokens' }
}

export default async function TokensPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/tokens/leaderboard`, { cache: 'no-store' })
  const json = await res.json()
  const rows = json?.data || []

  return (
    <AuthGuard>
      <main className="container" style={{ padding: '2rem' }}>
        <div className="card">
          <h1>Token Leaderboard (24h)</h1>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th style={{ textAlign: 'right' }}>Net Flow (USD)</th>
                <th style={{ textAlign: 'right' }}>Buy/Sell</th>
                <th style={{ textAlign: 'right' }}>Unique Whales</th>
                <th style={{ textAlign: 'right' }}>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.token}>
                  <td><a href={`/token/${encodeURIComponent(r.token || '-')}`}>{r.token}</a></td>
                  <td style={{ textAlign: 'right' }}>${Math.round(Number(r.netUsd || 0)).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{r.buySellRatio}</td>
                  <td style={{ textAlign: 'right' }}>{r.uniqueWhales}</td>
                  <td style={{ textAlign: 'right' }}>{r.lastSeen ? new Date(r.lastSeen).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </AuthGuard>
  )
} 