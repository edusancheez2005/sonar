// Phase 4 diagnostic v2.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function q(path) {
  const r = await fetch(url + '/rest/v1/' + path, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
  return r.status === 200 ? JSON.parse(await r.text()) : { _err: r.status, _body: await r.text() };
}
(async () => {
  const recent = await q('token_signals?select=token,computed_at,snapshot_inputs&order=computed_at.desc&limit=50');
  let withFunding = 0, nonZeroFunding = 0;
  const sample = [];
  for (const r of recent) {
    const fr = r.snapshot_inputs?.funding_rate;
    if (fr !== null && fr !== undefined) {
      withFunding++;
      if (fr !== 0) nonZeroFunding++;
      if (sample.length < 5) sample.push({ token: r.token, funding_rate: fr });
    }
  }
  console.log(`last 50 token_signals: funding_rate populated in ${withFunding}/50; non-zero in ${nonZeroFunding}`);
  console.log('sample populated:', sample);

  // Inspect what BTC's snapshot really contains
  const btc = await q("token_signals?select=token,computed_at,snapshot_inputs&token=eq.BTC&order=computed_at.desc&limit=1");
  console.log('BTC latest snapshot keys:', Array.isArray(btc) && btc[0] ? Object.keys(btc[0].snapshot_inputs || {}) : 'no data');
  if (Array.isArray(btc) && btc[0]) console.log('BTC funding_rate:', btc[0].snapshot_inputs?.funding_rate);

  // derivatives_cache real values — let's see if any token has non-zero funding
  const cache = await q('derivatives_cache?select=token,funding_rate,smart_long,retail_long,taker_ratio,updated_at&order=updated_at.desc&limit=12');
  const nonZeroCache = (cache || []).filter(r => r.funding_rate !== 0 || r.smart_long !== 0.5 || r.taker_ratio !== 1);
  console.log(`derivatives_cache non-default rows: ${nonZeroCache.length}/${(cache || []).length}`);
})();
