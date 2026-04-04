/**
 * CRON: Evaluate Signal Accuracy
 * Schedule: Every hour
 * 
 * Looks back at signals from 1h, 6h, and 24h ago.
 * Fetches current price from price_snapshots.
 * Compares price_at_signal vs current price to see if the signal was correct.
 * Stores results in signal_outcomes table.
 * 
 * A signal is "correct" if:
 *   - STRONG_BUY / BUY → price went UP
 *   - STRONG_SELL / SELL → price went DOWN
 *   - NEUTRAL → no evaluation (excluded)
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const EVAL_WINDOWS = [
  { label: '1h', ms: 1 * 60 * 60 * 1000 },
  { label: '6h', ms: 6 * 60 * 60 * 1000 },
  { label: '24h', ms: 24 * 60 * 60 * 1000 },
]

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get latest prices from price_snapshots
    const { data: priceRows } = await supabaseAdmin
      .from('price_snapshots')
      .select('ticker, price_usd')
      .order('timestamp', { ascending: false })
      .limit(500)

    const priceMap = new Map()
    for (const row of (priceRows || [])) {
      if (!priceMap.has(row.ticker)) priceMap.set(row.ticker, row.price_usd)
    }

    let evaluated = 0
    let skipped = 0
    const errors = []

    for (const window of EVAL_WINDOWS) {
      // Find signals that were created approximately `window.ms` ago
      // Look in a 30-min window around the target time
      const targetTime = new Date(Date.now() - window.ms)
      const windowStart = new Date(targetTime.getTime() - 15 * 60 * 1000)
      const windowEnd = new Date(targetTime.getTime() + 15 * 60 * 1000)

      const { data: signals, error: sigErr } = await supabaseAdmin
        .from('token_signals')
        .select('id, token, signal, score, confidence, price_at_signal, computed_at')
        .gte('computed_at', windowStart.toISOString())
        .lte('computed_at', windowEnd.toISOString())
        .not('signal', 'eq', 'NEUTRAL')
        .not('price_at_signal', 'is', null)

      if (sigErr) {
        errors.push(`${window.label}: ${sigErr.message}`)
        continue
      }

      if (!signals || signals.length === 0) continue

      for (const sig of signals) {
        const currentPrice = priceMap.get(sig.token)
        if (!currentPrice || !sig.price_at_signal) {
          skipped++
          continue
        }

        // Check if already evaluated for this window
        const { data: existing } = await supabaseAdmin
          .from('signal_outcomes')
          .select('id')
          .eq('signal_id', sig.id)
          .eq('eval_window', window.label)
          .maybeSingle()

        if (existing) {
          skipped++
          continue
        }

        const priceChange = ((currentPrice - sig.price_at_signal) / sig.price_at_signal) * 100
        const isBullish = sig.signal === 'STRONG_BUY' || sig.signal === 'BUY'
        const isBearish = sig.signal === 'STRONG_SELL' || sig.signal === 'SELL'

        let correct = null
        if (isBullish) correct = priceChange > 0
        else if (isBearish) correct = priceChange < 0

        const { error: insertErr } = await supabaseAdmin
          .from('signal_outcomes')
          .insert({
            signal_id: sig.id,
            token: sig.token,
            signal_type: sig.signal,
            signal_score: sig.score,
            signal_confidence: sig.confidence,
            price_at_signal: sig.price_at_signal,
            price_at_eval: currentPrice,
            price_change_pct: Math.round(priceChange * 100) / 100,
            correct,
            eval_window: window.label,
            signal_time: sig.computed_at,
            eval_time: new Date().toISOString(),
          })

        if (insertErr) {
          errors.push(`${sig.token}/${window.label}: ${insertErr.message}`)
        } else {
          evaluated++
        }
      }
    }

    return NextResponse.json({
      message: 'Signal accuracy evaluation complete',
      evaluated,
      skipped,
      errors_count: errors.length,
      errors: errors.slice(0, 10),
    })
  } catch (err) {
    console.error('Signal accuracy eval error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
