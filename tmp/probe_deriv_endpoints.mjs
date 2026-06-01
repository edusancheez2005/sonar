// Try several candidate futures endpoints from local.
const endpoints = [
  // 1. Binance data-api mirror — known working for spot from Vercel
  { name: 'binance-mirror.fundingRate', url: 'https://data-api.binance.vision/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1' },
  { name: 'binance-mirror.openInterest', url: 'https://data-api.binance.vision/fapi/v1/openInterest?symbol=BTCUSDT' },
  { name: 'binance-mirror.globalLongShort', url: 'https://data-api.binance.vision/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=1' },
  { name: 'binance-mirror.topLongShort', url: 'https://data-api.binance.vision/futures/data/topLongShortPositionRatio?symbol=BTCUSDT&period=1h&limit=1' },
  { name: 'binance-mirror.takerLongShort', url: 'https://data-api.binance.vision/futures/data/takerlongshortRatio?symbol=BTCUSDT&period=1h&limit=1' },

  // 2. Bybit V5 — supports funding + OI + long/short
  { name: 'bybit.funding', url: 'https://api.bybit.com/v5/market/funding/history?category=linear&symbol=BTCUSDT&limit=1' },
  { name: 'bybit.openInterest', url: 'https://api.bybit.com/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=1' },
  { name: 'bybit.tickers', url: 'https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT' },
  { name: 'bybit.longShortRatio', url: 'https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=BTCUSDT&period=1h&limit=1' },

  // 3. OKX — funding + OI
  { name: 'okx.fundingRate', url: 'https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP' },
  { name: 'okx.openInterest', url: 'https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=BTC-USDT-SWAP' },

  // 4. CoinGlass aggregated (free tier, no key for some endpoints)
  { name: 'coinglass.fundingRate', url: 'https://open-api-v3.coinglass.com/api/futures/funding-rates-chart?symbol=BTCUSDT&type=U&interval=h8' },
];

(async () => {
  for (const ep of endpoints) {
    try {
      const t0 = Date.now();
      const r = await fetch(ep.url, { signal: AbortSignal.timeout(8000) });
      const ms = Date.now() - t0;
      const body = (await r.text()).slice(0, 200).replace(/\s+/g, ' ');
      console.log(`[${r.status} ${ms}ms] ${ep.name}: ${body}`);
    } catch (e) {
      console.log(`[ERR] ${ep.name}: ${e.message}`);
    }
  }
})();
