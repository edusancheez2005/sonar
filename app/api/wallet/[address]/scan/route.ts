import { NextResponse } from 'next/server'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'
import { ADDRESS_RE } from '@/app/lib/walletAuth'
import { getEvmHoldings } from '@/lib/wallet/alchemy'
import { getSolanaHoldings } from '@/lib/wallet/helius'
import { getBitcoinHoldings } from '@/lib/wallet/btc'
import type { Chain, Holding } from '@/lib/wallet/types'

export const dynamic = 'force-dynamic'

/**
 * Scan a wallet across every supported chain in parallel and report the
 * total USD on each. Used by the PortfolioPanel "Scan all chains" button so
 * users with a multi-chain wallet do not have to click every chip to find
 * where their money lives.
 *
 * Read-only, rate-limited (10 req/min/IP). Does NOT cache to wallet_holdings_cache
 * — that path is the per-chain GET /api/wallet/[address]/portfolio.
 */
export async function GET(req: Request, { params }: { params: Promise<{ address: string }> }) {
  const ip = getClientIp(req as any)
  const rl = rateLimit(`wallet-scan:${ip}`, 10, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  const { address: addressRaw } = await params
  const address = String(addressRaw || '').trim()
  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  }

  const isEvm = address.startsWith('0x')
  const isSolana = !isEvm && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
  const isBtc = !isEvm && !isSolana

  const evmChains: Chain[] = ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism']

  type Result = { chain: string; total_usd: number; tokens: number; error?: string }
  const tasks: Promise<Result>[] = []

  if (isEvm) {
    for (const c of evmChains) {
      tasks.push(
        getEvmHoldings(c, address)
          .then((h: Holding[]) => ({
            chain: c,
            total_usd: h.reduce((s, x) => s + (x.value_usd || 0), 0),
            tokens: h.length,
          }))
          .catch((e: any) => ({ chain: c, total_usd: 0, tokens: 0, error: e?.message || 'failed' }))
      )
    }
  }
  if (isSolana) {
    tasks.push(
      getSolanaHoldings(address)
        .then((h) => ({
          chain: 'solana',
          total_usd: h.reduce((s, x) => s + (x.value_usd || 0), 0),
          tokens: h.length,
        }))
        .catch((e: any) => ({ chain: 'solana', total_usd: 0, tokens: 0, error: e?.message || 'failed' }))
    )
  }
  if (isBtc) {
    tasks.push(
      getBitcoinHoldings(address)
        .then((h) => ({
          chain: 'bitcoin',
          total_usd: h.reduce((s, x) => s + (x.value_usd || 0), 0),
          tokens: h.length,
        }))
        .catch((e: any) => ({ chain: 'bitcoin', total_usd: 0, tokens: 0, error: e?.message || 'failed' }))
    )
  }

  const results = await Promise.all(tasks)
  results.sort((a, b) => b.total_usd - a.total_usd)
  const grand_total = results.reduce((s, r) => s + r.total_usd, 0)
  const best = results.find((r) => r.total_usd > 0) || null

  return NextResponse.json({
    address,
    grand_total,
    best_chain: best?.chain || null,
    chains: results,
  })
}
