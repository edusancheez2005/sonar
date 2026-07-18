/**
 * Tool: getWalletActivity (W3)
 * =============================================================================
 * Aggregates recent on-chain activity for a single wallet address on a
 * single chain. Returns label (if known), tx count, net USD flow, the
 * top transactions by USD value, and the set of tokens touched.
 *
 * Window behaviour: defaults to 24h but AUTO-WIDENS to 7d then 30d when the
 * wallet has no activity in the smaller window (driven by the wallet's real
 * last_active from wallet_tx_stats, so a dormant wallet costs no extra
 * probing). A lifetime summary rides along so the renderer can always say
 * something factual ("738 txs all-time, net seller, last active Jul 10")
 * instead of a bare "0 transactions". An explicit `since` arg disables
 * widening.
 *
 * Case: whale_address is stored lowercased for every chain (verified in
 * prod 2026-07-17 — zero rows contain an uppercase char), so all DB lookups
 * use the lowercased address. Base58/checksummed input from users is
 * therefore matched correctly; the original casing is echoed back in
 * `address` for display.
 *
 * Sources:
 *   - all_whale_transactions   (canonical multi-chain view)
 *   - wallet_tx_stats / wallet_token_flows RPCs (exact server-side sums —
 *     same canonical definition as the wallet page)
 *   - tracked_address_universe (Arkham-labelled name, if any)
 *   - user_wallets             (user's own nickname, if any)
 *
 * Privacy: this is a read-only aggregate; it does NOT include the user_id
 * of any other user. user_wallets is consulted ONLY for the calling user.
 */
import type { SupabaseLike, ToolResult } from '../types'

const ROW_LIMIT = 200
const TOP_TX_COUNT = 5

