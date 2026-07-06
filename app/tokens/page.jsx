import React from 'react'

export const metadata = { 
  title: 'Token Leaderboard — Most Traded & Net Inflows (24h)',
  description: 'Explore the most traded crypto tokens and top net inflows over the last 24 hours. Drill into token pages for whale trades, volume, and net flow.',
  alternates: { canonical: 'https://www.sonartracker.io/tokens' }
}

export default async function TokensPage() {
  // Server-side self-fetch needs an absolute URL; fall back to the canonical
  // domain so SSR works even when the env vars are unset. A failed fetch
  // renders an empty table instead of erroring the whole page.
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sonartracker.io'
  let rows = []
  try {
    const res = await fetch(`${base}/api/tokens/leaderboard`, { cache: 'no-store' })
    const json = await res.json()
    rows = json?.data || []
  } catch (err) {
    console.error('tokens SSR fetch failed:', err?.message)
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