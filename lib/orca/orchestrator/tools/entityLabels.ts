/**
 * entityLabels — join Arkham-derived entity labels onto wallet rows (§7).
 * =============================================================================
 * Nansen's signature is LABELS. We already own a label source:
 * `tracked_address_universe` (the Arkham-harvested address book, keyed on
 * chain+address). This helper joins those labels onto wallet rows using the
 * INJECTED supabase client (so it stays unit-testable), rather than the cached
 * `lib/arkham/address-lookup.ts` module which pins the prerendered admin client.
 *
 * Flag: ORCA_ENTITY_LABELS (default ON because a source exists; set to 'false'
 * to disable the join entirely). Never throws — labels are purely additive, so
 * an unlabelled wallet simply shows its bare address.
 *
 * NEVER fabricate a label: a wallet with no row in tracked_address_universe
 * gets no label and no cohort.
 */
import type { SupabaseLike } from '../types'

export interface EntityLabel {
  /** Display name, e.g. "Binance" or "Binance — Cold Wallet 2". */
  label?: string
  /** Neutral factual cohort/category (arkham_entity_type), e.g. "cex", "fund". */
  cohort?: string
}

export function entityLabelsEnabled(): boolean {
  return process.env.ORCA_ENTITY_LABELS !== 'false'
}

/**
 * Returns a Map keyed by BOTH the original and lowercased address so callers
 * can look up either casing. Empty map when the flag is off, no addresses, or
 * on any error.
 */
export async function fetchEntityLabels(
  supabase: SupabaseLike,
  addresses: Array<string | null | undefined>
): Promise<Map<string, EntityLabel>> {
  const out = new Map<string, EntityLabel>()
  if (!entityLabelsEnabled()) return out

  const cleaned = addresses
    .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
    .map((a) => a.trim())
  if (cleaned.length === 0) return out

  // Match both original and lowercased forms (EVM addresses arrive mixed-case).
  const candidates = [...new Set([...cleaned, ...cleaned.map((a) => a.toLowerCase())])]

  try {
    const { data } = await supabase
      .from('tracked_address_universe')
      .select('address, arkham_entity_name, arkham_entity_type, arkham_label')
      .in('address', candidates)
    if (!Array.isArray(data)) return out
    for (const row of data as any[]) {
      const addr = typeof row?.address === 'string' ? row.address : null
      if (!addr) continue
      const name = typeof row.arkham_entity_name === 'string' ? row.arkham_entity_name.trim() : ''
      const sub = typeof row.arkham_label === 'string' ? row.arkham_label.trim() : ''
      const type = typeof row.arkham_entity_type === 'string' ? row.arkham_entity_type.trim() : ''
      const label = name ? (sub && sub !== name ? `${name} — ${sub}` : name) : sub || undefined
      const rec: EntityLabel = {}
      if (label) rec.label = label
      if (type) rec.cohort = type
      if (!rec.label && !rec.cohort) continue
      out.set(addr, rec)
      out.set(addr.toLowerCase(), rec)
    }
  } catch {
    // best-effort; labels are additive
  }
  return out
}

/** Attach label/cohort to a wallet row by its `address` (returns a new object). */
export function applyLabel<T extends { address: string }>(
  row: T,
  labels: Map<string, EntityLabel>
): T & EntityLabel {
  const rec = labels.get(row.address) || labels.get(row.address.toLowerCase())
  return rec ? { ...row, ...rec } : row
}
