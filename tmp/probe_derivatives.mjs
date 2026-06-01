// Phase 4 diagnostic.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function q(path) {
  const r = await fetch(url + '/rest/v1/' + path, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
  return r.status === 200 ? JSON.parse(await r.text()) : { _err: r.status, _body: await r.text() };
}
(async () => {
  // 1. Is derivatives_cache being populated? (the 5-min cron, independent of compute-signals)
  const cache = await q('derivatives_cache?select=token,funding_rate,smart_long,updated_at&order=updated_at.desc&limit=20');
  console.log('=== derivatives_cache (top 20) ===');
  if (Array.isArray(cache)) {
    cache.forEach(r => console.log(`  ${r.token.padEnd(6)} updated_at=${r.updated_at} funding=${r.funding_rate}`));
    console.log('total cached tokens:', cache.length);
  } else {
    console.log(cache);
  }

  // 2. Any system_health rows mentioning deriv / binance?
  const health = await q("system_health?select=service,status,message,observed_at&service=in.(derivatives,binance,fapi)&order=observed_at.desc&limit=10");
  console.log('=== system_health (deriv/binance) ===');
  console.log(JSON.stringify(health, null, 2));

  // 3. token_signals snapshot_inputs: how many recent rows have funding_rate populated?
  const r2 = await fetch(url + '/rest/v1/token_signals?select=token,computed_at,snapshot_inputs&order=computed_at.desc&limit=20', { headers: { apikey: key, Authorization: 'Bearer ' + key, 'Prefer': 'count=exact' } });
  const recent = await r2.json();
  let withDeriv = 0;
  for (const r of recent) {
    const fr = r.snapshot_inputs?.derivatives?.funding_rate;
    if (fr !== null && fr !== undefined) withDeriv++;
  }
  console.log(`=== token_signals (last 20): rows with snapshot_inputs.derivatives.funding_rate populated: ${withDeriv}/${recent.length}`);
  if (recent[0]) console.log('sample snapshot_inputs.derivatives:', JSON.stringify(recent[0].snapshot_inputs?.derivatives, null, 2));
})();
