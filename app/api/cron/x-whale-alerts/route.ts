/**
 * CRON: X Whale Alerts — posts the biggest recent whale transfer to
 * @SonarTrackerio (X API v2, see lib/x/client.ts).
 *
 * Schedule: 5×/day (vercel.json), but actual posts are budget-capped:
 * the news bot may share this app's 17-posts/24h free-tier quota, so we
 * default to X_DAILY_POST_BUDGET=2 posts/day and skip quietly otherwise.
 *
 * Controls (query params):
 *   ?dry=1   compose and return the tweet without posting (no quota use)
 *   ?min=N   override X_ALERT_MIN_USD for this run
 *
 * State in app_cache:
 *   x_post_count:<UTC date>   {"count": n}          daily budget tracking
 *   x_whale_alerts_posted     {"hashes": [...]}     dedupe (last 200)
 *   x_quota_snapshot          last quota headers from POST /2/tweets
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { fetchArkhamLabels, formatArkhamDisplayName } from '@/lib/arkham/address-lookup'
import { postTweet } from '@/lib/x/client'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

// Known-junk vanity contract whose hourly WBTC "BUYs" are classifier noise
// (see ORCA audit issue #1); ORCA also excludes >$150M single transfers as
// unreliable, so we mirror both filters here.
const JUNK_ADDRESSES = new Set(['0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb'])
const MAX_SANE_USD = 150_000_000
const LOOKBACK_HOURS = 8
const BASE = 'https://www.sonartracker.io'

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${Math.round(n)}`
}

type WhaleTx = {
  transaction_hash: string
  timestamp: string
  blockchain: string | null
  token_symbol: string | null
  classification: string | null
  usd_value: number | null
  from_address: string | null
  to_address: string | null
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const dry = url.searchParams.get('dry') === '1'
    const minUsd = Number(url.searchParams.get('min')) || Number(process.env.X_ALERT_MIN_USD) || 5_000_000
    const budget = Number(process.env.X_DAILY_POST_BUDGET) || 2

    // 1. Daily budget check (UTC day).
    const today = new Date().toISOString().slice(0, 10)
    const countKey = `x_post_count:${today}`
    const { data: countRow } = await supabaseAdmin
      .from('app_cache').select('value').eq('key', countKey).maybeSingle()
    const postedToday = Number(countRow?.value?.count) || 0
    if (!dry && postedToday >= budget) {
      return NextResponse.json({ skipped: 'daily budget reached', postedToday, budget })
    }

    // 2. Already-posted hashes (dedupe).
    const { data: dedupeRow } = await supabaseAdmin
      .from('app_cache').select('value').eq('key', 'x_whale_alerts_posted').maybeSingle()
    const postedHashes: string[] = Array.isArray(dedupeRow?.value?.hashes) ? dedupeRow.value.hashes : []
    const postedSet = new Set(postedHashes)

    // 3. Find the biggest qualifying transfer in the lookback window.
    const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()
    const { data: txs, error: txErr } = await supabaseAdmin
      .from('all_whale_transactions')
      .select('transaction_hash, timestamp, blockchain, token_symbol, classification, usd_value, from_address, to_address')
      .gte('timestamp', since)
      .gte('usd_value', minUsd)
      .lte('usd_value', MAX_SANE_USD)
      .not('token_symbol', 'is', null)
      .order('usd_value', { ascending: false })
      .limit(50)
    if (txErr) {
      return NextResponse.json({ error: txErr.message }, { status: 500 })
    }

    const candidates = ((txs || []) as WhaleTx[]).filter(tx =>
      !postedSet.has(tx.transaction_hash) &&
      !JUNK_ADDRESSES.has((tx.from_address || '').toLowerCase()) &&
      !JUNK_ADDRESSES.has((tx.to_address || '').toLowerCase())
    ).slice(0, 10)
    if (candidates.length === 0) {
      return NextResponse.json({ skipped: 'no qualifying transfer in window', minUsd, window_hours: LOOKBACK_HOURS })
    }

    // 4. Label the endpoints (Arkham-derived address book; free-tier display).
    // Prefer the biggest transfer with at least one labeled side — "Binance →
    // unknown wallet" reads much better than two bare addresses.
    const labels = await fetchArkhamLabels(
      candidates.flatMap(tx => [tx.from_address, tx.to_address]).filter(Boolean) as string[]
    )
    const label = (addr: string | null) =>
      addr ? (labels.get(addr) || labels.get(addr.toLowerCase())) : undefined
    const pick =
      candidates.find(tx => label(tx.from_address) || label(tx.to_address)) ||
      candidates[0]
    const fromName = formatArkhamDisplayName(label(pick.from_address)) || 'unknown wallet'
    const toName = formatArkhamDisplayName(label(pick.to_address)) || 'unknown wallet'

    // 5. Compose the tweet.
    const sym = String(pick.token_symbol).toUpperCase()
    const usd = Number(pick.usd_value) || 0
    const emoji = usd >= 50_000_000 ? '🚨🐋' : '🐋'
    const chain = pick.blockchain ? ` on ${String(pick.blockchain).charAt(0).toUpperCase() + String(pick.blockchain).slice(1)}` : ''
    const link = `${BASE}/token/${encodeURIComponent(sym)}?utm_source=x&utm_medium=post&utm_campaign=whale_alerts`
    const text =
      `${emoji} ${fmtUsd(usd)} in $${sym} moved from ${fromName} to ${toName}${chain}\n\n` +
      `Live ${sym} whale flows → ${link}`

    if (dry) {
      return NextResponse.json({ dry: true, would_post: text, tx: pick.transaction_hash, postedToday, budget })
    }

    // 6. Post it.
    const result = await postTweet(text)

    // 7. Record state (best-effort).
    const nowIso = new Date().toISOString()
    if (result.ok) {
      await supabaseAdmin.from('app_cache').upsert({
        key: countKey,
        value: { count: postedToday + 1 },
        updated_at: nowIso,
      })
      await supabaseAdmin.from('app_cache').upsert({
        key: 'x_whale_alerts_posted',
        value: { hashes: [...postedHashes, pick.transaction_hash].slice(-200) },
        updated_at: nowIso,
      })
    }
    await supabaseAdmin.from('app_cache').upsert({
      key: 'x_quota_snapshot',
      value: { ...result.quota, at: nowIso, status: result.status },
      updated_at: nowIso,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error, status: result.status, quota: result.quota }, { status: 502 })
    }
    return NextResponse.json({
      posted: true,
      tweet_id: result.id,
      text,
      tx: pick.transaction_hash,
      postedToday: postedToday + 1,
      budget,
      quota: result.quota,
    })
  } catch (err: any) {
    console.error('[XWhaleAlerts] Error:', err)
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
