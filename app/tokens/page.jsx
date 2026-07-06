import React from 'react'
import { getTokenLeaderboard } from '@/app/lib/leaderboardData'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Token Leaderboard — Most Traded & Net Inflows (24h)',
  description: 'Explore the most traded crypto tokens and top net inflows over the last 24 hours. Drill into token pages for whale trades, volume, and net flow.',
  alternates: { canonical: 'https://www.sonartracker.io/tokens' }
}

export default async function TokensPage() {
  // Query the data directly (shared server-only function), the same pattern as
  // the token page. Importing the route handler instead bailed the whole page
  // to client-side render and served empty HTML.
  let rows = []
  try {
    rows = await getTokenLeaderboard()
  } catch (err) {
    console.error('tokens data load failed:', err?.message)
  }

  return (
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
  )
} 