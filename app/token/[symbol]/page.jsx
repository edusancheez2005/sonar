import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import AuthGuard from '@/app/components/AuthGuard'

export const revalidate = 15

export async function generateMetadata({ params }) {
  const symbol = decodeURIComponent(params.symbol)
  const title = `Token ${symbol} — Whale Trades, Volume & Net Flow`
  const description = `Live ${symbol} whale transactions, 24h volume, net flow, buy/sell counts, unique whales, and chain split.`
  const url = `https://www.sonartracker.io/token/${encodeURIComponent(symbol)}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    twitter: { title, description },
  }
}

function BreadcrumbJsonLd({ symbol }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sonartracker.io/' },
      { '@type': 'ListItem', position: 2, name: 'Tokens', item: 'https://sonartracker.io/tokens' },
      { '@type': 'ListItem', position: 3, name: symbol, item: `https://sonartracker.io/token/${encodeURIComponent(symbol)}` },
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
}

function Badge({ side }) {
  const s = (side || '').toLowerCase()
  const cls = s === 'buy' ? 'buy' : s === 'sell' ? 'sell' : 'transfer'
  return <span className={cls} style={{ padding: '0.25rem 0.5rem', borderRadius: 999, fontWeight: 500 }}>{side || '-'}</span>
}

export default async function TokenDetail({ params, searchParams }) {
  const symbol = decodeURIComponent(params.symbol)
  const sinceHours = Number(searchParams?.sinceHours || 24)
  const minUsd = searchParams?.minUsd ? Number(searchParams.minUsd) : undefined

  const sinceIso = new Date(Date.now() - (sinceHours > 0 ? sinceHours : 24) * 60 * 60 * 1000).toISOString()
  let q = supabaseAdmin
    .from('whale_transactions')
    .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,from_address,whale_score')
    .eq('token_symbol', symbol)
    .gte('timestamp', sinceIso)
    .order('timestamp', { ascending: false })
  if (typeof minUsd === 'number' && !Number.isNaN(minUsd)) q = q.gte('usd_value', minUsd)
  const { data, error } = await q.limit(200)

  let totalVolume = 0, netFlow = 0, buys = 0, sells = 0
  const whales = new Set()
  const chainMap = new Map()
  for (const r of data || []) {
    const usd = Number(r.usd_value || 0)
    totalVolume += usd
    const s = (r.classification || '').toLowerCase()
    if (s === 'buy') { buys += 1; netFlow += usd } else if (s === 'sell') { sells += 1; netFlow -= usd }
    whales.add(r.from_address || '')
    chainMap.set(r.blockchain || '—', (chainMap.get(r.blockchain || '—') || 0) + 1)
  }
  const uniqueWhales = whales.size
  const chains = Array.from(chainMap.entries()).sort((a,b)=>b[1]-a[1])

  function computeMedian(values) {
    if (!values || values.length === 0) return 0
    const arr = values.slice().sort((a,b)=>a-b)
    const mid = Math.floor(arr.length/2)
    return arr.length % 2 ? arr[mid] : (arr[mid-1]+arr[mid])/2
  }

  function computeSentiment(rows) {
    if (!rows || rows.length === 0) return { label: 'NEUTRAL', color: '#f39c12', score: 0, details: {} }
    const nowMs = Date.now()
    const sixH = 6 * 60 * 60 * 1000
    const last6Start = nowMs - sixH
    const prev6Start = nowMs - 2 * sixH

    let buys = 0, sells = 0, buyVol = 0, sellVol = 0, net = 0
    const txSizes = []
    let last6Net = 0, prev6Net = 0
    for (const r of rows) {
      const usd = Number(r.usd_value || 0)
      const side = String(r.classification || '').toLowerCase()
      const ts = new Date(r.timestamp).getTime()
      txSizes.push(Math.abs(usd))
      if (side === 'buy') { buys += 1; buyVol += usd; net += usd }
      else if (side === 'sell') { sells += 1; sellVol += usd; net -= usd }
      if (ts >= last6Start) {
        last6Net += (side === 'sell' ? -usd : usd)
      } else if (ts >= prev6Start && ts < last6Start) {
        prev6Net += (side === 'sell' ? -usd : usd)
      }
    }
    const total = buys + sells
    const buyPct = total > 0 ? (buys / total) * 100 : 50
    const median = computeMedian(txSizes) || 1
    const scaleNet = Math.max(1, median * 20)
    const scaleMom = Math.max(1, median * 10)

    // Components normalized to [-1, 1]
    const compBias = (buyPct - 50) / 50 // [-1,1]
    const compNet = Math.tanh(net / scaleNet) // robust cap
    const compMom = Math.tanh((last6Net - prev6Net) / scaleMom)

    // Weights
    const wBias = 0.4, wNet = 0.4, wMom = 0.2
    const score = (wBias * compBias) + (wNet * compNet) + (wMom * compMom)
    let label = 'NEUTRAL', color = '#f39c12'
    if (score > 0.15) { label = 'BULLISH'; color = '#2ecc71' }
    else if (score < -0.15) { label = 'BEARISH'; color = '#e74c3c' }
    return {
      label, color, score: Number(score.toFixed(2)),
      details: {
        buyPct: Number(buyPct.toFixed(1)), net: Math.round(net), last6Net: Math.round(last6Net), prev6Net: Math.round(prev6Net)
      }
    }
  }

  const sentiment = computeSentiment(data || [])

  return (
    <AuthGuard>
      <main className="container" style={{ padding: '2rem' }}>
        <BreadcrumbJsonLd symbol={symbol} />
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ margin: 0 }}>{symbol}</h1>
              <span style={{
                padding: '0.25rem 0.6rem',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.85rem',
                color: '#0a1621',
                background: sentiment.color,
              }} title={`Buy% ${sentiment.details.buyPct} | Net $${Math.round(sentiment.details.net).toLocaleString()} | Momentum $${Math.round(sentiment.details.last6Net - sentiment.details.prev6Net).toLocaleString()}`}>
                {sentiment.label}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a className={sinceHours===1?'buy':''} href={`/token/${encodeURIComponent(symbol)}?sinceHours=1`}>1h</a>
              <a className={sinceHours===6?'buy':''} href={`/token/${encodeURIComponent(symbol)}?sinceHours=6`}>6h</a>
              <a className={sinceHours===24?'buy':''} href={`/token/${encodeURIComponent(symbol)}?sinceHours=24`}>24h</a>
              <a className={sinceHours===72?'buy':''} href={`/token/${encodeURIComponent(symbol)}?sinceHours=72`}>3d</a>
              <a className={sinceHours===168?'buy':''} href={`/token/${encodeURIComponent(symbol)}?sinceHours=168`}>7d</a>
            </div>
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div>Total Volume: ${Math.round(totalVolume).toLocaleString()}</div>
            <div>Net Flow: ${Math.round(netFlow).toLocaleString()}</div>
            <div>Buys: {buys}</div>
            <div>Sells: {sells}</div>
            <div>Unique Whales: {uniqueWhales}</div>
            <form style={{ marginLeft: 'auto' }}>
              <input name="minUsd" type="number" min="0" placeholder="Min USD" defaultValue={minUsd ?? ''} style={{ background: 'var(--background-card)', border: '1px solid var(--secondary)', color: 'var(--text-primary)', padding: '0.4rem 0.6rem', borderRadius: 999 }} />
              <input type="hidden" name="sinceHours" value={sinceHours} />
              <button className="buy" style={{ marginLeft: 8 }}>Apply</button>
            </form>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h2>Chain Split</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              {chains.map(([label, value]) => {
                const max = Math.max(...chains.map(x=>x[1]), 1)
                const pct = Math.max(6, Math.round((value/max)*100))
                return (
                  <div key={label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 60px', gap: '10px', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>{label}</div>
                    <div style={{ background: 'rgba(30,57,81,0.7)', height: 12, borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), #2ecc71)' }} />
                    </div>
                    <div style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{value}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h2>Recent Trades</h2>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Side</th>
                  <th style={{ textAlign: 'right' }}>USD</th>
                  <th>Whale</th>
                  <th>Chain</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).slice(0,20).map(t => (
                  <tr key={t.transaction_hash}>
                    <td>{new Date(t.timestamp).toLocaleString()}</td>
                    <td><Badge side={t.classification} /></td>
                    <td style={{ textAlign: 'right' }}>${Math.round(Number(t.usd_value || 0)).toLocaleString()}</td>
                    <td><a href={`/whale/${encodeURIComponent(t.from_address || '-')}`}>{t.from_address?.slice(0,6)}…{t.from_address?.slice(-4)}</a></td>
                    <td>{t.blockchain}</td>
                    <td><a href={`#`} rel="noopener noreferrer">{t.transaction_hash.slice(0,6)}…{t.transaction_hash.slice(-4)}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
} 