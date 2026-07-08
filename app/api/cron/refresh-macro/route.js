import { NextResponse } from 'next/server'
import { getMacroFactors } from '@/lib/social/macroFactors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Grok web-search generation regularly takes 30-90s.
export const maxDuration = 120

/**
 * Regenerates the macro-factors read and stores it in the shared app_cache
 * row, so user requests to /api/social/macro are always instant cache hits.
 * Scheduled every 6h in vercel.json (data freshness window is 12h).
 */
export async function GET(req) {
  const auth = req.headers.get('authorization') || ''
  const url = new URL(req.url)
  const qsSecret = url.searchParams.get('secret')
  const secret = process.env.CRON_SECRET
  if (!secret || (auth !== `Bearer ${secret}` && qsSecret !== secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await getMacroFactors({ forceRefresh: true })
    return NextResponse.json({
      ok: true,
      factors: result.factors.length,
      overall_sentiment: result.overall_sentiment,
      last_updated: result.last_updated,
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || 'failed' }, { status: 500 })
  }
}
