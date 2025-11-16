import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import AuthGuard from '@/app/components/AuthGuard'
import WhaleDetailClient from './WhaleDetailClient'

export async function generateMetadata({ params }) {
  const addr = decodeURIComponent(params.address)
  const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`
  
  // Check if this is an exchange address
  const { data: addressInfo } = await supabaseAdmin
    .from('addresses')
    .select('address_name, address_type')
    .eq('address', addr.toLowerCase())
    .maybeSingle()
  
  const isExchange = addressInfo && ['CEX Wallet', 'exchange', 'Exchange Wallet'].includes(addressInfo.address_type)
  const title = isExchange 
    ? `${addressInfo.address_name || 'Exchange'} Wallet — Verified Exchange Address`
    : `Whale ${short} — Net Flow, Top Tokens & Trades`
  const description = isExchange
    ? `Verified ${addressInfo.address_type}: ${addressInfo.address_name || addr}. View trading activity and transaction history.`
    : `Profile of whale ${short}: 24h net flow, top tokens by net USD, and recent large transactions.`
  const url = `https://www.sonartracker.io/whale/${encodeURIComponent(addr)}`
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url }, twitter: { title, description } }
}

function BreadcrumbJsonLd({ addr, isExchange, exchangeName }) {
  const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`
  const name = isExchange ? exchangeName || 'Exchange Wallet' : `Whale ${short}`
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.sonartracker.io/' },
      { '@type': 'ListItem', position: 2, name: 'Whales', item: 'https://www.sonartracker.io/whales/leaderboard' },
      { '@type': 'ListItem', position: 3, name, item: `https://www.sonartracker.io/whale/${encodeURIComponent(addr)}` },
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
}

export default async function WhaleProfile({ params }) {
  const addr = decodeURIComponent(params.address)
  let since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  // Check if this is an exchange address
  const { data: addressInfo } = await supabaseAdmin
    .from('addresses')
    .select('address_name, address_type')
    .eq('address', addr.toLowerCase())
    .maybeSingle()
  
  const isExchange = addressInfo && ['CEX Wallet', 'exchange', 'Exchange Wallet'].includes(addressInfo.address_type)
  const exchangeInfo = isExchange ? {
    name: addressInfo.address_name || 'Exchange',
    type: addressInfo.address_type
  } : null
  
  // First try 24h, if no data, try 7 days
  let { data, error } = await supabaseAdmin
    .from('whale_transactions')
    .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,whale_score,counterparty_type,from_address,to_address,whale_address,counterparty_address,reasoning,confidence,from_label,to_label')
    .or(`whale_address.eq.${addr},from_address.eq.${addr},to_address.eq.${addr}`)
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(500)
  
  // If no data in 24h, try last 7 days
  if (!data || data.length === 0) {
    since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const result = await supabaseAdmin
      .from('whale_transactions')
      .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,whale_score,counterparty_type,from_address,to_address,whale_address,counterparty_address,reasoning,confidence,from_label,to_label')
      .or(`whale_address.eq.${addr},from_address.eq.${addr},to_address.eq.${addr}`)
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(500)
    data = result.data
    error = result.error
  }

  let netUsd = 0
  let buyVolume = 0
  let sellVolume = 0
  const byToken = new Map()
  const transactions = []
  const allTransactions = [] // Store all transactions for display
  
  for (const r of data || []) {
    const usd = Number(r.usd_value || 0)
    
    const fromAddr = (r.from_address || '').toLowerCase()
    const toAddr = (r.to_address || '').toLowerCase()
    const whaleAddr = (r.whale_address || '').toLowerCase()
    const ourAddr = addr.toLowerCase()
    const storedClassification = (r.classification || '').toUpperCase()
    const counterpartyType = r.counterparty_type
    
    // Determine BUY/SELL from TOKEN FLOW DIRECTION
    let isBuy = false
    let classification = storedClassification
    let shouldCountInMetrics = false
    
    // Re-classify based on token flow if it's not TRANSFER/DEFI
    if (storedClassification !== 'TRANSFER' && storedClassification !== 'DEFI') {
      // Priority 1: Check whale_address position
      if (whaleAddr === ourAddr) {
        if (whaleAddr === toAddr) {
          isBuy = true
          classification = 'BUY'
          shouldCountInMetrics = true
        } else if (whaleAddr === fromAddr) {
          isBuy = false
          classification = 'SELL'
          shouldCountInMetrics = true
        }
      }
      // Priority 2: Check from/to addresses directly
      else if (toAddr === ourAddr) {
        isBuy = true
        classification = 'BUY'
        shouldCountInMetrics = true
      } else if (fromAddr === ourAddr) {
        isBuy = false
        classification = 'SELL'
        shouldCountInMetrics = true
      }
      
      // Validate counterparty type for metrics
      if (shouldCountInMetrics && counterpartyType && counterpartyType !== 'CEX' && counterpartyType !== 'DEX') {
        shouldCountInMetrics = false
      }
    }
    
    // Add to all transactions for display (even if not counted in metrics)
    allTransactions.push({
      ...r,
      classification: classification
    })
    
    // Only aggregate metrics for real BUY/SELL trades
    if (shouldCountInMetrics && usd > 0) {
      if (isBuy) {
        buyVolume += usd
        netUsd += usd
      } else {
        sellVolume += usd
        netUsd -= usd
      }
      
      // Aggregate by token
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
      
      // Add to transactions array (for metrics)
      transactions.push({
        ...r,
        classification: classification
      })
    }
  }
  
  const topTokens = Array.from(byToken.entries())
    .map(([token, data]) => ({ token, net: data.net, buy: data.buy, sell: data.sell }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .slice(0, 10)

  return (
    <AuthGuard>
      <BreadcrumbJsonLd 
        addr={addr} 
        isExchange={isExchange}
        exchangeName={exchangeInfo?.name}
      />
      <WhaleDetailClient
        address={addr}
        netFlow={netUsd}
        buyVolume={buyVolume}
        sellVolume={sellVolume}
        topTokens={topTokens}
        trades={allTransactions.length > 0 ? allTransactions : transactions}
        tradeCount={transactions.length}
        totalTransactions={allTransactions.length}
        isExchange={isExchange}
        exchangeInfo={exchangeInfo}
        timeWindow={allTransactions.length === 0 ? 'No data' : (data && data.length > 0 && new Date(data[0].timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000) ? '24h' : '7d')}
      />
    </AuthGuard>
  )
} 