// Smoke OKX fallback for all 12 cron tokens — pure JS mirror of fetchFromOkx.
const OKX_BASE = 'https://www.okx.com';
async function fetchWithTimeout(url, timeoutMs = 8000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function fetchFromOkx(tokenSymbol, currentPriceUsd) {
  const instId = `${tokenSymbol}-USDT-SWAP`;
  const [fundingRes, oiRes, lsRes] = await Promise.allSettled([
    fetchWithTimeout(`${OKX_BASE}/api/v5/public/funding-rate?instId=${instId}`),
    fetchWithTimeout(`${OKX_BASE}/api/v5/public/open-interest?instType=SWAP&instId=${instId}`),
    fetchWithTimeout(`${OKX_BASE}/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=${tokenSymbol}&period=1H`),
  ]);
  const fp = fundingRes.status === 'fulfilled' ? fundingRes.value : null;
  const fItem = fp?.data?.[0];
  if (!fItem || fItem.fundingRate === undefined) return null;
  const fundingRate = parseFloat(fItem.fundingRate) || 0;

  const oItem = oiRes.status === 'fulfilled' ? oiRes.value?.data?.[0] : null;
  const oiUsd = oItem ? (parseFloat(oItem.oiUsd) || 0) : 0;

  let topLong = 0.5, topShort = 0.5;
  const lsArr = lsRes.status === 'fulfilled' ? lsRes.value?.data : null;
  if (Array.isArray(lsArr) && lsArr.length > 0 && Array.isArray(lsArr[0])) {
    const r = parseFloat(lsArr[0][1]);
    if (Number.isFinite(r) && r > 0) { topLong = r/(r+1); topShort = 1/(r+1); }
  }

  let fundingSignal = 0;
  if (Math.abs(fundingRate) > 0.0001) fundingSignal = -Math.tanh(fundingRate * 5000) * 80;

  let topSig = 0;
  if (topLong > 0.65) topSig = -40;
  else if (topLong > 0.60) topSig = -20;
  else if (topShort > 0.65) topSig = 40;
  else if (topShort > 0.60) topSig = 20;
  const composite = Math.round((fundingSignal * 0.30 + topSig * 0.20) / 0.50);
  return { source: 'okx', fundingRate, oiUsd, topLong, topShort, fundingSignal: Math.round(fundingSignal), topSig, composite };
}

const tokens = ['BTC','ETH','SOL','BNB','XRP','DOGE','ADA','AVAX','LINK','PEPE','SUI','ARB'];
let okCount = 0;
for (const t of tokens) {
  const d = await fetchFromOkx(t);
  if (d) {
    okCount++;
    console.log(`${t.padEnd(5)} fund=${(d.fundingRate*100).toFixed(4).padStart(8)}% topL=${(d.topLong*100).toFixed(1).padStart(5)}% oi=$${Math.round(d.oiUsd/1e6).toString().padStart(5)}M  composite=${d.composite}`);
  } else {
    console.log(`${t.padEnd(5)} FAILED`);
  }
}
console.log(`\ncoverage: ${okCount}/${tokens.length}`);
