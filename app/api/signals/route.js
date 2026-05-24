import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// ─── Signal-quality kill switch ──────────────────────────────────────────
// Updated 2026-05-24 (Workstream A demote, PROMPT_SIGNAL_EXECUTION.md §2).
// Post-2026-05-11 frozen-cache fix, n=4,465 evaluated outcomes show every
// horizon×side cell is negative-net:
//   1h  BUY  n=145   win=42.1%  net=-0.24%
//   1h  SELL n=1,212 win=49.3%  net=-0.12%
//   6h  BUY  n=160   win=31.2%  net=-0.82%
//   6h  SELL n=1,311 win=46.8%  net=-0.37%
//   24h BUY  n=159   win= 5.0%  net=-3.80%   ← anti-selection
//   24h SELL n=1,344 win=50.5%  net=-10.65%  ← lost during SELL tailwind
// Both circuit breakers are tripped; engine correctly self-suppresses to
// NEUTRAL. The composite has no measured alpha and is exposed via this
// API only as non-actionable research context with `actionable: false`.
//
// Flip back to false only when Workstream C ensemble produces a
// promotion-eligible strategy that passes Gate C-9 (see prompt §4.4).
const HIDE_BULLISH_SIGNALS = true
const BULLISH = new Set(['BUY', 'STRONG BUY'])

// Display-layer mapping for the raw DB enum signal value.
// The DB CHECK constraint requires storage values of
// ('STRONG BUY','BUY','NEUTRAL','SELL','STRONG SELL'). UI surfaces must
// render the neutral inflow/outflow vocabulary instead, to avoid the
// FCA RAO Art. 53 / SEC IA Act §202(a)(11) / MiFID II Art. 4(1)(4)
// "investment recommendation" trigger. See LEGAL_AUDIT_2026-04-21.md.
// PROMPT_SIGNAL_EXECUTION.md §2.2 proposed BULLISH/BEARISH context wording,
// but that regresses the legal posture; we keep INFLOW/OUTFLOW and instead
// satisfy the Opus memo via the `actionable:false` field and the UI-side
// experimental badge + methodology tooltip (see components/ExperimentalBadge.jsx).
const SIGNAL_DISPLAY_LABEL = {
  'STRONG BUY': 'STRONG INFLOW',
  'BUY': 'INFLOW',
  'NEUTRAL': 'NEUTRAL',
  'SELL': 'OUTFLOW',
  'STRONG SELL': 'STRONG OUTFLOW',
}

const METHODOLOGY_COPY =
  "Sonar's composite aggregates whale flow, momentum, derivatives positioning, " +
  'and sentiment into a contextual score. It is a research tool, not investment ' +
  'advice. Historical accuracy has been mixed; use as input to your own analysis, ' +
  'not as a trade trigger.'

function neutralize(row) {
  if (!row) return row
  const muted = HIDE_BULLISH_SIGNALS && BULLISH.has(row.signal)
    ? { ...row, signal: 'NEUTRAL', score: 50, muted_reason: 'bullish_under_review' }
    : row
  return {
    ...muted,
    display_label: SIGNAL_DISPLAY_LABEL[muted.signal] || 'NEUTRAL',
    actionable: false,
    experimental: true,
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
    const tokensParam = searchParams.get('tokens')
    const tokensFilter = tokensParam
      ? new Set(tokensParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 50))
      : null
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
        if (tokensFilter && !tokensFilter.has(String(row.token).toUpperCase())) continue
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
      actionable: false,
      experimental: true,
      methodology: METHODOLOGY_COPY,
      muted: HIDE_BULLISH_SIGNALS
        ? 'Composite signals are non-actionable research context. Post-2026-05-11 measurement (n=4,465) shows both circuit breakers tripped; the engine has no measured alpha and is being replaced (see PROMPT_SIGNAL_EXECUTION.md, Workstream C). Raw outcomes published via /api/signals/accuracy.'
        : null,
    })
  } catch (err) {
    console.error('[Signals API] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
