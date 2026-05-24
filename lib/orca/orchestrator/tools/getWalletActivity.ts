/**
 * Tool: getWalletActivity (W3)
 * =============================================================================
 * Aggregates the last-24h on-chain activity for a single wallet address on
 * a single chain. Returns label (if known), tx count, net USD flow, the
 * top transactions by USD value, and the set of tokens touched.
 *
 * Sources:
 *   - all_whale_transactions  (canonical multi-chain view)
 *   - tracked_address_universe (Arkham-labelled name, if any)
 *   - user_wallets             (user's own nickname, if any)
 *
 * Privacy: this is a read-only aggregate; it does NOT include the user_id
 * of any other user. user_wallets is consulted ONLY for the calling user.
 */
import type { SupabaseLike, ToolResult } from '../types'

const ROW_LIMIT = 200
const TOP_TX_COUNT = 5

export interface GetWalletActivityArgs {
  address?: unknown
  chain?: unknown
  userId?: unknown
  /** Optional ISO timestamp; defaults to now-24h. */
  since?: unknown
}

const VALID_CHAINS = new Set([
  'eth', 'btc', 'sol', 'base', 'arb', 'polygon', 'bsc', 'tron', 'xrp',
])

function normaliseAddress(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s.length < 4 || s.length > 128) return null
  if (!/^[A-Za-z0-9._:-]+$/.test(s)) return null
  return s
}

function normaliseChain(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const c = v.trim().toLowerCase()
  return VALID_CHAINS.has(c) ? c : null
}

function normaliseUserId(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s.length < 8 || s.length > 128) return null
  return s
}

function normaliseSince(v: unknown, now: Date): string {
  if (typeof v === 'string') {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
}

export async function run(
  args: GetWalletActivityArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const address = normaliseAddress(args.address)
  const chain = normaliseChain(args.chain)
  const userId = normaliseUserId(args.userId)
  if (!address || !chain) {
    return {
      ok: false,
      data: null,
      source: 'wallet_activity',
      fetched_at,
      error: 'invalid_args',
    }
  }
  const sinceIso = normaliseSince(args.since, now())

  try {
    // Activity (whale_address may be lowercase in the view; we match both).
    const { data: txRows } = await supabase
      .from('all_whale_transactions')
      .select('usd_value, classification, token_symbol, timestamp, transaction_hash')
      .eq('whale_address', address)
      .gte('timestamp', sinceIso)
      .order('usd_value', { ascending: false })
      .limit(ROW_LIMIT)

    const rows = Array.isArray(txRows) ? txRows : []

    let buyUsd = 0
    let sellUsd = 0
    const tokens = new Set<string>()
    for (const r of rows as any[]) {
      const v = Number(r?.usd_value)
      if (!Number.isFinite(v) || v <= 0) continue
      const c = String(r?.classification ?? '').toLowerCase()
      if (c.startsWith('buy')) buyUsd += v
      else if (c.startsWith('sell')) sellUsd += v
      if (r?.token_symbol) tokens.add(String(r.token_symbol).toUpperCase())
    }
    const topTxs = rows.slice(0, TOP_TX_COUNT).map((r: any) => ({
      usd_value: Math.round(Number(r?.usd_value) || 0),
      classification: r?.classification ?? null,
      token_symbol: r?.token_symbol ? String(r.token_symbol).toUpperCase() : null,
      timestamp: r?.timestamp ?? null,
      transaction_hash: r?.transaction_hash ?? null,
    }))

    // Arkham label (chain, address).
    let arkhamLabel: string | null = null
    try {
      const { data: tauRows } = await supabase
        .from('tracked_address_universe')
        .select('arkham_entity_name, arkham_label')
        .eq('chain', chain)
        .eq('address', address)
        .limit(1)
      const tau = Array.isArray(tauRows) ? tauRows[0] : null
      if (tau) {
        arkhamLabel =
          (typeof tau.arkham_entity_name === 'string' && tau.arkham_entity_name) ||
          (typeof tau.arkham_label === 'string' && tau.arkham_label) ||
          null
      }
    } catch {
      // label lookup is best-effort
    }

    // User's own label, if any.
    let userLabel: string | null = null
    if (userId) {
      try {
        const { data: uwRows } = await supabase
          .from('user_wallets')
          .select('label')
          .eq('user_id', userId)
          .eq('address', address)
          .eq('chain', chain)
          .limit(1)
        const uw = Array.isArray(uwRows) ? uwRows[0] : null
        if (uw && typeof uw.label === 'string' && uw.label.trim()) {
          userLabel = uw.label.trim()
        }
      } catch {
        // ignore
      }
    }

    return {
      ok: true,
      data: {
        address,
        chain,
        label: userLabel ?? arkhamLabel ?? null,
        label_source: userLabel ? 'user' : arkhamLabel ? 'arkham' : null,
        window: '24h',
        tx_count: rows.length,
        buy_usd: Math.round(buyUsd),
        sell_usd: Math.round(sellUsd),
        net_flow_usd: Math.round(buyUsd - sellUsd),
        tokens_touched: Array.from(tokens).slice(0, 20),
        top_txs: topTxs,
      },
      source: 'wallet_activity',
      fetched_at,
    }
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      source: 'wallet_activity',
      fetched_at,
      error: err?.message ? `query_failed: ${err.message}` : 'query_failed',
    }
  }
}
