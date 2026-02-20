import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/signals
 * Returns the latest computed signal for each token (or a specific token).
 * 
 * Query params:
 *   - token: specific token symbol (e.g., ETH)
 *   - limit: max results (default 30)
 *   - history: if "true", return last 24h of signals for the token (for charts)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')?.toUpperCase()
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100)
    const history = searchParams.get('history') === 'true'

    if (token && history) {
      // Return signal history for a single token (last 24h)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabaseAdmin
        .from('token_signals')
        .select('token, signal, score, confidence, raw_score, price_at_signal, timeframe, tier1_score, tier2_score, tier3_score, tier4_score, top_factors, traps, computed_at')
        .eq('token', token)
        .gte('computed_at', since)
        .order('computed_at', { ascending: false })
        .limit(96) // ~24h at 15min intervals

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ token, signals: data || [] })
    }

    if (token) {
      // Return latest signal for a specific token
      const { data, error } = await supabaseAdmin
        .from('token_signals')
        .select('*')
        .eq('token', token)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data) return NextResponse.json({ error: 'No signal found' }, { status: 404 })
      return NextResponse.json({ signal: data })
    }

    // Return latest signal per token (most recent per token)
    // Get latest computed_at across all tokens
    const { data: latestSignals, error } = await supabaseAdmin
      .from('token_signals')
      .select('token, signal, score, confidence, raw_score, price_at_signal, market_cap, timeframe, traps, computed_at')
      .order('computed_at', { ascending: false })
      .limit(500)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Deduplicate: keep only the latest per token
    const seen = new Set()
    const deduped = []
    for (const row of latestSignals || []) {
      if (!seen.has(row.token)) {
        seen.add(row.token)
        deduped.push(row)
        if (deduped.length >= limit) break
      }
    }

    // Sort by absolute distance from 50 (strongest signals first)
    deduped.sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50))

    return NextResponse.json({
      signals: deduped,
      count: deduped.length,
    })
  } catch (err) {
    console.error('[Signals API] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
