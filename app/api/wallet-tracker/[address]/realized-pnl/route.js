import { NextResponse } from 'next/server'
import { estimateRealizedPnl } from '@/lib/wallet-backtest/engine'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOL_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const VALID_CHAINS = new Set(['ethereum', 'polygon', 'solana'])

// Process-local cache (1h). The realized PnL only changes as the wallet
// trades; an hour-stale read is fine and keeps the wallet page fast.
const cache = new Map()
const TTL_MS = 60 * 60 * 1000

export async function GET(req, { params }) {
  const { address: raw } = await params
  const url = new URL(req.url)

  let chain = String(url.searchParams.get('chain') || 'ethereum').toLowerCase().trim()
  if (!VALID_CHAINS.has(chain)) chain = 'ethereum'

  const address = chain === 'solana' ? String(raw || '').trim() : String(raw || '').trim().toLowerCase()
  const valid = chain === 'solana' ? SOL_ADDRESS.test(address) : EVM_ADDRESS.test(address)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid address for chain' }, { status: 400 })
  }

  const key = `${chain}:${address}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json(
      { ...hit.payload, cache_hit: true },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } }
    )
  }

  try {
    const result = await estimateRealizedPnl({ address, chain })
    cache.set(key, { at: Date.now(), payload: result })
    return NextResponse.json(
      { ...result, cache_hit: false },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } }
    )
  } catch (e) {
    // Never block the wallet page on this — return a null PnL the client
    // can render as "—".
    return NextResponse.json(
      { realized_pnl_usd: null, priced_trade_count: 0, matched_sell_usd: 0, unmatched_sell_usd: 0, error: true },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
