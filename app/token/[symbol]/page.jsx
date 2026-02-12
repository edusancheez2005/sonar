import React from 'react'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import AuthGuard from '@/app/components/AuthGuard'
import TokenDetailClient from './TokenDetailClient'

export const revalidate = 15

export async function generateMetadata({ params }) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase()
  const title = `${symbol} Token Analysis — Live Whale Tracking & Price Data | Sonar`
  const description = `Real-time ${symbol} whale transactions, live price, market sentiment, AI-powered analysis, buy/sell pressure, and professional trading insights.`
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
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.sonartracker.io/' },
      { '@type': 'ListItem', position: 2, name: 'Tokens', item: 'https://www.sonartracker.io/tokens' },
      { '@type': 'ListItem', position: 3, name: symbol, item: `https://www.sonartracker.io/token/${encodeURIComponent(symbol)}` },
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
}

export default async function TokenDetail({ params, searchParams }) {
  const rawSymbol = decodeURIComponent(params.symbol)
  const symbol = rawSymbol.toUpperCase()

  // Redirect to canonical uppercase URL if needed
  if (rawSymbol !== symbol) {
    const query = new URLSearchParams()
    if (searchParams?.sinceHours) query.set('sinceHours', searchParams.sinceHours)
    if (searchParams?.minUsd) query.set('minUsd', searchParams.minUsd)
    const qs = query.toString()
    redirect(`/token/${encodeURIComponent(symbol)}${qs ? `?${qs}` : ''}`)
  }

  const sinceHours = Number(searchParams?.sinceHours || 24)
  const minUsd = searchParams?.minUsd ? Number(searchParams.minUsd) : undefined

  const sinceIso = new Date(Date.now() - (sinceHours > 0 ? sinceHours : 24) * 60 * 60 * 1000).toISOString()
  let q = supabaseAdmin
    .from('whale_transactions')
    .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,from_address,to_address,whale_score,confidence,whale_address,counterparty_address,counterparty_type,from_label,to_label,reasoning')
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
    whales.add(r.whale_address || r.from_address || '')
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

  const whaleMetrics = {
    totalVolume,
    netFlow,
    buys,
    sells,
    uniqueWhales
  }

  return (
    <AuthGuard>
      <BreadcrumbJsonLd symbol={symbol} />
      <TokenDetailClient 
        symbol={symbol}
        sinceHours={sinceHours}
        data={data || []}
        whaleMetrics={whaleMetrics}
        sentiment={sentiment}
      />
    </AuthGuard>
  )
} 