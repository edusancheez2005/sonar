/**
 * Tool: getWhaleFlows
 * =============================================================================
 * Aggregates last-24h buy / sell USD volume from `all_whale_transactions`
 * for a single ticker and returns net flow + direction.
 */
import type { SupabaseLike, ToolResult } from '../types'

const WHALE_FLAT_THRESHOLD_USD = 100_000
const ROW_LIMIT = 500

export interface GetWhaleFlowsArgs {
  ticker?: unknown
}

export async function run(
  args: GetWhaleFlowsArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const ticker = normaliseTicker(args.ticker)
  if (!ticker) {
    return { ok: false, data: null, source: 'all_whale_transactions', fetched_at, error: 'invalid_ticker' }
  }

  const sinceIso = new Date(now().getTime() - 24 * 60 * 60 * 1000).toISOString()

  try {
    const { data } = await supabase
      .from('all_whale_transactions')
      .select('usd_value, classification, whale_address')
      .eq('token_symbol', ticker)
      .gte('timestamp', sinceIso)
      .limit(ROW_LIMIT)

    if (!Array.isArray(data) || data.length === 0) {
      return { ok: true, data: emptyFlow(ticker), source: 'all_whale_transactions', fetched_at }
    }

    let buyUsd = 0
    let sellUsd = 0
    let buys = 0
    let sells = 0
    const whales = new Set<string>()
    for (const row of data as Array<any>) {
      const v = Number(row?.usd_value)
      if (!Number.isFinite(v) || v <= 0) continue
      const c = String(row?.classification ?? '').toLowerCase()
      if (row?.whale_address) whales.add(String(row.whale_address))
      if (c.startsWith('buy')) {
        buyUsd += v
        buys += 1
      } else if (c.startsWith('sell')) {
        sellUsd += v
        sells += 1
      }
    }

    const net = buyUsd - sellUsd
    const direction =
      net > WHALE_FLAT_THRESHOLD_USD ? 'up' : net < -WHALE_FLAT_THRESHOLD_USD ? 'down' : 'flat'

    return {
      ok: true,
      data: {
        ticker,
        window: '24h',
        buy_usd: Math.round(buyUsd),
        sell_usd: Math.round(sellUsd),
        net_usd: Math.round(net),
        direction,
        buy_count: buys,
        sell_count: sells,
        unique_whales: whales.size,
      },
      source: 'all_whale_transactions',
      fetched_at,
    }
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      source: 'all_whale_transactions',
      fetched_at,
      error: err?.message ? `query_failed: ${err.message}` : 'query_failed',
    }
  }
}

function emptyFlow(ticker: string) {
  return {
    ticker,
    window: '24h',
    buy_usd: 0,
    sell_usd: 0,
    net_usd: 0,
    direction: 'flat' as const,
    buy_count: 0,
    sell_count: 0,
    unique_whales: 0,
  }
}

function normaliseTicker(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().toUpperCase()
  if (!/^[A-Z0-9._-]{1,12}$/.test(t)) return null
  return t
}
