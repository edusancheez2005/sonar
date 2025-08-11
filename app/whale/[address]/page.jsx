import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function generateMetadata({ params }) {
  const addr = decodeURIComponent(params.address)
  return { title: `Whale — ${addr.slice(0, 6)}…${addr.slice(-4)}` }
}

export default async function WhaleProfile({ params }) {
  const addr = decodeURIComponent(params.address)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('whale_transactions')
    .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,whale_score')
    .eq('from_address', addr)
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(200)

  let netUsd = 0
  const byToken = new Map()
  for (const r of data || []) {
    const isBuy = (r.classification || '').toLowerCase() === 'buy'
    const usd = Number(r.usd_value || 0)
    netUsd += isBuy ? usd : -usd
    const token = r.token_symbol || '—'
    byToken.set(token, (byToken.get(token) || 0) + (isBuy ? usd : -usd))
  }
  const topTokens = Array.from(byToken.entries())
    .map(([token, net]) => ({ token, net }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .slice(0, 10)

  return (
    <main className="container" style={{ padding: '2rem' }}>
      <div className="card">
        <h1>Whale {addr.slice(0, 6)}…{addr.slice(-4)}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Net Flow (24h): ${Math.round(netUsd).toLocaleString()}</p>
        <h2>Top Tokens (by net flow)</h2>
        <table>
          <thead><tr><th>Token</th><th style={{ textAlign: 'right' }}>Net USD</th></tr></thead>
          <tbody>
            {topTokens.map(t => (
              <tr key={t.token}>
                <td><a href={`/token/${encodeURIComponent(t.token)}`}>{t.token}</a></td>
                <td style={{ textAlign: 'right' }}>${Math.round(Number(t.net)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Recent Trades</h2>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Token</th>
              <th>Side</th>
              <th style={{ textAlign: 'right' }}>USD</th>
              <th style={{ textAlign: 'right' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map(t => (
              <tr key={t.transaction_hash}>
                <td>{new Date(t.timestamp).toLocaleString()}</td>
                <td><a href={`/token/${encodeURIComponent(t.token_symbol || '-')}`}>{t.token_symbol || '-'}</a></td>
                <td>{t.classification}</td>
                <td style={{ textAlign: 'right' }}>${Math.round(Number(t.usd_value || 0)).toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>{t.whale_score ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
} 