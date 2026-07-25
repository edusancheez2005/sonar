/**
 * /api/cron/arkham-label-harvest
 *
 * SCHEDULED 06:00 UTC on the 1st, 10th and 20th: spend the Arkham trial's
 * label-lookup allowance (10,000/period, resets the 1st) attributing our
 * unlabeled high-value addresses via POST /intelligence/address/batch
 * (≤1000 addresses/call). Hits land permanently in
 * tracked_address_universe; misses are negative-cached 90 days in
 * arkham_cache (`intel_miss:{addr}`) so no lookup is ever spent twice.
 *
 * Cron port of scripts/arkham-label-harvest.py (first run 2026-07-25:
 * 7,575 lookups → 4,774 labels, 63% hit rate). Per-run cap 4 batches so
 * the three monthly runs share the allowance and later runs catch newly
 * active whales; the live /subscription/intel-usage meter (free, ~1 min
 * lag) is the hard guard underneath.
 *
 * Gotcha: Arkham keys batch responses by EIP-55 CHECKSUMMED address
 * regardless of the casing sent — always match case-insensitively.
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { ARKHAM_ENABLED, ARKHAM_LABEL_LOOKUP_GUARD } from '@/lib/arkham/license'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BASE = (process.env.ARKHAM_BASE_URL || 'https://api.arkm.com').replace(/\/+$/, '')
const BATCH = 1000
const MAX_BATCHES_PER_RUN = 4
const EVM_RE = /^0x[0-9a-fA-F]{40}$/
const SKIP = new Set([
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
])

async function intelUsage(apiKey) {
  const res = await fetch(`${BASE}/subscription/intel-usage`, {
    headers: { 'API-Key': apiKey }, cache: 'no-store',
  })
  if (!res.ok) throw new Error(`intel-usage ${res.status}`)
  const j = await res.json()
  return Number(j.totalCount) || 0
}

async function collectCandidates() {
  const now = Date.now()
  const iso = (ms) => new Date(ms).toISOString()
  const cand = new Map() // lower -> original

  const add = (addr) => {
    if (!addr || !EVM_RE.test(addr)) return
    const lo = addr.toLowerCase()
    if (!SKIP.has(lo) && !cand.has(lo)) cand.set(lo, addr)
  }

  // Whale feed: biggest players of the last 30 days.
  for (let page = 0; page < 15; page++) {
    const { data } = await supabaseAdmin
      .from('all_whale_transactions')
      .select('whale_address')
      .gte('timestamp', iso(now - 30 * 86400_000))
      .gte('usd_value', 10_000)
      .order('usd_value', { ascending: false })
      .range(page * 1000, page * 1000 + 999)
    if (!Array.isArray(data) || data.length === 0) break
    for (const r of data) add(r.whale_address)
  }

  // Transfer-feed counterparties: 2-hour slices over the last 48h keep
  // each scan inside the statement timeout (amount_usd has no index).
  for (let h = 0; h < 48; h += 2) {
    const { data } = await supabaseAdmin
      .from('tracked_address_transfers')
      .select('counterparty')
      .gte('timestamp', iso(now - (h + 2) * 3600_000))
      .lt('timestamp', iso(now - h * 3600_000))
      .gte('amount_usd', 10_000)
      .order('timestamp', { ascending: false })
      .limit(1000)
    if (Array.isArray(data)) for (const r of data) add(r.counterparty)
  }

  // Exclusions: already-attributed + negative-cached misses.
  const known = new Set()
  for (let page = 0; page < 20; page++) {
    const { data } = await supabaseAdmin
      .from('tracked_address_universe')
      .select('address')
      .range(page * 1000, page * 1000 + 999)
    if (!Array.isArray(data) || data.length === 0) break
    for (const r of data) known.add(r.address.toLowerCase())
  }
  for (let page = 0; page < 40; page++) {
    const { data } = await supabaseAdmin
      .from('arkham_cache')
      .select('key')
      .like('key', 'intel_miss:%')
      .range(page * 1000, page * 1000 + 999)
    if (!Array.isArray(data) || data.length === 0) break
    for (const r of data) known.add(r.key.slice('intel_miss:'.length))
  }

  return [...cand.entries()].filter(([lo]) => !known.has(lo)).map(([, orig]) => orig)
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  if (!ARKHAM_ENABLED) {
    return NextResponse.json({ ok: true, note: 'ARKHAM_ENABLED=false — skipped' })
  }
  const apiKey = process.env.ARKHAM_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'no ARKHAM_API_KEY' }, { status: 500 })

  const t0 = Date.now()
  let usage
  try {
    usage = await intelUsage(apiKey)
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 502 })
  }
  if (usage >= ARKHAM_LABEL_LOOKUP_GUARD) {
    return NextResponse.json({ ok: true, note: `label guard: ${usage}/${ARKHAM_LABEL_LOOKUP_GUARD}` })
  }

  const todo = await collectCandidates()
  let sent = 0
  let hits = 0
  const nowIso = new Date().toISOString()

  for (let i = 0; i < MAX_BATCHES_PER_RUN; i++) {
    let chunk = todo.slice(i * BATCH, (i + 1) * BATCH)
    if (chunk.length === 0) break
    const headroom = ARKHAM_LABEL_LOOKUP_GUARD - usage - sent
    if (headroom <= 0) break
    if (chunk.length > headroom) chunk = chunk.slice(0, headroom)
    if (Date.now() - t0 > 240_000) break

    const started = Date.now()
    const res = await fetch(`${BASE}/intelligence/address/batch`, {
      method: 'POST',
      headers: { 'API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses: chunk }),
      cache: 'no-store',
    })
    const ms = Date.now() - started
    if (!res.ok) {
      await supabaseAdmin.from('arkham_call_log').insert({
        endpoint: '/intelligence/address/batch', method: 'POST', cost: 0,
        status: res.status, ms, cache_hit: false, source: 'cron',
        reason: `label harvest batch failed n=${chunk.length}`,
      })
      break
    }
    const j = await res.json()
    // Response keys are checksummed regardless of input casing.
    const got = new Map(
      Object.entries(j?.addresses ?? {}).map(([k, v]) => [k.toLowerCase(), v])
    )
    sent += chunk.length

    const uni = []
    const misses = []
    for (const addr of chunk) {
      const info = got.get(addr.toLowerCase()) || {}
      const ent = info.arkhamEntity
      const lab = info.arkhamLabel
      if (ent || lab) {
        uni.push({
          chain: info.chain || 'ethereum',
          address: info.address || addr,
          arkham_entity_id: ent?.id ?? null,
          arkham_entity_name: ent?.name ?? null,
          arkham_entity_type: ent?.type ?? null,
          arkham_label: lab?.name ?? null,
          arkham_is_contract: !!info.contract,
          source: 'cron_harvest',
          arkham_raw: info,
        })
      } else {
        misses.push({
          key: `intel_miss:${addr.toLowerCase()}`,
          value: { checked: nowIso },
          ttl_seconds: 90 * 86400,
          written_at: nowIso,
        })
      }
    }
    for (let jx = 0; jx < uni.length; jx += 300) {
      await supabaseAdmin.from('tracked_address_universe')
        .upsert(uni.slice(jx, jx + 300), { onConflict: 'chain,address' })
    }
    for (let jx = 0; jx < misses.length; jx += 300) {
      await supabaseAdmin.from('arkham_cache')
        .upsert(misses.slice(jx, jx + 300), { onConflict: 'key' })
    }
    await supabaseAdmin.from('arkham_call_log').insert({
      endpoint: '/intelligence/address/batch', method: 'POST', cost: 0,
      status: 200, ms, cache_hit: false, source: 'cron',
      reason: `label harvest n=${chunk.length} hits=${uni.length}`,
    })
    hits += uni.length
    await new Promise((r) => setTimeout(r, 1500))
  }

  return NextResponse.json({
    ok: true,
    usage_at_start: usage,
    candidates: todo.length,
    lookups_spent: sent,
    labeled: hits,
    elapsed_ms: Date.now() - t0,
  })
}
