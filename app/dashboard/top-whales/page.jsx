import React from 'react'
import AuthGuard from '@/app/components/AuthGuard'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import TopWhalesClient from './TopWhalesClient'

export const metadata = { 
  title: 'Top 10 Whales (7 Days) — Biggest Crypto Whale Wallets',
  description: 'Discover the top 10 most active crypto whale wallets over the past 7 days. See net flow, buy/sell ratios, top tokens traded, and whale scores.',
  alternates: { canonical: 'https://www.sonartracker.io/dashboard/top-whales' }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

function BreadcrumbJsonLd() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.sonartracker.io/' },
      { '@type': 'ListItem', position: 2, name: 'Dashboard', item: 'https://www.sonartracker.io/dashboard' },
      { '@type': 'ListItem', position: 3, name: 'Top Whales', item: 'https://www.sonartracker.io/dashboard/top-whales' },
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
}

export default async function TopWhalesPage() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  
  // Fetch whale transactions from past 7 days
  const { data, error } = await supabaseAdmin
    .from('whale_transactions')
    .select('whale_address,classification,usd_value,token_symbol,whale_score,timestamp')
    .gte('timestamp', since)
    .in('counterparty_type', ['CEX', 'DEX'])
    .in('classification', ['BUY', 'SELL'])
    .not('whale_address', 'is', null)
    .order('timestamp', { ascending: false })
  
  // Aggregate by whale address
  const whaleMap = new Map()
  
  for (const row of data || []) {
    const addr = row.whale_address
    if (!addr) continue
    
    if (!whaleMap.has(addr)) {
      whaleMap.set(addr, {
        address: addr,
        netUsd: 0,
        buyVolume: 0,
        sellVolume: 0,
        tokens: new Set(),
        whaleScore: row.whale_score || 0,
        lastSeen: row.timestamp,
        txCount: 0
      })
    }
    
    const whale = whaleMap.get(addr)
    const usd = Number(row.usd_value || 0)
    const isBuy = row.classification === 'BUY'
    
    if (isBuy) {
      whale.buyVolume += usd
      whale.netUsd += usd
    } else {
      whale.sellVolume += usd
      whale.netUsd -= usd
    }
    
    if (row.token_symbol) {
      whale.tokens.add(row.token_symbol)
    }
    
    whale.whaleScore = Math.max(whale.whaleScore, row.whale_score || 0)
    whale.txCount += 1
    
    if (new Date(row.timestamp) > new Date(whale.lastSeen)) {
      whale.lastSeen = row.timestamp
    }
  }
  
  // Sort by absolute net flow and take top 10
  const topWhales = Array.from(whaleMap.values())
    .sort((a, b) => Math.abs(b.netUsd) - Math.abs(a.netUsd))
    .slice(0, 10)
    .map(whale => {
      const totalVolume = whale.buyVolume + whale.sellVolume
      const buyPct = totalVolume > 0 ? Math.round((whale.buyVolume / totalVolume) * 100) : 50
      const sellPct = 100 - buyPct
      
      return {
        address: whale.address,
        netUsd: whale.netUsd,
        buySellRatio: `${buyPct}/${sellPct}`,
        tokens: Array.from(whale.tokens).slice(0, 5),
        whaleScore: whale.whaleScore,
        lastSeen: whale.lastSeen,
        txCount: whale.txCount
      }
    })
  
  return (
    <AuthGuard>
      <BreadcrumbJsonLd />
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <TopWhalesClient whales={topWhales} />
      </main>
    </AuthGuard>
  )
}

