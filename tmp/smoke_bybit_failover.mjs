// Smoke-test the failover logic in pure JS (mirrors derivativesData.ts).
async function fetchWithTimeout(url, timeoutMs = 8000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function fetchFromBybit(token, price) {
  const symbol = `${token}USDT`;
  const [fundingRes, oiRes, lsRes] = await Promise.allSettled([
    fetchWithTimeout(`https://api.bybit.com/v5/market/funding/history?category=linear&symbol=${symbol}&limit=1`),
    fetchWithTimeout(`https://api.bybit.com/v5/market/open-interest?category=linear&symbol=${symbol}&intervalTime=1h&limit=1`),
    fetchWithTimeout(`https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=${symbol}&period=1h&limit=1`),
  ]);
  const fp = fundingRes.status === 'fulfilled' ? fundingRes.value : null;
  const fundingItem = fp?.result?.list?.[0];
  if (!fundingItem || fundingItem.fundingRate === undefined) return null;
  const fundingRate = parseFloat(fundingItem.fundingRate) || 0;

  const oiItem = oiRes.status === 'fulfilled' ? oiRes.value?.result?.list?.[0] : null;
  const openInterest = oiItem?.openInterest ? parseFloat(oiItem.openInterest) : 0;

  const lsItem = lsRes.status === 'fulfilled' ? lsRes.value?.result?.list?.[0] : null;
  const longRatio = lsItem?.buyRatio ? parseFloat(lsItem.buyRatio) : 0.5;
  const shortRatio = lsItem?.sellRatio ? parseFloat(lsItem.sellRatio) : 0.5;

  let fundingSignal = 0;
  if (Math.abs(fundingRate) > 0.0001) fundingSignal = -Math.tanh(fundingRate * 5000) * 80;
  let longShortSignal = 0;
  if (longRatio > 0.65) longShortSignal = -60;
  else if (longRatio > 0.60) longShortSignal = -30;
  else if (shortRatio > 0.65) longShortSignal = 60;
  else if (shortRatio > 0.60) longShortSignal = 30;
  const compositeSignal = Math.round((fundingSignal * 0.30 + longShortSignal * 0.25) / 0.55);

  return {
    source: 'bybit', available: true,
    fundingRate, openInterest, openInterestUsd: openInterest * (price || 0),
    longRatio, shortRatio, fundingSignal: Math.round(fundingSignal), longShortSignal, compositeSignal,
  };
}

const tokens = ['BTC', 'ETH', 'SOL', 'PEPE', 'XRP', 'AVAX', 'ARB'];
const prices = { BTC: 71600, ETH: 2700, SOL: 145, PEPE: 0.000009, XRP: 0.5, AVAX: 22, ARB: 0.4 };
for (const t of tokens) {
  const d = await fetchFromBybit(t, prices[t]);
  if (d) {
    console.log(`${t.padEnd(5)} src=${d.source} fund=${(d.fundingRate*100).toFixed(4)}% L=${(d.longRatio*100).toFixed(1)}% S=${(d.shortRatio*100).toFixed(1)}% OI=$${Math.round(d.openInterestUsd/1e6)}M composite=${d.compositeSignal}`);
  } else {
    console.log(`${t.padEnd(5)} FAILED`);
  }
}
