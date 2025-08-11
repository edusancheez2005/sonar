import React from 'react'

export const metadata = { title: 'Whales — Leaderboard' }

export default async function WhalesLeaderboardPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/whales/leaderboard`, { cache: 'no-store' })
  const json = await res.json()
  const rows = json?.data || []

  return (
    <main className="container" style={{ padding: '2rem' }}>
      <div className="card">
        <h1>Whale Leaderboard (24h)</h1>
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
            {rows.map((r) => (
              <tr key={r.address}>
                <td><a href={`/whale/${encodeURIComponent(r.address || '-')}`}>{r.address?.slice(0, 6)}…{r.address?.slice(-4)}</a></td>
                <td style={{ textAlign: 'right' }}>${Math.round(Number(r.netUsd || 0)).toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>{r.buySellRatio}</td>
                <td>{(r.tokens || []).slice(0, 3).join(', ')}{(r.tokens || []).length > 3 ? '…' : ''}</td>
                <td style={{ textAlign: 'right' }}>{r.whaleScore ?? '-'}</td>
                <td style={{ textAlign: 'right' }}>{r.lastSeen ? new Date(r.lastSeen).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
} 