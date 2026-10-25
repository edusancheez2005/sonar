/**
 * Follow one of the famous wallets (lib/onboarding/famousWallets.js): the
 * shared core of POST /api/onboarding/follow-famous and ORCA's
 * "follow MrBeast" / "unfollow Trump".
 *
 * followFamous:
 *   1. resolves the entity's addresses from curated_entities and keeps the
 *      best ≤3 (recently active first, then those in the tracked universe,
 *      then declared order);
 *   2. upserts wallet_follows rows (Personal page, poller, digest) and the
 *      entity_watchlist row (figures directory);
 *   3. creates wallet_activity alert rules with the wallet's floor
 *      (cap-aware, idempotent).
 * unfollowFamous removes the follows, those rules and the watchlist row.
 */
import { famousBySlug, MAX_ADDRESSES_PER_ENTITY } from '@/lib/onboarding/famousWallets'
import { addressVariants, canonicalAddress } from '@/lib/wallet/addressVariants'
import { unfollowWallets } from '@/lib/wallet/follows'
import { ruleChainFor } from '@/lib/orca/alerts/runCheckUserAlerts'
import { MAX_ACTIVE_RULES_PER_USER } from '@/lib/orca/alerts/types'

const FOLLOWABLE_CHAINS = new Set(['ethereum', 'solana', 'polygon', 'arbitrum', 'arbitrum_one', 'base', 'optimism', 'bsc'])
const ACTIVITY_LOOKBACK_MS = 90 * 24 * 3600 * 1000
const SCAN_CAP = 12

function normaliseChain(chain) {
  const c = String(chain || '').toLowerCase()
  return c === 'arbitrum_one' ? 'arbitrum' : c
}

async function recentlyActive(sb, address) {
  try {
    const since = new Date(Date.now() - ACTIVITY_LOOKBACK_MS).toISOString()
    const { data } = await sb
      .from('tracked_address_transfers')
      .select('amount_usd')
      .in('address', addressVariants(address))
      .gte('timestamp', since)
      .gt('amount_usd', 0)
      .limit(1)
    return Array.isArray(data) && data.length > 0
  } catch {
    return false
  }
}

async function inUniverse(sb, addresses) {
  try {
    const { data } = await sb
      .from('tracked_address_universe')
      .select('address')
      .in('address', Array.from(new Set(addresses.flatMap((a) => addressVariants(a)))))
    return new Set((data || []).map((r) => canonicalAddress(String(r.address))))
  } catch {
    return new Set()
  }
}

