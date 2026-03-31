import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/app/lib/rateLimit'

export const dynamic = 'force-dynamic'

interface AccuracyRow {
  confidence_tier: string
  total_signals: number
  correct_signals: number
  hit_rate: number
  chain?: string
  token_symbol?: string
  computed_at: string
}

export async function GET(req: Request) {
  const ip = getClientIp(req)
  const rl = rateLimit(`signals-accuracy:${ip}`, 30, 60000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  try {
    const { data, error } = await supabaseAdmin
      .from('signal_accuracy')
      .select('*')
      .order('computed_at', { ascending: false })
      .limit(500)

    if (error) {
      // Table might not exist yet (backtester hasn't run)
      if (error.code === '42P01') {
        return NextResponse.json({
          overall_hit_rate: null,
          total_signals_evaluated: 0,
          by_confidence: [],
          by_chain: [],
          by_token_top10: [],
          last_computed: null,
          status: 'computing',
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        overall_hit_rate: null,
        total_signals_evaluated: 0,
        by_confidence: [],
        by_chain: [],
        by_token_top10: [],
        last_computed: null,
        status: 'computing',
      })
    }

    const rows = data as AccuracyRow[]

    // Overall stats
    let totalSignals = 0
    let totalCorrect = 0

    for (const row of rows) {
      totalSignals += row.total_signals || 0
      totalCorrect += row.correct_signals || 0
    }

    const overallHitRate = totalSignals > 0 ? +(totalCorrect / totalSignals).toFixed(4) : null

    // Group by confidence tier
    const confMap = new Map<string, { total: number; correct: number }>()
    for (const row of rows) {
      const tier = row.confidence_tier || 'unknown'
      const existing = confMap.get(tier) || { total: 0, correct: 0 }
      existing.total += row.total_signals || 0
      existing.correct += row.correct_signals || 0
      confMap.set(tier, existing)
    }

    const byConfidence = Array.from(confMap.entries())
      .map(([tier, { total, correct }]) => ({
        tier,
        hit_rate: total > 0 ? +(correct / total).toFixed(4) : 0,
        count: total,
      }))
      .sort((a, b) => b.tier.localeCompare(a.tier))

    // Group by chain
    const chainMap = new Map<string, { total: number; correct: number }>()
    for (const row of rows) {
      if (!row.chain) continue
      const existing = chainMap.get(row.chain) || { total: 0, correct: 0 }
      existing.total += row.total_signals || 0
      existing.correct += row.correct_signals || 0
      chainMap.set(row.chain, existing)
    }

    const byChain = Array.from(chainMap.entries())
      .map(([chain, { total, correct }]) => ({
        chain,
        hit_rate: total > 0 ? +(correct / total).toFixed(4) : 0,
        count: total,
      }))
      .sort((a, b) => b.count - a.count)

    // Group by token (top 10)
    const tokenMap = new Map<string, { total: number; correct: number }>()
    for (const row of rows) {
      if (!row.token_symbol) continue
      const existing = tokenMap.get(row.token_symbol) || { total: 0, correct: 0 }
      existing.total += row.total_signals || 0
      existing.correct += row.correct_signals || 0
      tokenMap.set(row.token_symbol, existing)
    }

    const byTokenTop10 = Array.from(tokenMap.entries())
      .map(([token, { total, correct }]) => ({
        token,
        hit_rate: total > 0 ? +(correct / total).toFixed(4) : 0,
        count: total,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const lastComputed = rows[0]?.computed_at || null

    return NextResponse.json({
      overall_hit_rate: overallHitRate,
      total_signals_evaluated: totalSignals,
      by_confidence: byConfidence,
      by_chain: byChain,
      by_token_top10: byTokenTop10,
      last_computed: lastComputed,
      status: 'ready',
    }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' }
    })
  } catch (err) {
    console.error('Signal accuracy error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
