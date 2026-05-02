import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'
import { ADDRESS_RE, isSupportedChain } from '@/app/lib/walletAuth'
import { getEvmHoldings } from '@/lib/wallet/alchemy'
import { getSolanaHoldings } from '@/lib/wallet/helius'
import { getBitcoinHoldings } from '@/lib/wallet/btc'
import { STABLECOINS, type Holding, type Chain } from '@/lib/wallet/types'

export const dynamic = 'force-dynamic'

const DEFAULT_TTL = 300 // 5 minutes
const MIN_VALUE_USD = 0.05
const MIN_STABLE_VALUE_USD = 5

async function fetchHoldings(chain: Chain, address: string): Promise<Holding[]> {
  if (chain === 'solana') return getSolanaHoldings(address)
  if (chain === 'bitcoin') return getBitcoinHoldings(address)
  return getEvmHoldings(chain, address)
}

export async function GET(req: Request, { params }: { params: Promise<{ address: string }> }) {
  const ip = getClientIp(req as any)
  const rl = rateLimit(`wallet-portfolio:${ip}`, 60, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  const { address: addressRaw } = await params
  const address = String(addressRaw || '').trim()
  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const chain = (searchParams.get('chain') || 'ethereum').toLowerCase()
  if (!isSupportedChain(chain)) return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 })
  const includeStables = searchParams.get('includeStables') === '1'
  const force = searchParams.get('refresh') === '1'

  const cacheKey = chain === 'bitcoin' || chain === 'solana' ? address : address.toLowerCase()

  // Cache check
  if (!force) {
    const { data: cached } = await supabaseAdmin
      .from('wallet_holdings_cache')
      .select('*')
      .eq('address', cacheKey)
      .eq('chain', chain)
      .maybeSingle()
    if (cached) {
      const age = (Date.now() - new Date(cached.fetched_at).getTime()) / 1000
      if (age < (cached.ttl_seconds || DEFAULT_TTL)) {
        return NextResponse.json({
          address: cacheKey,
          chain,
          fetched_at: cached.fetched_at,
          total_usd: Number(cached.total_usd),
          holdings: cached.holdings,
          cached: true,
        })
      }
    }
  }

  let holdings: Holding[] = []
  try {
    holdings = await fetchHoldings(chain as Chain, address)
  } catch (e: any) {
    return NextResponse.json({ error: `Provider error: ${e?.message || 'unknown'}` }, { status: 502 })
  }

  // Filter
  holdings = holdings.filter((h) => {
    if (!h.symbol) return false
    // Always keep the chain's native asset (ETH/MATIC/etc) regardless of
    // value — a wallet with only gas should still be visible.
    if (h.contract == null) return true
    if (h.value_usd < MIN_VALUE_USD && h.price_usd) return false
    if (STABLECOINS.has(h.symbol.toUpperCase())) {
      if (!includeStables && h.value_usd < MIN_STABLE_VALUE_USD) return false
    }
    return true
  })

  holdings.sort((a, b) => b.value_usd - a.value_usd)
  const total_usd = holdings.reduce((s, h) => s + (h.value_usd || 0), 0)
  const enriched = holdings.map((h) => ({
    ...h,
    pct: total_usd > 0 ? Math.round((h.value_usd / total_usd) * 1000) / 10 : 0,
  }))

  const fetched_at = new Date().toISOString()
  await supabaseAdmin.from('wallet_holdings_cache').upsert({
    address: cacheKey,
    chain,
    fetched_at,
    ttl_seconds: DEFAULT_TTL,
    total_usd,
    holdings: enriched,
  })

  return NextResponse.json({ address: cacheKey, chain, fetched_at, total_usd, holdings: enriched, cached: false })
}