/** Pick ≤ MAX_ADDRESSES_PER_ENTITY addresses: active → tracked → declared order. */
async function chooseAddresses(sb, entity) {
  const declared = (Array.isArray(entity.addresses) ? entity.addresses : [])
    .filter((a) => a && typeof a.address === 'string' && a.address.trim())
    // Canonical form (lower-case EVM) so follows match the whale tape and the
    // feed/digest lookups; Solana base58 stays as declared.
    .map((a, i) => ({ address: canonicalAddress(a.address), chain: normaliseChain(a.chain), order: i }))
    .filter((a) => FOLLOWABLE_CHAINS.has(a.chain))
  // De-duplicate the same address declared on several chains (MrBeast ×3).
  const seen = new Set()
  const unique = declared.filter((a) => {
    const k = a.address
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  if (unique.length <= MAX_ADDRESSES_PER_ENTITY) return unique

  const scan = unique.slice(0, SCAN_CAP)
  const [universe, activity] = await Promise.all([
    inUniverse(sb, scan.map((a) => a.address)),
    Promise.all(scan.map((a) => recentlyActive(sb, a.address))),
  ])
  const scored = scan.map((a, i) => ({
    ...a,
    score: (activity[i] ? 2 : 0) + (universe.has(a.address) ? 1 : 0),
  }))
  scored.sort((x, y) => y.score - x.score || x.order - y.order)
  return scored.slice(0, MAX_ADDRESSES_PER_ENTITY)
}

// opts.minUsd: the user's own floor for the wallet's alerts (the preset
// editor); without it the wallet's default from famousWallets.js applies.
export async function followFamous(sb, userId, slug, opts = {}) {
  const user = { id: userId }
  const { data: entity, error } = await sb
    .from('curated_entities')
    .select('slug, display_name, category, addresses')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !entity) return { slug, ok: false, error: 'entity_not_found' }

  const picks = await chooseAddresses(sb, entity)
  if (picks.length === 0) return { slug, ok: false, error: 'no_addresses' }

  // 2a. wallet_follows (feeds Your whales + the daily digest). A wallet already
  //     followed in any spelling is not followed twice; new rows only are
  //     returned, so a re-follow does not count as a new follow.
  const { data: already } = await sb
    .from('wallet_follows')
    .select('address')
    .eq('user_id', user.id)
    .in('address', picks.flatMap((a) => addressVariants(a.address)))
  const followed = new Set((already || []).map((r) => canonicalAddress(String(r.address))))
  const followRows = picks
    .filter((a) => !followed.has(a.address))
    .map((a) => ({ user_id: user.id, address: a.address, nickname: entity.display_name }))
  const { data: newFollows, error: fErr } = followRows.length
    ? await sb
        .from('wallet_follows')
        .upsert(followRows, { onConflict: 'user_id,address', ignoreDuplicates: true })
        .select('address')
    : { data: [], error: null }
  if (fErr) return { slug, ok: false, error: fErr.message }

  // 2b. entity_watchlist (figures directory "Following" dot)
  try {
    await sb
      .from('entity_watchlist')
      .upsert({ user_id: user.id, entity_type: 'curated', entity_ref: slug }, { onConflict: 'user_id,entity_type,entity_ref' })
  } catch { /* cosmetic */ }

  // 3. wallet_activity rules (cap-aware, idempotent): every picked address for
  //    people, the single most active one for exchanges and market makers.
  //    Floors per wallet (famousWallets.minUsd); EVM rules carry no chain —
  //    the same address is the same owner everywhere and a declared 'base'
  //    or 'arbitrum' would filter out the ethereum moves the poller sees.
  const spec = famousBySlug(slug)
  // null = any valued move; a positive number = the user's floor.
  const floorOverride = opts.minUsd === null ? null : Number(opts.minUsd) > 0 ? Math.round(Number(opts.minUsd)) : undefined
  const alertPicks = picks.slice(0, Math.max(1, spec?.alertAddresses ?? 1))
  let alert = false
  let created = 0
  try {
    const { data: existing } = await sb
      .from('user_alerts')
      .select('id, address, kind, enabled')
      .eq('user_id', user.id)
      .limit(MAX_ACTIVE_RULES_PER_USER + 50)
    const rows = existing || []
    let active = rows.filter((r) => r.enabled).length
    for (const pick of alertPicks) {
      const existingRule = rows.find((r) => r.kind === 'wallet_activity' && canonicalAddress(String(r.address || '')) === pick.address)
      if (existingRule) {
        alert = true
        if (floorOverride !== undefined) {
          await sb.from('user_alerts').update({ threshold_usd: floorOverride, enabled: true, updated_at: new Date().toISOString() }).eq('id', existingRule.id).eq('user_id', user.id)
        }
        continue
      }
      if (active >= MAX_ACTIVE_RULES_PER_USER) break
      const { error: aErr } = await sb.from('user_alerts').insert({
        user_id: user.id,
        kind: 'wallet_activity',
        ticker: null,
        address: pick.address,
        chain: ruleChainFor(pick.address),
        threshold_pct: null,
        threshold_usd: floorOverride !== undefined ? floorOverride : (spec?.minUsd ?? null),
        enabled: true,
      })
      if (!aErr) { created += 1; active += 1; alert = true }
    }
  } catch { /* follows still stand */ }

  return {
    slug,
    ok: true,
    name: entity.display_name,
    addresses: picks.map((a) => a.address),
    alert,
    newFollows: Array.isArray(newFollows) ? newFollows.length : 0,
    rulesCreated: created,
  }
}

/** Undo followFamous: the entity's follows (by address or by its name), their wallet_activity rules and the watchlist row. */
export async function unfollowFamous(sb, userId, slug) {
  const spec = famousBySlug(slug)
  if (!spec) return { slug, ok: false, error: 'not_famous' }
  const { data: entity } = await sb
    .from('curated_entities')
    .select('display_name, addresses')
    .eq('slug', slug)
    .maybeSingle()
  const name = entity?.display_name || spec.name
  const declared = (Array.isArray(entity?.addresses) ? entity.addresses : []).map((a) => String(a?.address || '')).filter(Boolean)
  const { data: byName } = await sb
    .from('wallet_follows')
    .select('address')
    .eq('user_id', userId)
    .eq('nickname', name)
  const addresses = [...new Set([...declared, ...(byName || []).map((r) => String(r.address))])]
  if (addresses.length === 0) return { slug, ok: true, name, removed: 0, alertsRemoved: 0 }
  const res = await unfollowWallets(sb, userId, addresses, { removeAlerts: true })
  try {
    await sb.from('entity_watchlist').delete().eq('user_id', userId).eq('entity_type', 'curated').eq('entity_ref', slug)
  } catch { /* cosmetic */ }
  return { slug, ok: res.ok, name, removed: res.removed, alertsRemoved: res.alertsRemoved, error: res.error }
}
