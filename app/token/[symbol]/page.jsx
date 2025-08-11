import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const revalidate = 15

export async function generateMetadata({ params }) {
  const symbol = decodeURIComponent(params.symbol)
  return { title: `Token — ${symbol}` }
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

  return (
    <main className="container" style={{ padding: '2rem' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>{symbol}</h1>
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
  )
} 