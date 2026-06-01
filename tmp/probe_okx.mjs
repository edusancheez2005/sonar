// OKX top-trader + taker probes.
const endpoints = [
  { name: 'okx.topPositionRatio', url: 'https://www.okx.com/api/v5/rubik/stat/contracts/long-short-position-ratio?ccy=BTC&period=1H&limit=1' },
  { name: 'okx.topAccountRatio',  url: 'https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=BTC&period=1H&limit=1' },
  { name: 'okx.takerVolume',      url: 'https://www.okx.com/api/v5/rubik/stat/taker-volume-contract?ccy=BTC&period=1H&limit=1' },
  { name: 'okx.openInterestHist', url: 'https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-volume?ccy=BTC&period=1H&limit=1' },
  // Bybit alternate for taker if we want
  { name: 'bybit.recent.trades',  url: 'https://api.bybit.com/v5/market/recent-trade?category=linear&symbol=BTCUSDT&limit=1' },
];
(async () => {
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep.url, { signal: AbortSignal.timeout(8000) });
      const body = (await r.text()).slice(0, 400).replace(/\s+/g, ' ');
      console.log(`[${r.status}] ${ep.name}: ${body}`);
    } catch (e) {
      console.log(`[ERR] ${ep.name}: ${e.message}`);
    }
  }
})();
