/**
 * GET /api/signals/accuracy
 * 
 * Returns signal accuracy statistics:
 *   - Overall hit rate (% of correct predictions)
 *   - Per-window accuracy (1h, 6h, 24h)
 *   - Per-signal-type accuracy (BUY, STRONG_BUY, SELL, STRONG_SELL)
 *   - Per-token accuracy (top tokens by sample size)
 *   - Average price change for correct vs incorrect signals
 *   - Recent outcomes (last 50)
 * 
 * Query params:
 *   - token: Filter by specific token (optional)
 *   - days: Lookback period in days (default: 30)
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')?.toUpperCase()
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 90)

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Fetch all outcomes in the lookback period
    let query = supabaseAdmin
      .from('signal_outcomes')
      .select('*')
      .gte('signal_time', since)
      .not('correct', 'is', null)
      .order('eval_time', { ascending: false })

    if (token) query = query.eq('token', token)

    const { data: outcomes, error } = await query.limit(5000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!outcomes || outcomes.length === 0) {
      return NextResponse.json({
        message: 'No signal outcomes yet. Signals need time to be evaluated (1h, 6h, 24h windows).',
        overall: { total: 0, correct: 0, accuracy: 0 },
        by_window: {},
        by_signal_type: {},
        by_token: {},
        recent: [],
      })
    }

    // Overall accuracy
    const total = outcomes.length
    const correct = outcomes.filter(o => o.correct).length
    const accuracy = Math.round((correct / total) * 1000) / 10

    // Per-window accuracy
    const byWindow = {}
    for (const w of ['1h', '6h', '24h']) {
      const wOutcomes = outcomes.filter(o => o.eval_window === w)
      const wCorrect = wOutcomes.filter(o => o.correct).length
      byWindow[w] = {
        total: wOutcomes.length,
        correct: wCorrect,
        accuracy: wOutcomes.length > 0 ? Math.round((wCorrect / wOutcomes.length) * 1000) / 10 : 0,
        avg_price_change: wOutcomes.length > 0
          ? Math.round(wOutcomes.reduce((s, o) => s + o.price_change_pct, 0) / wOutcomes.length * 100) / 100
          : 0,
      }
    }

    // Per-signal-type accuracy
    const byType = {}
    for (const t of ['STRONG BUY', 'BUY', 'SELL', 'STRONG SELL']) {
      const tOutcomes = outcomes.filter(o => o.signal_type === t)
      const tCorrect = tOutcomes.filter(o => o.correct).length
      byType[t] = {
        total: tOutcomes.length,
        correct: tCorrect,
        accuracy: tOutcomes.length > 0 ? Math.round((tCorrect / tOutcomes.length) * 1000) / 10 : 0,
        avg_price_change: tOutcomes.length > 0
          ? Math.round(tOutcomes.reduce((s, o) => s + o.price_change_pct, 0) / tOutcomes.length * 100) / 100
          : 0,
      }
    }

    // Per-token accuracy (top 20 by sample size)
    const tokenMap = new Map()
    for (const o of outcomes) {
      if (!tokenMap.has(o.token)) tokenMap.set(o.token, { total: 0, correct: 0, sumChange: 0 })
      const t = tokenMap.get(o.token)
      t.total++
      if (o.correct) t.correct++
      t.sumChange += o.price_change_pct
    }
    const byToken = Object.fromEntries(
      [...tokenMap.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 20)
        .map(([tok, v]) => [tok, {
          total: v.total,
          correct: v.correct,
          accuracy: Math.round((v.correct / v.total) * 1000) / 10,
          avg_price_change: Math.round((v.sumChange / v.total) * 100) / 100,
        }])
    )

    // Correct vs incorrect average price change
    const correctOutcomes = outcomes.filter(o => o.correct)
    const incorrectOutcomes = outcomes.filter(o => !o.correct)
    const avgCorrectChange = correctOutcomes.length > 0
      ? Math.round(correctOutcomes.reduce((s, o) => s + Math.abs(o.price_change_pct), 0) / correctOutcomes.length * 100) / 100
      : 0
    const avgIncorrectChange = incorrectOutcomes.length > 0
      ? Math.round(incorrectOutcomes.reduce((s, o) => s + Math.abs(o.price_change_pct), 0) / incorrectOutcomes.length * 100) / 100
      : 0

    // Recent outcomes
    const recent = outcomes.slice(0, 50).map(o => ({
      token: o.token,
      signal: o.signal_type,
      score: o.signal_score,
      window: o.eval_window,
      price_at_signal: o.price_at_signal,
      price_at_eval: o.price_at_eval,
      change_pct: o.price_change_pct,
      correct: o.correct,
      signal_time: o.signal_time,
      eval_time: o.eval_time,
    }))

    return NextResponse.json({
      period_days: days,
      overall: { total, correct, accuracy },
      by_window: byWindow,
      by_signal_type: byType,
      by_token: byToken,
      performance: {
        avg_correct_move: avgCorrectChange,
        avg_incorrect_move: avgIncorrectChange,
        edge: Math.round((avgCorrectChange - avgIncorrectChange) * 100) / 100,
      },
      recent,
    }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' }
    })
  } catch (err) {
    console.error('Signal accuracy API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