const WINDOWS: Array<{ label: '24h' | '7d' | '30d'; ms: number }> = [
  { label: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
]

const LIFETIME_SINCE = '1970-01-01T00:00:00.000Z'

export interface GetWalletActivityArgs {
  address?: unknown
  chain?: unknown
  userId?: unknown
  /** Optional ISO timestamp; when set, that exact window is used (no auto-widening). */
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

function parseSince(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

interface WindowStats {
  txCount: number
  buyUsd: number
  sellUsd: number
  lastActive: string | null
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
  // whale_address is stored lowercased for every chain; the user may paste
  // a checksummed / base58 form. Query with the lowercase form, echo the
  // original back for display.
  const dbAddress = address.toLowerCase()
  const explicitSince = parseSince(args.since)
  const nowMs = now().getTime()

  // Capture the optional method once so TS can narrow it inside closures.
  const rpcFn = typeof supabase.rpc === 'function' ? supabase.rpc.bind(supabase) : null
  const hasRpc = rpcFn !== null

  const rpcStats = async (sinceIso: string): Promise<WindowStats | null> => {
    if (!rpcFn) return null
    try {
      const { data } = await rpcFn('wallet_tx_stats', {
        p_address: dbAddress,
        p_since: sinceIso,
      })
      const stat = Array.isArray(data) ? data[0] : data
      if (!stat) return null
      return {
        txCount: Number(stat.tx_count) || 0,
        buyUsd: Number(stat.buy_volume) || 0,
        sellUsd: Number(stat.sell_volume) || 0,
        lastActive: typeof stat.last_active === 'string' ? stat.last_active : null,
      }
    } catch {
      return null
    }
  }

  const fetchRows = async (sinceIso: string) => {
    const { data } = await supabase
      .from('all_whale_transactions')
      .select('usd_value, classification, token_symbol, timestamp, transaction_hash')
      .eq('whale_address', dbAddress)
      .gte('timestamp', sinceIso)
      .order('usd_value', { ascending: false })
      .limit(ROW_LIMIT)
    return Array.isArray(data) ? data : []
  }

  try {
    // 1. Pick the window. With the RPC available, the wallet's lifetime
    //    last_active decides it in one call; without it, probe row counts.
    let windowLabel: string = explicitSince ?? '24h'
    let sinceIso = explicitSince ?? new Date(nowMs - WINDOWS[0].ms).toISOString()
    let widened = false
    let lifetime: WindowStats | null = null

    if (hasRpc) lifetime = await rpcStats(LIFETIME_SINCE)

    if (!explicitSince && lifetime) {
      const lastMs = lifetime.lastActive ? new Date(lifetime.lastActive).getTime() : NaN
      const fit = Number.isFinite(lastMs)
        ? WINDOWS.find((w) => lastMs >= nowMs - w.ms)
        : undefined
      if (fit) {
        windowLabel = fit.label
        sinceIso = new Date(nowMs - fit.ms).toISOString()
        widened = fit.label !== '24h'
      } else {
        // Dormant >30d (or never seen): report the widest window's zeros;
        // the lifetime block carries the story.
        windowLabel = '30d'
        sinceIso = new Date(nowMs - WINDOWS[2].ms).toISOString()
        widened = true
      }
    }

    // 2. Rows for the chosen window (top txs + no-RPC fallback sums).
    let rows = await fetchRows(sinceIso)

    // No-RPC widening: probe the larger windows only when 24h came back empty.
    if (!explicitSince && !lifetime && rows.length === 0) {
      for (const w of WINDOWS.slice(1)) {
        const probe = await fetchRows(new Date(nowMs - w.ms).toISOString())
        if (probe.length > 0) {
          rows = probe
          windowLabel = w.label
          sinceIso = new Date(nowMs - w.ms).toISOString()
          widened = true
          break
        }
      }
    }

    let buyUsd = 0
    let sellUsd = 0
    let txCount = rows.length
    const tokens = new Set<string>()
    for (const r of rows as any[]) {
      const v = Number(r?.usd_value)
      if (!Number.isFinite(v) || v <= 0) continue
      const c = String(r?.classification ?? '').toLowerCase()
      if (c.startsWith('buy')) buyUsd += v
      else if (c.startsWith('sell')) sellUsd += v
      if (r?.token_symbol) tokens.add(String(r.token_symbol).toUpperCase())
    }

    // 3. Exact server-side sums for the chosen window (same canonical
    //    definition as the wallet page). Falls back to the capped JS sums.
    let tokensList = Array.from(tokens).slice(0, 20)
    if (rpcFn) {
      const stat = await rpcStats(sinceIso)
      if (stat) {
        buyUsd = stat.buyUsd
        sellUsd = stat.sellUsd
        txCount = stat.txCount
      }
      try {
        const { data: flowRows } = await rpcFn('wallet_token_flows', {
          p_address: dbAddress,
          p_since: sinceIso,
        })
        if (Array.isArray(flowRows) && flowRows.length > 0) {
          tokensList = flowRows
            .map((f: any) => String(f.token_symbol || '').toUpperCase())
            .filter(Boolean)
            .slice(0, 20)
        }
      } catch {
        // keep the JS-computed (capped) tokens
      }
    }

    const topTxs = rows.slice(0, TOP_TX_COUNT).map((r: any) => ({
      usd_value: Math.round(Number(r?.usd_value) || 0),
      classification: r?.classification ?? null,
      token_symbol: r?.token_symbol ? String(r.token_symbol).toUpperCase() : null,
      timestamp: r?.timestamp ?? null,
      transaction_hash: r?.transaction_hash ?? null,
    }))

    // Label tables may store the address in either case — match both forms.
    // (.in falls back to .eq when unavailable, e.g. in test stubs.)
    const addrFilter = (q: any) =>
      dbAddress === address || typeof q.in !== 'function'
        ? q.eq('address', address)
        : q.in('address', [address, dbAddress])

    // Arkham label (chain, address).
    let arkhamLabel: string | null = null
    try {
      const { data: tauRows } = await addrFilter(
        supabase
          .from('tracked_address_universe')
          .select('arkham_entity_name, arkham_label')
          .eq('chain', chain)
      ).limit(1)
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
        const { data: uwRows } = await addrFilter(
          supabase
            .from('user_wallets')
            .select('label')
            .eq('user_id', userId)
            .eq('chain', chain)
        ).limit(1)
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
        window: windowLabel,
        window_auto_widened: widened,
        tx_count: txCount,
        buy_usd: Math.round(buyUsd),
        sell_usd: Math.round(sellUsd),
        net_flow_usd: Math.round(buyUsd - sellUsd),
        tokens_touched: tokensList,
        top_txs: topTxs,
        lifetime: lifetime
          ? {
              tx_count: lifetime.txCount,
              buy_usd: Math.round(lifetime.buyUsd),
              sell_usd: Math.round(lifetime.sellUsd),
              net_flow_usd: Math.round(lifetime.buyUsd - lifetime.sellUsd),
              last_active: lifetime.lastActive,
            }
          : null,
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
