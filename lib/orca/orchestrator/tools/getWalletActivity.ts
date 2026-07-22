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
 *   - tracked_address_transfers (cron-fed per-entity transfer feed — the
 *     fallback when the whale feed has nothing; see below)
 *   - tracked_address_universe (Arkham-labelled name, if any)
 *   - user_wallets             (user's own nickname, if any)
 *
 * Transfer-feed fallback: the whale feed only records whale-sized eth/sol
 * transfers, so plenty of Arkham-labelled wallets (exchange deposit
 * processors, treasuries) legitimately have zero rows there while the
 * hourly /api/cron/poll-tracked-addresses poller has full Alchemy/Helius
 * history for them in tracked_address_transfers. When BOTH the window and
 * lifetime whale stats are empty, this tool consults that table and
 * returns a `transfer_feed` block (raw in/out transfers — unclassified,
 * NOT buys/sells) so the renderer can say something real instead of
 * "this feed has nothing recorded" for a wallet we demonstrably track
 * (2026-07-22: Binance deposit wallet 0xBD61…0774 repro).
 *
 * Privacy: this is a read-only aggregate; it does NOT include the user_id
 * of any other user. user_wallets is consulted ONLY for the calling user.
 */
import type { SupabaseLike, ToolResult } from '../types'
import { detectAddress } from '../detectAddress'

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

// The agentic planner's LLM emits chain names in whatever form it thinks of
// ("solana", "ethereum", "SOL"...). Rejecting those made the tool fail with
// invalid_args nondeterministically (trace 2026-07-18: thought said "default
// to solana" → invalid_args → "That data isn't available right now").
// Accept every common alias and map to the canonical short form.
const CHAIN_ALIASES: Record<string, string> = {
  eth: 'eth', ethereum: 'eth', mainnet: 'eth', 'erc-20': 'eth', erc20: 'eth',
  btc: 'btc', bitcoin: 'btc',
  sol: 'sol', solana: 'sol',
  base: 'base',
  arb: 'arb', arbitrum: 'arb',
  polygon: 'polygon', matic: 'polygon',
  bsc: 'bsc', bnb: 'bsc', binance: 'bsc', 'bnb chain': 'bsc',
  avax: 'avax', avalanche: 'avax',
  tron: 'tron', trx: 'tron',
  xrp: 'xrp', ripple: 'xrp',
}

// The label tables don't share one chain vocabulary: `tracked_address_universe`
// stores Arkham's long forms ('bitcoin', 'arbitrum_one', 'avalanche') while
// `user_wallets` stores short forms ('eth'). Filtering either with the
// canonical short form silently missed every long-form row (2026-07-19 audit:
// Robinhood's bitcoin cold wallet had a label but eq('chain','btc') never
// found it). Match all known spellings of the canonical chain instead.
const CHAIN_DB_FORMS: Record<string, string[]> = {
  eth: ['eth', 'ethereum'],
  btc: ['btc', 'bitcoin'],
  sol: ['sol', 'solana'],
  base: ['base'],
  arb: ['arb', 'arbitrum', 'arbitrum_one'],
  polygon: ['polygon', 'matic'],
  bsc: ['bsc', 'bnb'],
  avax: ['avax', 'avalanche'],
  tron: ['tron', 'trx'],
  xrp: ['xrp', 'ripple'],
}

function chainDbForms(chain: string): string[] {
  return CHAIN_DB_FORMS[chain] ?? [chain]
}

function normaliseAddress(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s.length < 4 || s.length > 128) return null
  if (!/^[A-Za-z0-9._:-]+$/.test(s)) return null
  return s
}

