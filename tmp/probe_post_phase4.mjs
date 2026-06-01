// Post-deploy verification with correct column names.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('missing env'); process.exit(1); }
const h = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

async function pg(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: h });
  if (!r.ok) return { _err: r.status, _body: await r.text() };
  return r.json();
}

const cache = await pg('derivatives_cache?select=token,funding_rate,smart_long,retail_long,taker_ratio,updated_at&order=updated_at.desc&limit=20');
console.log('=== derivatives_cache (top 20) ===');
if (Array.isArray(cache)) {
  let nonZero = 0;
  for (const r of cache) {
    const fund = Number(r.funding_rate || 0);
    if (fund !== 0) nonZero++;
    console.log(`  ${(r.token||'?').padEnd(6)} fund=${(fund*100).toFixed(4).padStart(8)}% retail_L=${(Number(r.retail_long||0)*100).toFixed(1).padStart(5)}% smart_L=${(Number(r.smart_long||0)*100).toFixed(1).padStart(5)}% taker=${(Number(r.taker_ratio||0)).toFixed(3)} @${r.updated_at}`);
  }
  console.log(`\nnon-zero funding: ${nonZero}/${cache.length}`);
} else {
  console.log(cache);
}

const sigs = await pg('token_signals?select=token_symbol,computed_at,snapshot_inputs&order=computed_at.desc&limit=30');
if (Array.isArray(sigs)) {
  let nonZeroFund = 0;
  for (const s of sigs) {
    const f = s.snapshot_inputs?.funding_rate;
    if (f && Number(f) !== 0) nonZeroFund++;
  }
  console.log(`\n=== token_signals (last 30): funding_rate non-zero in ${nonZeroFund}/${sigs.length} ===`);
  console.log('latest 5 BTC:', sigs.filter(s => s.token_symbol === 'BTC').slice(0, 5).map(s => ({ funding: s.snapshot_inputs?.funding_rate, ts: s.computed_at })));
}
