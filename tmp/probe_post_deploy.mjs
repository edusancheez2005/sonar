// Quick post-deploy probe.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function q(path) {
  const r = await fetch(url + '/rest/v1/' + path, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
  return r.status === 200 ? JSON.parse(await r.text()) : { _err: r.status, _body: await r.text() };
}
(async () => {
  const last = await q('token_signals?select=token,signal,original_signal,breaker_suppressed,raw_score,score,confidence,computed_at,traps&order=computed_at.desc&limit=60');
  console.log('last tick @', last[0]?.computed_at, '— rows:', last.length);
  const raw = { strongPos:0, pos:0, zero:0, neg:0, strongNeg:0 };
  for (const r of last) {
    const rs = Number(r.raw_score);
    if (rs >= 30) raw.strongPos++;
    else if (rs > 5) raw.pos++;
    else if (rs >= -5) raw.zero++;
    else if (rs > -30) raw.neg++;
    else raw.strongNeg++;
  }
  console.log('raw_score buckets (last tick):', raw);
  console.log('signal distribution:', last.reduce((a, r) => { a[r.signal] = (a[r.signal]||0)+1; return a; }, {}));

  const sup = await q('token_signals?select=token,signal,original_signal,breaker_suppressed,raw_score,score,computed_at&breaker_suppressed=is.true&order=computed_at.desc&limit=10');
  console.log('breaker_suppressed=true rows total visible:', Array.isArray(sup) ? sup.length : sup);
  if (Array.isArray(sup) && sup.length) console.log(JSON.stringify(sup.slice(0, 5), null, 2));

  const og = await q('token_signals?select=token,signal,original_signal,breaker_suppressed,raw_score,computed_at&original_signal=not.is.null&order=computed_at.desc&limit=10');
  console.log('original_signal NOT NULL rows visible:', Array.isArray(og) ? og.length : og);
  if (Array.isArray(og) && og.length) console.log(JSON.stringify(og.slice(0, 5), null, 2));
})();
