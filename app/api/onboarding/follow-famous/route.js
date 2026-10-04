/**
 * POST /api/onboarding/follow-famous
 * =============================================================================
 * One-tap follow for the first-run picker. Body: { slug } or { slugs: [...] },
 * plus optional { email_alerts: true }.
 *
 * For each famous entity it:
 *   1. resolves its addresses from curated_entities and keeps the best ≤3
 *      (recently active in tracked_address_transfers first, then those in the
 *      tracked universe, then declared order);
 *   2. upserts wallet_follows rows (what "Your whales" and the daily digest
 *      read) and the entity_watchlist row (what the figures directory reads);
 *   3. creates ONE wallet_activity alert rule on the best address, so the
 *      bell/email fire when they move (respects the per-user rule cap);
 *   4. optionally switches email alerts on (explicit opt-in from the picker);
 *   5. logs funnel events: follow (+ alert_set when a rule exists).
 * Several slugs run in parallel; steps 4–5 run once per request.
 *
 * Auth: Supabase user JWT. Idempotent — re-following is a no-op.
 */
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/app/lib/walletAuth'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { isFamousSlug, MAX_ADDRESSES_PER_ENTITY } from '@/lib/onboarding/famousWallets'
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
      .in('address', Array.from(new Set([address, address.toLowerCase()])))
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
      .in('address', addresses)
    return new Set((data || []).map((r) => String(r.address)))
  } catch {
    return new Set()
  }
}

/** Pick ≤ MAX_ADDRESSES_PER_ENTITY addresses: active → tracked → declared order. */
async function chooseAddresses(entity) {
  const declared = (Array.isArray(entity.addresses) ? entity.addresses : [])
    .filter((a) => a && typeof a.address === 'string' && a.address.trim())
    .map((a, i) => ({ address: a.address.trim(), chain: normaliseChain(a.chain), order: i }))
    .filter((a) => FOLLOWABLE_CHAINS.has(a.chain))
  // De-duplicate the same address declared on several chains (MrBeast ×3).
  const seen = new Set()
  const unique = declared.filter((a) => {
    const k = a.address.toLowerCase()
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

  // 2a. wallet_follows (feeds Your whales + the daily digest)
  const followRows = picks.map((a) => ({ user_id: user.id, address: a.address, nickname: entity.display_name }))
  const { error: fErr } = await supabaseAdmin
    .from('wallet_follows')
    .upsert(followRows, { onConflict: 'user_id,address', ignoreDuplicates: false })
  if (fErr) return { slug, ok: false, error: fErr.message }

  // 2b. entity_watchlist (figures directory "Following" dot)
  try {
    await supabaseAdmin
      .from('entity_watchlist')
      .upsert({ user_id: user.id, entity_type: 'curated', entity_ref: slug }, { onConflict: 'user_id,entity_type,entity_ref' })
  } catch { /* cosmetic */ }

  // 3. One wallet_activity rule on the best address (cap-aware, idempotent)
  let alert = false
  try {
    const best = picks[0]
    const { data: existing } = await supabaseAdmin
      .from('user_alerts')
      .select('id, address, kind, enabled')
      .eq('user_id', user.id)
      .limit(MAX_ACTIVE_RULES_PER_USER + 50)
    const rows = existing || []
    const has = rows.some((r) => r.kind === 'wallet_activity' && String(r.address || '').toLowerCase() === best.address.toLowerCase())
    const active = rows.filter((r) => r.enabled).length
    if (!has && active < MAX_ACTIVE_RULES_PER_USER) {
      const { error: aErr } = await supabaseAdmin.from('user_alerts').insert({
        user_id: user.id,
        kind: 'wallet_activity',
        ticker: null,
        address: best.address,
        chain: best.chain || null,
        threshold_pct: null,
        threshold_usd: null,
        enabled: true,
      })
      alert = !aErr
    } else if (has) {
      alert = true
    }
  } catch { /* follows still stand */ }

  return { slug, ok: true, name: entity.display_name, addresses: picks.map((a) => a.address), alert }
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
  const wantEmail = body?.email_alerts === true

  // Entities are independent; "Follow all six" runs them side by side.
  const settled = await Promise.allSettled(wanted.map((slug) => followOne(user, slug)))
  const results = settled.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { slug: wanted[i], ok: false, error: 'internal_error' }
  )
  const ok = results.some((r) => r.ok)

  const writes = []
  // 4. Explicit email opt-in from the picker checkbox (never switches it off)
  if (ok && wantEmail) {
    writes.push(
      supabaseAdmin
        .from('user_profile')
        .upsert({ user_id: user.id, notifications_email: true }, { onConflict: 'user_id' })
    )
  }
  // 5. Funnel — awaited so the rows are written before the function returns
  for (const r of results) {
    if (!r.ok) continue
    writes.push(trackServer(supabaseAdmin, {
      userId: user.id,
      event: 'follow',
      props: { source: 'welcome', slug: r.slug, addresses: r.addresses.length },
      path: '/dashboard',
    }))
    if (r.alert) {
      writes.push(trackServer(supabaseAdmin, {
        userId: user.id,
        event: 'alert_set',
        props: { source: 'welcome', kind: 'wallet_activity', slug: r.slug },
        path: '/dashboard',
      }))
    }
  }
  await Promise.allSettled(writes)

  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500, headers: NO_STORE })
}
