import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function GET(req) {
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) || !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { error: 'Supabase env vars not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { searchParams } = new URL(req.url)
  const limitRaw = parseInt(searchParams.get('limit') || '30', 10)
  const limit = Math.min(Math.max(1, limitRaw), 100)

  // Get recent transactions from high-score wallets
  // First get smart money addresses
  const { data: smartWallets } = await supabaseAdmin
    .from('wallet_profiles')
    .select('address, entity_name, smart_money_score, tags')
    .gte('smart_money_score', 0.5)
    .gte('tx_count_30d', 10)
    .order('smart_money_score', { ascending: false })
    .limit(100)

  if (!smartWallets || smartWallets.length === 0) {
    return NextResponse.json({ data: [] })
  }

  const addrList = smartWallets.map(w => w.address)
  const walletMap = new Map(smartWallets.map(w => [w.address, w]))

  // Get their recent transactions
  const { data: txs, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('whale_address, token_symbol, classification, usd_value, blockchain, timestamp, transaction_hash')
    .in('whale_address', addrList)
    .in('classification', ['BUY', 'SELL'])
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with wallet info
  const signals = (txs || []).map(tx => {
    const wallet = walletMap.get(tx.whale_address) || {}
    return {
      ...tx,
      entity_name: wallet.entity_name || null,
      smart_money_score: wallet.smart_money_score || null,
      tags: wallet.tags || [],
    }
  })

  // Enrich with entity labels for unlabeled wallets
  const unlabeled = signals.filter(s => !s.entity_name).map(s => s.whale_address)
  const uniqueUnlabeled = [...new Set(unlabeled)]
  if (uniqueUnlabeled.length > 0) {
    const { data: labels } = await supabaseAdmin
      .from('addresses')
      .select('address, entity_name')
      .in('address', uniqueUnlabeled)
      .not('entity_name', 'is', null)
      .not('entity_name', 'eq', '')

    if (labels && labels.length > 0) {
      const labelMap = new Map()
      for (const l of labels) {
        const existing = labelMap.get(l.address)
        if (!existing || l.entity_name.length > existing.length) {
          labelMap.set(l.address, l.entity_name)
        }
      }
      for (const s of signals) {
        if (!s.entity_name && labelMap.has(s.whale_address)) {
          s.entity_name = labelMap.get(s.whale_address)
        }
      }
    }
  }

  return NextResponse.json(
    { data: signals },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } }
  )
}
