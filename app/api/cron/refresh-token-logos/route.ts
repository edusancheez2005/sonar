/**
 * Cron: refresh-token-logos (daily)
 * =============================================================================
 * Keeps app_cache `cg_logo:<SYMBOL>` / `cg_logo_id:<id>` rows fresh from
 * CoinGecko's /coins/markets (top 1000 by market cap, 4 pages). The
 * token-image route serves logos from these rows, so the dashboard never
 * calls CoinGecko per icon. The free tier can 429 from Vercel's egress IPs;
 * when that happens the previous rows simply stay (180-day TTL) and the
 * laptop seeder (scripts/logos/seed_token_logos.py) is the fallback. Set
 * COINGECKO_DEMO_API_KEY (free) or COINGECKO_API_KEY (paid) to make this
 * reliable from Vercel.
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { getCoinsMarkets } from '@/lib/coingecko/client'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const PAGES = 4
const PER_PAGE = 250

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()
  const seen = new Set<string>()
  const rows: Array<{ key: string; value: unknown; updated_at: string }> = []
  const pageErrors: string[] = []

  for (let page = 1; page <= PAGES; page++) {
    try {
      const coins = await getCoinsMarkets({ per_page: PER_PAGE, page, sparkline: false })
      for (const c of coins) {
        const sym = String(c?.symbol || '').toUpperCase()
        if (!sym || seen.has(sym) || !c?.image) continue
        seen.add(sym)
        const meta = { id: c.id, symbol: sym, name: c.name || sym, image_url: c.image }
        rows.push({ key: `cg_logo:${sym}`, value: meta, updated_at: now })
        rows.push({ key: `cg_logo_id:${String(c.id).toLowerCase()}`, value: meta, updated_at: now })
      }
    } catch (e: any) {
      pageErrors.push(`page ${page}: ${String(e?.message || e).slice(0, 120)}`)
      break // rate-limited: keep what we have, try again tomorrow
    }
  }

  let upserted = 0
  let dbError: string | null = null
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabaseAdmin
      .from('app_cache')
      .upsert(rows.slice(i, i + 200), { onConflict: 'key' })
    if (error) { dbError = error.message; break }
    upserted += Math.min(200, rows.length - i)
  }

  return NextResponse.json({
    ok: pageErrors.length === 0 && !dbError,
    symbols: seen.size,
    rows_upserted: upserted,
    page_errors: pageErrors,
    db_error: dbError,
    at: now,
  })
}
