/**
 * Address label lookup backed by tracked_address_universe.
 *
 * tracked_address_universe is the Arkham-derived address book we harvested
 * before cancelling the Arkham subscription (see scripts/arkham-harvest-
 * addresses.mjs). It contains ~1.8k entity-attributed addresses across 15
 * chains. This module is the read path: pure DB lookups, ZERO Arkham calls,
 * safe to use forever even if ARKHAM_ENABLED is false.
 *
 * Use as a fallback AFTER `addresses.entity_name`: that legacy table is
 * Etherscan-tag-based and usually higher quality for the addresses it
 * covers; tracked_address_universe is much wider (Solana, Tron, Base, etc.).
 */
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export type ArkhamLabel = {
  address: string
  chain: string | null
  entity_id: string | null
  entity_name: string | null
  entity_type: string | null
  label: string | null            // e.g. "Cold Wallet 2"
  is_contract: boolean | null
}

/**
 * Returns a Map<address, ArkhamLabel> for the given lowercase-normalized
 * addresses. Look-ups are case-insensitive on the address column for EVM
 * chains; we query both the original and lowercased form to be safe.
 */
export async function fetchArkhamLabels(addresses: string[]): Promise<Map<string, ArkhamLabel>> {
  const out = new Map<string, ArkhamLabel>()
  if (!addresses?.length) return out

  // Dedup, preserve original casing for the lookup key.
  const unique = [...new Set(addresses)]
  // Postgres .in() is exact-match; for EVM addresses upstream may pass mixed
  // case. Try both as-is and lowercased so both shapes hit.
  const candidates = [...new Set([...unique, ...unique.map(a => a.toLowerCase())])]

  const { data, error } = await supabaseAdmin
    .from('tracked_address_universe')
    .select('address, chain, arkham_entity_id, arkham_entity_name, arkham_entity_type, arkham_label, arkham_is_contract')
    .in('address', candidates)

  if (error || !data) return out

  for (const row of data) {
    const rec: ArkhamLabel = {
      address: row.address,
      chain: row.chain,
      entity_id: row.arkham_entity_id,
      entity_name: row.arkham_entity_name,
      entity_type: row.arkham_entity_type,
      label: row.arkham_label,
      is_contract: row.arkham_is_contract,
    }
    // Map under both casings so callers can look up either.
    out.set(row.address, rec)
    out.set(row.address.toLowerCase(), rec)
  }
  return out
}

/** Compose a display string: "Binance — Cold Wallet 2" or just "Binance". */
export function formatArkhamDisplayName(rec: ArkhamLabel | undefined | null): string | null {
  if (!rec || !rec.entity_name) return null
  if (rec.label && rec.label !== rec.entity_name) return `${rec.entity_name} — ${rec.label}`
  return rec.entity_name
}
