import React, { cache } from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import AuthGuard from '@/app/components/AuthGuard'
import WhaleDetailClient from './WhaleDetailClient'

// Deduped per-request: generateMetadata and the page body both need the
// address row, and React.cache collapses the two identical lookups into a
// single DB round-trip during one render.
const getAddressInfo = cache(async (addrLower) => {
  const { data } = await supabaseAdmin
    .from('addresses')
    .select('address_name, address_type, entity_name, label, analysis_tags, signal_potential')
    .eq('address', addrLower)
    .maybeSingle()
  return data || null
})

export async function generateMetadata({ params }) {
  const addr = decodeURIComponent(params.address)
  const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`
  
  // Check if this is an exchange address
  const addressInfo = await getAddressInfo(addr.toLowerCase())
  
  const isExchange = addressInfo && ['CEX Wallet', 'exchange', 'Exchange Wallet', 'CEX'].includes(addressInfo.address_type)
  const entityName = addressInfo?.entity_name || addressInfo?.address_name || null
  const title = entityName
    ? `${entityName} — Whale Activity & Trades | Sonar`
    : isExchange
      ? `${addressInfo.address_name || 'Exchange'} Wallet — Verified Exchange Address`
      : `Whale ${short} — Net Flow, Top Tokens & Trades`
  const description = entityName
    ? `Track ${entityName}'s crypto whale activity: net flow, top tokens, and recent large transactions on Sonar.`
    : isExchange
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
  const dayMs = 24 * 60 * 60 * 1000
  const cutoff24h = Date.now() - dayMs
  // Single 7-day pull (newest first). Previously this page issued a 24h query
  // and, when it came back empty, a second 7-day query — two sequential
  // round-trips that ALWAYS fired for wallets with no recent on-chain activity
  // (e.g. Polymarket proxy wallets). One 7-day pull covers both: rows within
  // the last 24h are the prefix of the result, so we derive the 24h window in
  // memory below. Run it in parallel with the address lookup.
  const since = new Date(Date.now() - 7 * dayMs).toISOString()

  const [addressInfo, txResult] = await Promise.all([
    getAddressInfo(addr.toLowerCase()),
    supabaseAdmin
      .from('all_whale_transactions')
      .select('transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,whale_score,counterparty_type,from_address,to_address,whale_address,counterparty_address,reasoning,confidence,from_label,to_label')
      .or(`whale_address.eq.${addr},from_address.eq.${addr},to_address.eq.${addr}`)
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(500),
  ])

  const isExchange = addressInfo && ['CEX Wallet', 'exchange', 'Exchange Wallet', 'CEX'].includes(addressInfo.address_type)
  const exchangeInfo = isExchange ? {
    name: addressInfo.address_name || addressInfo.entity_name || 'Exchange',
    type: addressInfo.address_type
  } : null

  const entityInfo = addressInfo ? {
    entity_name: addressInfo.entity_name || null,
    label: addressInfo.label || addressInfo.address_name || null,
    address_type: addressInfo.address_type || null,
    category: addressInfo.analysis_tags?.category || null,
    subcategory: addressInfo.analysis_tags?.subcategory || null,
    is_famous: addressInfo.analysis_tags?.is_famous || false,
    signal_potential: addressInfo.signal_potential || null,
  } : null
  
  // Prefer the last-24h slice; fall back to the full 7-day pull only when the
  // wallet had nothing in the past day (preserves the old 24h-then-7d behavior
  // without a second query).
  const sevenDayRows = txResult.data || []
  const rows24h = sevenDayRows.filter((r) => new Date(r.timestamp).getTime() >= cutoff24h)
  const data = rows24h.length > 0 ? rows24h : sevenDayRows

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
        entityInfo={entityInfo}
        timeWindow={allTransactions.length === 0 ? 'No data' : (rows24h.length > 0 ? '24h' : '7d')}
        autoRunBacktest={allTransactions.length > 0}
      />
    </AuthGuard>
  )
} 