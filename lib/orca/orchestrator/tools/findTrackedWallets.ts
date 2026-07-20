/**
 * Tool: findTrackedWallets (W3)
 * =============================================================================
 * Free-text search over the wallets the current user knows about. Sources:
 *
 *   1. user_wallets        \u2014 the user's own tracked wallets (always shown).
 *   2. tracked_address_universe \u2014 Arkham-labelled public addresses.
 *
 * The query is matched against (address prefix), (chain), and (label /
 * entity name). Results are merged and deduped on (chain, address).
 */
import type { SupabaseLike, ToolResult } from '../types'

const RESULT_LIMIT = 10

export interface FindTrackedWalletsArgs {
  query?: unknown
  userId?: unknown
}

function normaliseQuery(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s.length < 2 || s.length > 80) return null
  // strip stray quote characters but keep alnum / typical address chars
  return s.replace(/["'`]/g, '')
}

function normaliseUserId(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s.length < 8 || s.length > 128) return null
  return s
}

export async function run(
  args: FindTrackedWalletsArgs,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const query = normaliseQuery(args.query)
  if (!query) {
    return {
      ok: false,
      data: null,
      source: 'wallets_search',
      fetched_at,
      error: 'invalid_query',
    }
  }
  const userId = normaliseUserId(args.userId)
  const like = `%${query}%`
  // "Robinhood cold wallet" spans TWO columns (entity_name "Robinhood" +
  // label "Cold Wallet"), so a single full-phrase ilike matches nothing
  // (2026-07-19 audit). Each meaningful word must match SOME field; generic
  // filler ("wallet", "address") is dropped so it doesn't demand a match.
  const GENERIC_WORDS = new Set(['wallet', 'wallets', 'address', 'addresses', 'the', 'account'])
  const words = query
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !GENERIC_WORDS.has(w.toLowerCase()))
    .slice(0, 5)

  type Match = {
    address: string
    chain: string
    label: string | null
    source: 'user' | 'arkham'
  }
  const seen = new Set<string>()
  const matches: Match[] = []

  // 1) User's own wallets first (highest priority).
  if (userId) {
    try {
      let uwQ = supabase
        .from('user_wallets')
        .select('address, chain, label')
        .eq('user_id', userId)
      if (words.length > 1) {
        for (const w of words) {
          uwQ = uwQ.or(`address.ilike.%${w}%,label.ilike.%${w}%,chain.ilike.%${w}%`)
        }
      } else {
        uwQ = uwQ.or(`address.ilike.${like},label.ilike.${like},chain.ilike.${like}`)
      }
      const { data } = await uwQ.limit(RESULT_LIMIT)
      const rows = Array.isArray(data) ? data : []
      for (const r of rows as any[]) {
        const address = String(r?.address ?? '').trim()
        const chain = String(r?.chain ?? '').trim().toLowerCase()
        if (!address || !chain) continue
        const key = `${chain}:${address}`
        if (seen.has(key)) continue
        seen.add(key)
        matches.push({
          address,
          chain,
          label: typeof r?.label === 'string' && r.label.trim() ? r.label.trim() : null,
          source: 'user',
        })
      }
    } catch {
      // best-effort
    }
  }

  // 2) Arkham-labelled public addresses.
  if (matches.length < RESULT_LIMIT) {
    try {
      const remaining = RESULT_LIMIT - matches.length
      let tauQ = supabase
        .from('tracked_address_universe')
        .select('address, chain, arkham_entity_name, arkham_label')
      if (words.length > 1) {
        // AND of per-word ORs: every word must appear in some label field.
        for (const w of words) {
          tauQ = tauQ.or(`address.ilike.%${w}%,arkham_entity_name.ilike.%${w}%,arkham_label.ilike.%${w}%`)
        }
      } else {
        tauQ = tauQ.or(
          `address.ilike.${like},arkham_entity_name.ilike.${like},arkham_label.ilike.${like}`
        )
      }
      const { data } = await tauQ.limit(remaining)
      const rows = Array.isArray(data) ? data : []
      for (const r of rows as any[]) {
        const address = String(r?.address ?? '').trim()
        const chain = String(r?.chain ?? '').trim().toLowerCase()
        if (!address || !chain) continue
        const key = `${chain}:${address}`
        if (seen.has(key)) continue
        seen.add(key)
        const name =
          (typeof r?.arkham_entity_name === 'string' && r.arkham_entity_name) ||
          (typeof r?.arkham_label === 'string' && r.arkham_label) ||
          null
        matches.push({
          address,
          chain,
          label: name,
          source: 'arkham',
        })
      }
    } catch {
      // best-effort
    }
  }

  return {
    ok: true,
    data: {
      query,
      matches,
    },
    source: 'wallets_search',
    fetched_at,
  }
}
