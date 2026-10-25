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
import { isFamousSlug } from '@/lib/onboarding/famousWallets'
import { followFamous } from '@/lib/onboarding/followFamous'
import { trackServer } from '@/lib/analytics/trackServer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'no-store' }
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
  // Where the follow came from (the welcome dialog by default; the Personal
  // page's setup card sends 'personal_onboarding'), for the funnel props.
  const source = typeof body?.source === 'string' && /^[a-z_]{1,40}$/.test(body.source) ? body.source : 'welcome'
  const wanted = Array.from(new Set(slugs.filter(isFamousSlug)))
  if (wanted.length === 0) {
    return NextResponse.json({ error: 'slug must be one of the famous wallets' }, { status: 400, headers: NO_STORE })
  }

  // Entities are independent; "Follow all six" runs them side by side.
  // Optional floor from the alert preset editor (USD; null = any move).
  const minUsd = body?.min_usd === null ? null : Number(body?.min_usd) >= 1_000 ? Number(body.min_usd) : undefined
  const settled = await Promise.allSettled(wanted.map((slug) => followFamous(supabaseAdmin, user.id, slug, { minUsd })))
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
        props: { source, slug: r.slug, addresses: r.newFollows },
        path: '/dashboard',
      }))
    }
    if (r.rulesCreated > 0) {
      writes.push(trackServer(supabaseAdmin, {
        userId: user.id,
        event: 'alert_set',
        props: { source, kind: 'wallet_activity', slug: r.slug, rules: r.rulesCreated },
        path: '/dashboard',
      }))
    }
  }
  await Promise.allSettled(writes)

  return NextResponse.json({ ok, results }, { status: ok ? 200 : 500, headers: NO_STORE })
}