function normaliseChain(v: unknown): string | null {
  if (typeof v !== 'string') return null
  return CHAIN_ALIASES[v.trim().toLowerCase()] ?? null
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
  const userId = normaliseUserId(args.userId)
  if (!address) {
    return {
      ok: false,
      data: null,
      source: 'wallet_activity',
      fetched_at,
      error: 'invalid_args',
    }
  }
  // Chain is only needed for the label lookups (the tx query matches by
  // address alone), so never fail on it: accept aliases, else infer from
  // the address shape, else proceed chainless.
  const chain = normaliseChain(args.chain) ?? detectAddress(address)?.chain ?? null
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
    // EVM addresses additionally match case-insensitively via ilike (a
    // no-wildcard ilike is an exact case-insensitive match): the cron stores
    // whatever casing tracked_address_universe has (usually checksummed),
    // which need not be either form the user typed. Base58 chains stay
    // case-sensitive — lowercasing Solana addresses corrupts them.
    const isEvmAddress = /^0x[0-9a-fA-F]{40}$/.test(address)
    const addrFilter = (q: any) =>
      isEvmAddress && typeof q.ilike === 'function'
        ? q.ilike('address', dbAddress)
        : dbAddress === address || typeof q.in !== 'function'
          ? q.eq('address', address)
          : q.in('address', [address, dbAddress])

    // Transfer-feed fallback (see the header comment): only when the whale
    // feed knows nothing about this wallet at all.
    let transferFeed: Record<string, unknown> | null = null
    const whaleFeedEmpty =
      txCount === 0 && rows.length === 0 && (!lifetime || lifetime.txCount === 0)
    if (whaleFeedEmpty) {
      try {
        const TRANSFER_COLS =
          'direction, amount_usd, token_symbol, timestamp, tx_hash, counterparty, chain'
        const fetchTransfers = async (windowedSince: string | null, limit: number) => {
          let q = addrFilter(
            supabase.from('tracked_address_transfers').select(TRANSFER_COLS)
          )
          if (windowedSince) q = q.gte('timestamp', windowedSince)
          const { data } = await q.order('timestamp', { ascending: false }).limit(limit)
          return Array.isArray(data) ? (data as any[]) : []
        }

        const windowRows = await fetchTransfers(sinceIso, ROW_LIMIT)
        // Window empty → probe the latest transfers ever recorded, so the
        // answer can still say when the wallet last moved.
        const latestRows =
          windowRows.length > 0 ? windowRows : await fetchTransfers(null, TOP_TX_COUNT)

        if (latestRows.length > 0) {
          let inUsd = 0
          let outUsd = 0
          const feedTokens = new Set<string>()
          for (const t of windowRows) {
            const v = Number(t?.amount_usd)
            if (Number.isFinite(v) && v > 0) {
              if (String(t?.direction ?? '').toLowerCase() === 'in') inUsd += v
              else outUsd += v
            }
            if (t?.token_symbol) feedTokens.add(String(t.token_symbol).toUpperCase())
          }
          // In-window: biggest transfers first (mirrors top_txs). Out-of-window
          // probe: keep newest-first — recency is the story there.
          const shown = (windowRows.length > 0
            ? [...windowRows].sort(
                (a, b) => (Number(b?.amount_usd) || 0) - (Number(a?.amount_usd) || 0)
              )
            : latestRows
          ).slice(0, TOP_TX_COUNT)
          transferFeed = {
            window: windowLabel,
            tx_count: windowRows.length, // capped at ROW_LIMIT
            in_usd: Math.round(inUsd),
            out_usd: Math.round(outUsd),
            tokens_touched: Array.from(feedTokens).slice(0, 20),
            recent_transfers: shown.map((t: any) => ({
              direction: t?.direction ?? null,
              amount_usd: Number.isFinite(Number(t?.amount_usd))
                ? Math.round(Number(t.amount_usd))
                : null,
              token_symbol: t?.token_symbol ? String(t.token_symbol).toUpperCase() : null,
              timestamp: t?.timestamp ?? null,
              tx_hash: t?.tx_hash ?? null,
              counterparty: t?.counterparty ?? null,
            })),
            last_transfer_at: latestRows[0]?.timestamp ?? null,
          }
        }
      } catch {
        // fallback is best-effort; the whale-feed answer stands without it
      }
    }

    // Arkham label. Matched by ADDRESS ALONE: the guessed chain for a 0x
    // address is 'eth', but the labelled row may live under 'bsc'/'base'/
    // 'arbitrum_one' (the universe stores Arkham's long chain names, not our
    // short forms — 2026-07-19 audit: Binance's bsc hot wallet had a label
    // that a chain='eth' filter could never find). When several chains carry
    // the address, prefer the one matching the caller's chain; the entity
    // behind an EVM address is the same across chains in practice.
    let arkhamLabel: string | null = null
    try {
      const tauQ = supabase
        .from('tracked_address_universe')
        .select('arkham_entity_name, arkham_label, chain')
      const { data: tauRows } = await addrFilter(tauQ).limit(10)
      const rows = Array.isArray(tauRows) ? tauRows : []
      const preferredForms = chain ? chainDbForms(chain) : []
      const tau =
        rows.find((r: any) => preferredForms.includes(String(r?.chain ?? '').toLowerCase())) ??
        rows[0] ??
        null
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
        // user_id + address is already precise; a chain filter only re-adds
        // the guessed-chain mismatch (see the Arkham lookup above).
        const uwQ = supabase
          .from('user_wallets')
          .select('label')
          .eq('user_id', userId)
        const { data: uwRows } = await addrFilter(uwQ).limit(1)
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
        transfer_feed: transferFeed,
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
