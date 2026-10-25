/**
 * One parser and one filter builder for /api/trades and /api/trades/since,
 * so the table and its live updates can never disagree about what a row is.
 * Every read is bounded in time: sinceHours is clamped to [1, 720] and the
 * `since` route never looks back more than 24 h.
 */
export const TRADES_STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD', 'USDK', 'USDN', 'FEI', 'TRIBE', 'CUSD']
export const TRADES_SELECT =
  'transaction_hash,timestamp,blockchain,token_symbol,classification,usd_value,from_address,to_address,whale_address,counterparty_type,whale_score'

export const MAX_SINCE_HOURS = 720
/** Exact counts above 7 days took 4 s+ on the UNION view (measured 2026-10-25). */
export const EXACT_COUNT_MAX_HOURS = 168
export const SINCE_MAX_LOOKBACK_HOURS = 24
export const SINCE_DEFAULT_LOOKBACK_MS = 10 * 60_000
export const TRADES_PAGE_MAX = 100

export function clampSinceHours(raw: unknown): number {
  return Math.min(Math.max(Number(raw) || 24, 1), MAX_SINCE_HOURS)
}

export interface TradesParams {
  minUsd?: number
  maxUsd?: number
  token: string
  side: string
  chain: string
  sinceHours: number
  page: number
  limit: number
}

function num(raw: string | null): number | undefined {
  if (raw === null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

export function parseTradesParams(sp: URLSearchParams): TradesParams {
  const limitRaw = parseInt(sp.get('limit') || String(TRADES_PAGE_MAX), 10)
  return {
    minUsd: num(sp.get('minUsd')),
    maxUsd: num(sp.get('maxUsd')),
    token: (sp.get('token') || '').trim(),
    side: (sp.get('side') || '').trim().toLowerCase(),
    chain: (sp.get('chain') || '').trim(),
    sinceHours: clampSinceHours(sp.get('sinceHours')),
    page: Math.max(1, parseInt(sp.get('page') || '1', 10) || 1),
    limit: Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : TRADES_PAGE_MAX), TRADES_PAGE_MAX),
  }
}

/** `after` for the since route: missing → now − 10 min; unparsable → null (400). */
export function parseAfter(raw: string | null, now: number): string | null {
  if (raw === null || raw === '') return new Date(now - SINCE_DEFAULT_LOOKBACK_MS).toISOString()
  const t = Date.parse(raw)
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}

/** Lower time bound of a since read: max(after, now − min(sinceHours, 24) h). */
export function sinceBoundIso(afterIso: string, sinceHours: number, now: number): string {
  const floor = now - Math.min(sinceHours, SINCE_MAX_LOOKBACK_HOURS) * 3_600_000
  return new Date(Math.max(Date.parse(afterIso), floor)).toISOString()
}

/** Lower time bound of a list read. */
export function listBoundIso(sinceHours: number, now: number): string {
  return new Date(now - sinceHours * 3_600_000).toISOString()
}

/** The row filters both routes share (everything except the time bound). */
export function applyTradesFilters(q: any, p: TradesParams): any {
  let out = q
    .not('token_symbol', 'is', null)
    .not('token_symbol', 'ilike', 'unknown%')
    .not('token_symbol', 'in', `(${TRADES_STABLECOINS.join(',')})`)
  if (p.minUsd !== undefined) out = out.gte('usd_value', p.minUsd)
  if (p.maxUsd !== undefined) out = out.lte('usd_value', p.maxUsd)
  if (p.token) out = out.ilike('token_symbol', `%${p.token}%`)
  if (p.side) out = out.ilike('classification', p.side)
  if (p.chain) out = out.ilike('blockchain', `%${p.chain}%`)
  return out
}
