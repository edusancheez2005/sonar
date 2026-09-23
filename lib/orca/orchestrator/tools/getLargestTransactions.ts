/**
 * Tool: getLargestTransactions
 * =============================================================================
 * Market-wide "biggest individual whale transactions" — the single most
 * common unanswerable ask in the 2026-09-23 question-coverage audit.
 * getTrendingWhales aggregates PER TOKEN; this returns the raw largest
 * transfers across all tokens, optionally filtered to one chain, with
 * entity labels, the junk-contract exclusion and the protocol-scale
 * sanity cap that every other whale tool applies.
 */
import type { SupabaseLike, ToolResult } from '../types'
import { applyLabel, fetchEntityLabels } from './entityLabels'
import { isJunkAddress } from '../../junk-addresses'

const MAX_SANE_TX_USD = 150_000_000
const WINDOWS = { '1h': 3600_000, '4h': 4 * 3600_000, '24h': 24 * 3600_000, '7d': 7 * 24 * 3600_000, '30d': 30 * 24 * 3600_000 } as const
type WindowKey = keyof typeof WINDOWS
const CHAIN_FORMS: Record<string, string[]> = {
  ethereum: ['ethereum', 'eth'],
  solana: ['solana', 'sol'],
  bsc: ['bsc', 'bnb', 'binance-smart-chain'],
  polygon: ['polygon', 'matic'],
  bitcoin: ['bitcoin', 'btc'],
}

export interface GetLargestTransactionsArgs {
  window?: unknown
  chain?: unknown
  limit?: unknown
}

export async function run(
  args: GetLargestTransactionsArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const window: WindowKey = (typeof args.window === 'string' && (args.window as string) in WINDOWS ? args.window : '24h') as WindowKey
  const limitRaw = Number(args.limit)
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(25, Math.round(limitRaw))) : 10
  const chainKey = typeof args.chain === 'string' ? normaliseChain(args.chain) : null
  const sinceIso = new Date(now().getTime() - WINDOWS[window]).toISOString()

  try {
    let q: any = supabase
      .from('all_whale_transactions')
      .select('transaction_hash, timestamp, blockchain, token_symbol, classification, usd_value, whale_address, from_address, to_address')
      .gte('timestamp', sinceIso)
      .lte('usd_value', MAX_SANE_TX_USD)
      .order('usd_value', { ascending: false })
      .limit(limit * 4)
    if (chainKey && typeof q.in === 'function') q = q.in('blockchain', CHAIN_FORMS[chainKey])
    let { data, error } = await q
    // Trace 2026-09-23 07:15: the planner applied the USER'S profile chain
    // preference (bsc) to "biggest whale transactions today" and the whale
    // feed has no bsc rows → dead end, twice. A chain filter that matches
    // nothing falls back to all chains and says so.
    let chainFallback = false
    if (!error && chainKey && (!Array.isArray(data) || data.length === 0)) {
      const all = await supabase
        .from('all_whale_transactions')
        .select('transaction_hash, timestamp, blockchain, token_symbol, classification, usd_value, whale_address, from_address, to_address')
        .gte('timestamp', sinceIso)
        .lte('usd_value', MAX_SANE_TX_USD)
        .order('usd_value', { ascending: false })
        .limit(limit * 4)
      data = all.data
      error = all.error
      chainFallback = true
    }
    if (error) {
      return { ok: false, data: null, source: 'all_whale_transactions', fetched_at, error: `query_failed: ${error.message || 'unknown'}` }
    }
    const seenHash = new Set<string>()
    const rows: any[] = []
    for (const r of (Array.isArray(data) ? data : []) as any[]) {
      if (!r?.transaction_hash || seenHash.has(r.transaction_hash)) continue
      if (isJunkAddress(r.whale_address) || isJunkAddress(r.from_address) || isJunkAddress(r.to_address)) continue
      seenHash.add(r.transaction_hash)
      rows.push(r)
      if (rows.length >= limit) break
    }
    if (rows.length === 0) {
      return { ok: false, data: null, source: 'all_whale_transactions', fetched_at, error: 'no_whale_transactions' }
    }
    const labels = await fetchEntityLabels(
      supabase,
      rows.flatMap((r) => [r.whale_address, r.from_address, r.to_address])
    ).catch(() => new Map())
    const decorateAddr = (a: string | null) => {
      if (!a) return null
      const base = { address: String(a), address_short: `${String(a).slice(0, 6)}…${String(a).slice(-4)}` }
      return applyLabel(base, labels)
    }
    const transactions = rows.map((r, i) => ({
      rank: i + 1,
      usd_value: Math.round(Number(r.usd_value) || 0),
      token_symbol: r.token_symbol ? String(r.token_symbol).toUpperCase() : null,
      classification: r.classification ?? null,
      chain: r.blockchain ?? null,
      timestamp: r.timestamp ?? null,
      transaction_hash: r.transaction_hash,
      whale: decorateAddr(r.whale_address),
      from: decorateAddr(r.from_address),
      to: decorateAddr(r.to_address),
    }))
    return {
      ok: true,
      data: {
        window,
        chain: chainFallback ? null : chainKey,
        chain_fallback: chainFallback ? `no ${chainKey} transactions in the window — showing all chains` : null,
        count: transactions.length,
        transactions,
      },
      source: 'all_whale_transactions',
      fetched_at,
    }
  } catch (err: any) {
    return { ok: false, data: null, source: 'all_whale_transactions', fetched_at, error: err?.message ?? 'unknown' }
  }
}

function normaliseChain(v: string): string | null {
  const s = v.trim().toLowerCase()
  for (const [key, forms] of Object.entries(CHAIN_FORMS)) if (key === s || forms.includes(s)) return key
  return null
}
