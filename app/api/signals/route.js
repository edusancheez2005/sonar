import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// ─── Signal-quality kill switch ──────────────────────────────────────────
// As of 2026-04-20 the signal engine has 0/116 directional accuracy on BUY
// signals over the last 30 days (p ≈ 0). Until the root cause is found
// (Tier 1 sign inversion vs regime tag-along) we mute BUY signals at the
// API boundary so the UI cannot show inverse-predictive recommendations.
// SELL signals are also regime-biased but at least directionally correct
// in current data; they pass through with a downstream BETA disclaimer.
//
// Flip this to false once the IC audit + signal rebuild lands.
const HIDE_BULLISH_SIGNALS = true
const BULLISH = new Set(['BUY', 'STRONG BUY'])

// Display-layer mapping for the raw DB enum signal value.
// The DB CHECK constraint requires storage values of
// ('STRONG BUY','BUY','NEUTRAL','SELL','STRONG SELL'). UI surfaces must
// render the neutral inflow/outflow vocabulary instead, to avoid the
// FCA RAO Art. 53 / SEC IA Act §202(a)(11) / MiFID II Art. 4(1)(4)
// "investment recommendation" trigger. See LEGAL_AUDIT_2026-04-21.md.
const SIGNAL_DISPLAY_LABEL = {
  'STRONG BUY': 'STRONG INFLOW',
  'BUY': 'INFLOW',
  'NEUTRAL': 'NEUTRAL',
  'SELL': 'OUTFLOW',
  'STRONG SELL': 'STRONG OUTFLOW',
}

function neutralize(row) {
  if (!row) return row
  const muted = HIDE_BULLISH_SIGNALS && BULLISH.has(row.signal)
    ? { ...row, signal: 'NEUTRAL', score: 50, muted_reason: 'bullish_under_review' }
    : row
  return {
    ...muted,
    display_label: SIGNAL_DISPLAY_LABEL[muted.signal] || 'NEUTRAL',
  }
}

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
      return NextResponse.json({ token, signals: (data || []).map(neutralize) })
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
      return NextResponse.json({ signal: neutralize(data) })
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
        deduped.push(neutralize(row))
        if (deduped.length >= limit) break
      }
    }

    // Sort by absolute distance from 50 (strongest signals first)
    deduped.sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50))

    return NextResponse.json({
      signals: deduped,
      count: deduped.length,
      muted: HIDE_BULLISH_SIGNALS ? 'Bullish signals are temporarily muted while the model is recalibrated. See /api/signals/accuracy.' : null,
    })
  } catch (err) {
    console.error('[Signals API] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
