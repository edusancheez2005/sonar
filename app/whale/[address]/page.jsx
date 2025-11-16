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
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
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
  
  // Fetch whale transactions (works for both whales and exchanges)
  // Query using OR condition to catch whale_address OR from/to address
  const { data, error } = await supabaseAdmin
    .from('whale_transactions')
    .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,whale_score,counterparty_type,from_address,to_address,whale_address,counterparty_address,reasoning,confidence,from_label,to_label')
    .or(`whale_address.eq.${addr},from_address.eq.${addr},to_address.eq.${addr}`)
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })
    .limit(500)

  let netUsd = 0
  let buyVolume = 0
  let sellVolume = 0
  const byToken = new Map()
  const transactions = []
  
  for (const r of data || []) {
    const usd = Number(r.usd_value || 0)
    if (usd === 0) continue // Skip zero value transactions
    
    const fromAddr = (r.from_address || '').toLowerCase()
    const toAddr = (r.to_address || '').toLowerCase()
    const whaleAddr = (r.whale_address || '').toLowerCase()
    const ourAddr = addr.toLowerCase()
    const storedClassification = (r.classification || '').toUpperCase()
    const counterpartyType = r.counterparty_type
    
    // Skip TRANSFER and DEFI transactions - they're not real buy/sell
    if (storedClassification === 'TRANSFER' || storedClassification === 'DEFI') {
      continue
    }
    
    // Determine BUY/SELL from TOKEN FLOW DIRECTION, not stored classification
    // Token flow: from_address -> to_address
    // If our address is 'to' = we're RECEIVING tokens = BUY
    // If our address is 'from' = we're SENDING tokens = SELL
    
    let isBuy = false
    let classification = 'UNKNOWN'
    
    // Priority 1: Check whale_address position
    if (whaleAddr === ourAddr) {
      if (whaleAddr === toAddr) {
        // Whale is receiving tokens = BUY
        isBuy = true
        classification = 'BUY'
      } else if (whaleAddr === fromAddr) {
        // Whale is sending tokens = SELL
        isBuy = false
        classification = 'SELL'
      } else {
        // Whale address doesn't match from/to - unusual, skip
        continue
      }
    }
    // Priority 2: Check from/to addresses directly
    else if (toAddr === ourAddr) {
      // Our address is receiving = BUY
      isBuy = true
      classification = 'BUY'
    } else if (fromAddr === ourAddr) {
      // Our address is sending = SELL
      isBuy = false
      classification = 'SELL'
    } else {
      // Our address isn't involved in the token transfer
      continue
    }
    
    // Only proceed if we successfully classified as BUY or SELL
    if (classification !== 'BUY' && classification !== 'SELL') {
      continue
    }
    
    // Additional validation: if counterparty_type exists, transaction should involve CEX/DEX
    if (counterpartyType && counterpartyType !== 'CEX' && counterpartyType !== 'DEX') {
      continue
    }
    
    // Aggregate volumes
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
    
    // Store transaction with corrected classification
    transactions.push({
      ...r,
      classification: classification
    })
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
        trades={transactions}
        isExchange={isExchange}
        exchangeInfo={exchangeInfo}
      />
    </AuthGuard>
  )
} 