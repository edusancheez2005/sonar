import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import AuthGuard from '@/app/components/AuthGuard'

export async function generateMetadata({ params }) {
  const addr = decodeURIComponent(params.address)
  const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`
  const title = `Whale ${short} — Net Flow, Top Tokens & Trades`
  const description = `Profile of whale ${short}: 24h net flow, top tokens by net USD, and recent large transactions.`
  const url = `https://www.sonartracker.io/whale/${encodeURIComponent(addr)}`
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url }, twitter: { title, description } }
}

function BreadcrumbJsonLd({ addr }) {
  const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.sonartracker.io/' },
      { '@type': 'ListItem', position: 2, name: 'Whales', item: 'https://www.sonartracker.io/whales/leaderboard' },
      { '@type': 'ListItem', position: 3, name: `Whale ${short}`, item: `https://www.sonartracker.io/whale/${encodeURIComponent(addr)}` },
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
}

export default async function WhaleProfile({ params }) {
  const addr = decodeURIComponent(params.address)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  // NEW: Use whale_address column and filter for real trades only
  const { data, error } = await supabaseAdmin
    .from('whale_transactions')
    .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,whale_score,counterparty_type,from_address,to_address')
    .eq('whale_address', addr)
    .in('counterparty_type', ['CEX', 'DEX'])
    .in('classification', ['BUY', 'SELL'])
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(200)

  let netUsd = 0
  let buyVolume = 0
  let sellVolume = 0
  const byToken = new Map()
  
  for (const r of data || []) {
    const isBuy = (r.classification || '').toLowerCase() === 'buy'
    const usd = Number(r.usd_value || 0)
    
    if (isBuy) {
      buyVolume += usd
      netUsd += usd
    } else {
      sellVolume += usd
      netUsd -= usd
    }
    
    const token = r.token_symbol || '—'
    if (!byToken.has(token)) {
      byToken.set(token, { net: 0, buy: 0, sell: 0 })
    }
    const tokenData = byToken.get(token)
    if (isBuy) {
      tokenData.net += usd
      tokenData.buy += usd
    } else {
      tokenData.net -= usd
      tokenData.sell += usd
    }
  }
  
  const topTokens = Array.from(byToken.entries())
    .map(([token, data]) => ({ token, net: data.net, buy: data.buy, sell: data.sell }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .slice(0, 10)

  return (
    <AuthGuard>
      <main className="container" style={{ padding: '2rem' }}>
        <BreadcrumbJsonLd addr={addr} />
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
    </AuthGuard>
  )
} 