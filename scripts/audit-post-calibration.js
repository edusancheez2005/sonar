require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

;(async () => {
  // The calibration was first written at 13:00 UTC today. Anything generated
  // AFTER that timestamp uses the new calibration. Anything 1h+ old has been
  // evaluated by the eval cron.
  const calLive = '2026-04-26T13:00:00Z'

  let all = []
  let from = 0
  while (true) {
    const { data } = await sb
      .from('signal_outcomes')
      .select('signal_type,token,eval_window,correct,price_change_pct,price_at_signal,price_at_eval,signal_time')
      .gte('signal_time', calLive)
      .order('signal_time', { ascending: false })
      .range(from, from + 999)
    if (!data?.length) break
    all = all.concat(data)
    if (data.length < 1000) break
    from += 1000
  }

  console.log('Outcomes since calibration went live:', all.length)
  if (!all.length) {
    console.log('Too early — wait for eval cron (next :30 of the hour) to label more.')
    return
  }

  // Strip stale-price + un-evaluable rows
  const real = all.filter(r => r.correct !== null)
  console.log('Real (correct != null):', real.length)

  const agg = {}
  for (const o of real) {
    const k = o.signal_type + '|' + o.eval_window
    agg[k] = agg[k] || { n: 0, c: 0, sumC: 0 }
    agg[k].n++
    if (o.correct === true) agg[k].c++
    agg[k].sumC += Number(o.price_change_pct || 0)
  }
  console.log('\n=== POST-CALIBRATION accuracy ===')
  for (const k of Object.keys(agg).sort()) {
    const a = agg[k]
    console.log(' ', k.padEnd(20), 'n=' + String(a.n).padEnd(4),
      'acc=' + (a.c / a.n * 100).toFixed(1) + '%',
      'avg_chg=' + (a.sumC / a.n).toFixed(2) + '%')
  }

  // Per-token SELL accuracy (the inverted ones we expect to flip)
  console.log('\n=== Per-token SELL (1h, post-calibration) ===')
  const per = {}
  for (const o of real) {
    if (o.eval_window !== '1h' || o.signal_type !== 'SELL') continue
    per[o.token] = per[o.token] || { n: 0, c: 0, sumC: 0 }
    per[o.token].n++
    if (o.correct === true) per[o.token].c++
    per[o.token].sumC += Number(o.price_change_pct || 0)
  }
  for (const t of Object.keys(per).sort((a, b) => per[b].n - per[a].n)) {
    const a = per[t]
    console.log(' ', t.padEnd(8), 'n=' + String(a.n).padEnd(3),
      'acc=' + (a.c / a.n * 100).toFixed(1) + '%',
      'avg_chg=' + (a.sumC / a.n).toFixed(2) + '%')
  }
})()
