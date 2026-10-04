/**
 * POST /api/onboarding/follow-famous
 * =============================================================================
 * One-tap follow for the first-run picker. Body: { slug } or { slugs: [...] }.
 * (Alert emails are a separate, explicit preference: the dialog sends the
 * checkbox state to /api/notifications/preferences when it closes.)
 *
 * For each famous entity it:
 *   1. resolves its addresses from curated_entities and keeps the best ≤3
 *      (recently active in tracked_address_transfers first, then those in the
 *      tracked universe, then declared order);
 *   2. upserts wallet_follows rows (what "Your whales" and the daily digest
 *      read) and the entity_watchlist row (what the figures directory reads);
 *   3. creates wallet_activity alert rules with a per-wallet floor (all picks
 *      for people, the busiest address for exchanges), so the bell fires when
 *      they move (respects the per-user rule cap);
 *   4. logs funnel events for new follows / new rules only.
 * Several slugs run in parallel.
 *
 * Auth: Supabase user JWT. Idempotent — re-following is a no-op.
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { isFamousSlug, famousBySlug, MAX_ADDRESSES_PER_ENTITY } from '@/lib/onboarding/famousWallets'
import { addressVariants, canonicalAddress } from '@/lib/wallet/addressVariants'
import { ruleChainFor } from '@/lib/orca/alerts/runCheckUserAlerts'
import { MAX_ACTIVE_RULES_PER_USER } from '@/lib/orca/alerts/types'
import { trackServer } from '@/lib/analytics/trackServer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'no-store' }
const FOLLOWABLE_CHAINS = new Set(['ethereum', 'solana', 'polygon', 'arbitrum', 'arbitrum_one', 'base', 'optimism', 'bsc'])
const ACTIVITY_LOOKBACK_MS = 90 * 24 * 3600 * 1000
const SCAN_CAP = 12

function normaliseChain(chain) {
  const c = String(chain || '').toLowerCase()
  return c === 'arbitrum_one' ? 'arbitrum' : c
}

async function recentlyActive(address) {
  try {
    const since = new Date(Date.now() - ACTIVITY_LOOKBACK_MS).toISOString()
    const { data } = await supabaseAdmin
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

async function inUniverse(addresses) {
  try {
    const { data } = await supabaseAdmin
      .from('tracked_address_universe')
      .select('address')
      .in('address', Array.from(new Set(addresses.flatMap((a) => addressVariants(a)))))
    return new Set((data || []).map((r) => canonicalAddress(String(r.address))))
  } catch {
    return new Set()
  }
}

/** Pick ≤ MAX_ADDRESSES_PER_ENTITY addresses: active → tracked → declared order. */
async function chooseAddresses(entity) {
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
    inUniverse(scan.map((a) => a.address)),
    Promise.all(scan.map((a) => recentlyActive(a.address))),
  ])
  const scored = scan.map((a, i) => ({
    ...a,
    score: (activity[i] ? 2 : 0) + (universe.has(a.address) ? 1 : 0),
  }))
  scored.sort((x, y) => y.score - x.score || x.order - y.order)
  return scored.slice(0, MAX_ADDRESSES_PER_ENTITY)
}

async function followOne(user, slug) {
  const { data: entity, error } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, display_name, category, addresses')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !entity) return { slug, ok: false, error: 'entity_not_found' }

  const picks = await chooseAddresses(entity)
  if (picks.length === 0) return { slug, ok: false, error: 'no_addresses' }

  // 2a. wallet_follows (feeds Your whales + the daily digest). New rows only
  //     are returned, so a re-follow does not count as a new follow.
  const followRows = picks.map((a) => ({ user_id: user.id, address: a.address, nickname: entity.display_name }))
  const { data: newFollows, error: fErr } = await supabaseAdmin
    .from('wallet_follows')
    .upsert(followRows, { onConflict: 'user_id,address', ignoreDuplicates: true })
    .select('address')
  if (fErr) return { slug, ok: false, error: fErr.message }

  // 2b. entity_watchlist (figures directory "Following" dot)
  try {
    await supabaseAdmin
      .from('entity_watchlist')
      .upsert({ user_id: user.id, entity_type: 'curated', entity_ref: slug }, { onConflict: 'user_id,entity_type,entity_ref' })
  } catch { /* cosmetic */ }

  // 3. wallet_activity rules (cap-aware, idempotent): every picked address for
  //    people, the single most active one for exchanges and market makers.
  //    Floors per wallet (famousWallets.minUsd); EVM rules carry no chain —
  //    the same address is the same owner everywhere and a declared 'base'
  //    or 'arbitrum' would filter out the ethereum moves the poller sees.
  const spec = famousBySlug(slug)
  const alertPicks = picks.slice(0, Math.max(1, spec?.alertAddresses ?? 1))
  let alert = false
  let created = 0
  try {
    const { data: existing } = await supabaseAdmin
      .from('user_alerts')
      .select('id, address, kind, enabled')
      .eq('user_id', user.id)
      .limit(MAX_ACTIVE_RULES_PER_USER + 50)
    const rows = existing || []
    let active = rows.filter((r) => r.enabled).length
    for (const pick of alertPicks) {
      const has = rows.some((r) => r.kind === 'wallet_activity' && canonicalAddress(String(r.address || '')) === pick.address)
      if (has) { alert = true; continue }
      if (active >= MAX_ACTIVE_RULES_PER_USER) break
      const { error: aErr } = await supabaseAdmin.from('user_alerts').insert({
        user_id: user.id,
        kind: 'wallet_activity',
        ticker: null,
        address: pick.address,
        chain: ruleChainFor(pick.address),
        threshold_pct: null,
        threshold_usd: spec?.minUsd ?? null,
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

export async function POST(req) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: NO_STORE })
  }
  const slugs = Array.isArray(body?.slugs) ? body.slugs : body?.slug ? [body.slug] : []
  const wanted = Array.from(new Set(slugs.filter(isFamousSlug)))
  if (wanted.length === 0) {
    return NextResponse.json({ error: 'slug must be one of the famous wallets' }, { status: 400, headers: NO_STORE })
  }

  // Entities are independent; "Follow all six" runs them side by side.
  const settled = await Promise.allSettled(wanted.map((slug) => followOne(user, slug)))
  const results = settled.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { slug: wanted[i], ok: false, error: 'internal_error' }
  )
  const ok = results.some((r) => r.ok)

  // Funnel: only real changes count — a re-follow or an existing rule is not
  // a new follow / alert. Awaited so the rows land before the function ends.
  const writes = []
  for (const r of results) {
    if (!r.ok) continue
    if (r.newFollows > 0) {
      writes.push(trackServer(supabaseAdmin, {
        userId: user.id,
        event: 'follow',
        props: { source: 'welcome', slug: r.slug, addresses: r.newFollows },
        path: '/dashboard',
      }))
    }
    if (r.rulesCreated > 0) {
      writes.push(trackServer(supabaseAdmin, {
        userId: user.id,
        event: 'alert_set',
        props: { source: 'welcome', kind: 'wallet_activity', slug: r.slug, rules: r.rulesCreated },
        path: '/dashboard',
      }))
    }
  }
  await Promise.allSettled(writes)

  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500, headers: NO_STORE })
}
