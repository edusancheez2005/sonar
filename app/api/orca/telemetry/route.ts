/**
 * POST /api/orca/telemetry
 * Fire-and-forget logger for inline-tile events (chip_render, chip_open,
 * chart_open, news_explain, chart_fallback). Persists to orca_traces with
 * stage='inline_tile'. Auth optional. Always returns 204 on failure so the
 * client never surfaces an error.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

const ALLOWED_EVENTS = new Set(['chip_render', 'chip_open', 'chart_open', 'news_explain', 'chart_fallback'])
const ipBuckets = new Map() // ip -> { count, resetAt }
const RATE_LIMIT = 60
const WINDOW_MS = 60_000

function clientIp(req) {
  const h = req.headers
  return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown'
}

function rateLimited(ip) {
  const now = Date.now()
  const bucket = ipBuckets.get(ip)
  if (!bucket || bucket.resetAt < now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  bucket.count += 1
  return bucket.count > RATE_LIMIT
}

export async function POST(req) {
  try {
    const ip = clientIp(req)
    if (rateLimited(ip)) return new NextResponse(null, { status: 204 })
    const body = await req.json().catch(() => null)
    if (!body || !ALLOWED_EVENTS.has(body.event)) {
      return new NextResponse(null, { status: 204 })
    }
    try {
      await supabaseAdmin.from('orca_traces').insert({
        stage: 'inline_tile',
        payload: { event: body.event, meta: body.meta ?? {}, t: body.t ?? Date.now() },
      })
    } catch { /* swallow */ }
    return NextResponse.json({ ok: true })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
