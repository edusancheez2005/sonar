require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

;(async () => {
  // 1. Calibration table summary
  const { data: cal, count } = await sb
    .from('token_signal_calibration')
    .select('token,eval_window,sign_multiplier,confidence_score,computed_at', { count: 'exact' })
  console.log('Calibration rows:', count)
  if (cal?.length) {
    const newest = cal.reduce((a, b) => (a.computed_at > b.computed_at ? a : b))
    console.log('Newest computed_at:', newest.computed_at)
  }

  // 2. Signals produced AFTER calibration was populated
  const calTime = '2026-04-26T00:00:00Z'
  const { data: sigs, count: nSigs } = await sb
    .from('token_signals')
    .select('id,token,signal,score,created_at', { count: 'exact' })
    .gte('created_at', calTime)
    .order('created_at', { ascending: false })
  console.log('\nSignals since', calTime, ':', nSigs)
  const dist = {}
  const byTok = {}
  for (const s of sigs || []) {
    dist[s.signal] = (dist[s.signal] || 0) + 1
    if (s.signal !== 'NEUTRAL') {
      byTok[s.token] = byTok[s.token] || { BUY: 0, SELL: 0 }
      if (s.signal.includes('BUY')) byTok[s.token].BUY++
      if (s.signal.includes('SELL')) byTok[s.token].SELL++
    }
  }
  console.log('Distribution:', dist)
  console.log('\nDirectional signals by token:')
  for (const t of Object.keys(byTok).sort()) {
    console.log(' ', t.padEnd(8), 'BUY=' + byTok[t].BUY, 'SELL=' + byTok[t].SELL)
  }

  // 3. Latest 10 signals
  console.log('\nLatest 10 signals:')
  for (const s of (sigs || []).slice(0, 10)) {
    console.log(' ', s.created_at, s.token.padEnd(8), s.signal.padEnd(8), 'score=' + s.score)
  }
})()
