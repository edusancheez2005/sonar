/**
 * SONAR × BINANCE DATA DEMO
 * 
 * Run: node binance_demo.js
 * 
 * No API key. No auth. No Alchemy bill.
 * This pulls LIVE trade data from Binance for SOL/USDT.
 */

const WebSocket = require('ws');
const https = require('https');

// ── Config ──
const SYMBOL = 'solusdt';
const SYMBOL_UPPER = 'SOLUSDT';
const COLLECTION_TIME = 20000; // 20 seconds of WebSocket data
const LARGE_TRADE_THRESHOLD = 5000; // $5K+ = "large" for SOL

// ── Helper: fetch JSON from Binance REST ──
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ══════════════════════════════════════════════════════════════
// PART 1: REST API — What you can get with simple HTTP calls
// ══════════════════════════════════════════════════════════════

async function demoREST() {
  console.log('='.repeat(90));
  console.log('  PART 1: BINANCE REST API (no API key, no auth)');
  console.log('='.repeat(90));

  // 1. Current price
  console.log('\n-- 1. Current Price (/api/v3/ticker/price) --');
  const price = await fetchJSON(`https://api.binance.com/api/v3/ticker/price?symbol=${SYMBOL_UPPER}`);
  console.log(`   ${price.symbol}: $${parseFloat(price.price).toFixed(2)}`);

  // 2. 24hr ticker
  console.log('\n-- 2. 24hr Ticker (/api/v3/ticker/24hr) --');
  const ticker = await fetchJSON(`https://api.binance.com/api/v3/ticker/24hr?symbol=${SYMBOL_UPPER}`);
  console.log(`   Price change:    ${ticker.priceChangePercent}%`);
  console.log(`   High/Low:        $${parseFloat(ticker.highPrice).toFixed(2)} / $${parseFloat(ticker.lowPrice).toFixed(2)}`);
  console.log(`   Volume (SOL):    ${parseFloat(ticker.volume).toLocaleString()}`);
  console.log(`   Volume (USDT):   $${parseFloat(ticker.quoteVolume).toLocaleString()}`);
  console.log(`   Trade count:     ${parseInt(ticker.count).toLocaleString()} trades in 24h`);
  console.log(`   VWAP:            $${parseFloat(ticker.weightedAvgPrice).toFixed(2)}`);

  // 3. Recent trades with buy/sell direction
  console.log('\n-- 3. Recent Trades (/api/v3/trades) -- last 10 --');
  const trades = await fetchJSON(`https://api.binance.com/api/v3/trades?symbol=${SYMBOL_UPPER}&limit=10`);
  console.log(`   ${'TIME'.padEnd(14)} ${'SIDE'.padEnd(6)} ${'PRICE'.padEnd(12)} ${'QTY'.padEnd(12)} ${'USD VALUE'}`);
  console.log('   ' + '-'.repeat(60));
  
  let restBuyVol = 0, restSellVol = 0;
  trades.forEach(t => {
    const side = t.isBuyerMaker ? 'SELL' : 'BUY';
    const p = parseFloat(t.price);
    const q = parseFloat(t.qty);
    const usd = p * q;
    const time = new Date(t.time).toISOString().substr(11, 12);
    if (side === 'BUY') restBuyVol += usd; else restSellVol += usd;
    console.log(`   ${time.padEnd(14)} ${side.padEnd(6)} $${p.toFixed(2).padEnd(11)} ${q.toFixed(4).padEnd(11)} $${usd.toFixed(2)}`);
  });
  console.log(`\n   Buy/Sell ratio from 10 trades: ${(restBuyVol / restSellVol).toFixed(3)}`);
  console.log('   isBuyerMaker gives VERIFIED direction. No heuristics needed.');

  // 4. Klines with taker buy volume
  console.log('\n-- 4. Recent 4h Klines (/api/v3/klines) -- last 3 candles --');
  const klines = await fetchJSON(`https://api.binance.com/api/v3/klines?symbol=${SYMBOL_UPPER}&interval=4h&limit=3`);
  klines.forEach(k => {
    const openTime = new Date(k[0]).toISOString().substr(0, 16);
    const open = parseFloat(k[1]).toFixed(2);
    const high = parseFloat(k[2]).toFixed(2);
    const low = parseFloat(k[3]).toFixed(2);
    const close = parseFloat(k[4]).toFixed(2);
    const vol = parseFloat(k[5]).toFixed(1);
    const trades = k[8];
    const takerBuyVol = parseFloat(k[9]);
    const totalVol = parseFloat(k[5]);
    const buyPressure = totalVol > 0 ? (takerBuyVol / totalVol * 100).toFixed(1) : '0';
    
    console.log(`   ${openTime}  O:$${open} H:$${high} L:$${low} C:$${close}`);
    console.log(`                    Vol: ${vol} SOL | Trades: ${trades} | Buy pressure: ${buyPressure}%`);
  });
  console.log('   Buy pressure = taker_buy_vol / total_vol. >55% = aggressive buying.');

  // 5. Order book
  console.log('\n-- 5. Order Book Depth (/api/v3/depth) -- top 5 levels --');
  const depth = await fetchJSON(`https://api.binance.com/api/v3/depth?symbol=${SYMBOL_UPPER}&limit=5`);
  console.log('   BIDS (buyers)                    ASKS (sellers)');
  console.log('   ' + '-'.repeat(55));
  for (let i = 0; i < 5; i++) {
    const bid = depth.bids[i];
    const ask = depth.asks[i];
    const bidStr = `$${parseFloat(bid[0]).toFixed(2)} x ${parseFloat(bid[1]).toFixed(2)}`;
    const askStr = `$${parseFloat(ask[0]).toFixed(2)} x ${parseFloat(ask[1]).toFixed(2)}`;
    console.log(`   ${bidStr.padEnd(28)} ${askStr}`);
  }
  const bidTotal = depth.bids.reduce((s, b) => s + parseFloat(b[1]), 0);
  const askTotal = depth.asks.reduce((s, a) => s + parseFloat(a[1]), 0);
  const imbalance = bidTotal / (bidTotal + askTotal);
  console.log(`\n   Bid/Ask imbalance (top 5): ${(imbalance * 100).toFixed(1)}% bid`);
  console.log(`   >60% bid = buying pressure, <40% = selling pressure`);
}


// ══════════════════════════════════════════════════════════════
// PART 2: FUTURES REST API — The signals you're missing
// ══════════════════════════════════════════════════════════════

async function demoFutures() {
  console.log('\n\n' + '='.repeat(90));
  console.log('  PART 2: BINANCE FUTURES API (no API key, no auth)');
  console.log('='.repeat(90));

  // 1. Funding rate
  console.log('\n-- 1. Funding Rate (/fapi/v1/fundingRate) --');
  try {
    const funding = await fetchJSON(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${SYMBOL_UPPER}&limit=5`);
    funding.forEach(f => {
      const rate = (parseFloat(f.fundingRate) * 100).toFixed(4);
      const time = new Date(parseInt(f.fundingTime)).toISOString().substr(0, 16);
      const annualized = (parseFloat(f.fundingRate) * 3 * 365 * 100).toFixed(1);
      const indicator = parseFloat(f.fundingRate) > 0.0005 ? '!! OVERLEVERAGED LONG' :
                        parseFloat(f.fundingRate) < -0.0003 ? '!! SHORT SQUEEZE RISK' : '';
      console.log(`   ${time}  Rate: ${rate}%  (${annualized}% annualized) ${indicator}`);
    });
    console.log('   Positive = longs pay shorts (bullish crowd). Extreme positive = bearish signal.');
  } catch (e) {
    console.log(`   [Error: ${e.message}]`);
  }

  // 2. Open interest
  console.log('\n-- 2. Open Interest (/fapi/v1/openInterest) --');
  try {
    const oi = await fetchJSON(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${SYMBOL_UPPER}`);
    console.log(`   Open Interest: ${parseFloat(oi.openInterest).toLocaleString()} contracts`);
    console.log('   Rising OI + rising price = trend continuation');
    console.log('   Rising OI + flat price = incoming volatility');
  } catch (e) {
    console.log(`   [Error: ${e.message}]`);
  }

  // 3. Top trader long/short ratio
  console.log('\n-- 3. Top Trader Long/Short Ratio --');
  try {
    const topTrader = await fetchJSON(`https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${SYMBOL_UPPER}&period=4h&limit=5`);
    topTrader.forEach(t => {
      const time = new Date(parseInt(t.timestamp)).toISOString().substr(0, 16);
      const longPct = (parseFloat(t.longAccount) * 100).toFixed(1);
      const shortPct = (parseFloat(t.shortAccount) * 100).toFixed(1);
      console.log(`   ${time}  Long: ${longPct}%  Short: ${shortPct}%  Ratio: ${t.longShortRatio}`);
    });
    console.log('   Top 20% of Binance traders by margin balance.');
  } catch (e) {
    console.log(`   [Error: ${e.message}]`);
  }

  // 4. Global long/short ratio (all traders = retail)
  console.log('\n-- 4. Global Long/Short Ratio - ALL traders --');
  try {
    const global = await fetchJSON(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${SYMBOL_UPPER}&period=4h&limit=5`);
    global.forEach(t => {
      const time = new Date(parseInt(t.timestamp)).toISOString().substr(0, 16);
      const longPct = (parseFloat(t.longAccount) * 100).toFixed(1);
      console.log(`   ${time}  Retail long: ${longPct}%  Ratio: ${t.longShortRatio}`);
    });
    console.log('   When retail is >70% long = contrarian SELL signal');
  } catch (e) {
    console.log(`   [Error: ${e.message}]`);
  }

  // 5. Taker buy/sell volume
  console.log('\n-- 5. Taker Buy/Sell Volume --');
  try {
    const taker = await fetchJSON(`https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${SYMBOL_UPPER}&period=4h&limit=5`);
    taker.forEach(t => {
      const time = new Date(parseInt(t.timestamp)).toISOString().substr(0, 16);
      const buyVol = parseFloat(t.buyVol).toFixed(0);
      const sellVol = parseFloat(t.sellVol).toFixed(0);
      const ratio = parseFloat(t.buySellRatio).toFixed(3);
      const signal = parseFloat(t.buySellRatio) > 1.1 ? 'AGGRESSIVE BUYING' :
                     parseFloat(t.buySellRatio) < 0.9 ? 'AGGRESSIVE SELLING' : '';
      console.log(`   ${time}  Buy: ${buyVol}  Sell: ${sellVol}  Ratio: ${ratio}  ${signal}`);
    });
    console.log('   Direct measurement of who is aggressing. Ratio > 1 = buyers dominating.');
  } catch (e) {
    console.log(`   [Error: ${e.message}]`);
  }

  // 6. Mark price + premium
  console.log('\n-- 6. Mark Price & Funding Info --');
  try {
    const premium = await fetchJSON(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${SYMBOL_UPPER}`);
    const mark = parseFloat(premium.markPrice).toFixed(2);
    const index = parseFloat(premium.indexPrice).toFixed(2);
    const basis = ((parseFloat(premium.markPrice) - parseFloat(premium.indexPrice)) / parseFloat(premium.indexPrice) * 100).toFixed(4);
    const nextFunding = new Date(parseInt(premium.nextFundingTime)).toISOString().substr(11, 8);
    console.log(`   Mark Price:    $${mark}`);
    console.log(`   Index Price:   $${index} (cross-exchange average)`);
    console.log(`   Basis:         ${basis}%`);
    console.log(`   Last Funding:  ${(parseFloat(premium.lastFundingRate) * 100).toFixed(4)}%`);
    console.log(`   Next Funding:  ${nextFunding} UTC`);
  } catch (e) {
    console.log(`   [Error: ${e.message}]`);
  }
}


// ══════════════════════════════════════════════════════════════
// PART 3: WEBSOCKET — Live streaming trades
// ══════════════════════════════════════════════════════════════

function demoWebSocket() {
  return new Promise((resolve) => {
    console.log('\n\n' + '='.repeat(90));
    console.log('  PART 3: LIVE WEBSOCKET STREAM (free, no API key, runs 24/7)');
    console.log('='.repeat(90));
    console.log(`\n  Connecting to wss://stream.binance.com:9443/ws/${SYMBOL}@aggTrade ...`);

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${SYMBOL}@aggTrade`);
    const startTime = Date.now();
    let buyVol = 0, sellVol = 0, tradeCount = 0, largeTrades = [];

    ws.on('open', () => {
      console.log('  Connected. Collecting live trades for 20 seconds...\n');
      console.log(`  ${'TIME'.padEnd(14)} ${'SIDE'.padEnd(6)} ${'PRICE'.padEnd(12)} ${'QTY'.padEnd(12)} ${'USD VALUE'.padEnd(14)} ${'FLAG'}`);
      console.log('  ' + '-'.repeat(75));
    });

    ws.on('message', (data) => {
      const t = JSON.parse(data);
      const side = t.m ? 'SELL' : 'BUY';
      const price = parseFloat(t.p);
      const qty = parseFloat(t.q);
      const usd = price * qty;
      const time = new Date(t.T).toISOString().substr(11, 12);

      if (side === 'BUY') buyVol += usd; else sellVol += usd;
      tradeCount++;

      const isLarge = usd > LARGE_TRADE_THRESHOLD;
      if (isLarge) largeTrades.push({ side, usd, price, time });

      const flag = isLarge ? 'WHALE' : '';
      console.log(
        `  ${time.padEnd(14)} ${side.padEnd(6)} $${price.toFixed(2).padEnd(11)} ${qty.toFixed(4).padEnd(11)} $${usd.toFixed(2).padEnd(13)} ${flag}`
      );

      if (Date.now() - startTime > COLLECTION_TIME) ws.close();
    });

    ws.on('close', () => {
      const totalVol = buyVol + sellVol;
      const buyPressure = totalVol > 0 ? (buyVol / totalVol) : 0;

      console.log('\n  ' + '='.repeat(75));
      console.log(`\n  LIVE STREAM SUMMARY -- ${(COLLECTION_TIME/1000)}s window\n`);
      console.log(`     Trades captured:  ${tradeCount}`);
      console.log(`     Buy volume:       $${buyVol.toFixed(2)}`);
      console.log(`     Sell volume:      $${sellVol.toFixed(2)}`);
      console.log(`     Buy pressure:     ${(buyPressure * 100).toFixed(1)}%`);
      console.log(`     Buy/Sell ratio:   ${sellVol > 0 ? (buyVol/sellVol).toFixed(3) : 'N/A'}`);
      
      if (largeTrades.length > 0) {
        console.log(`\n     Large trades (>$${LARGE_TRADE_THRESHOLD}):`);
        largeTrades.forEach(lt => {
          console.log(`        ${lt.time} ${lt.side} $${lt.usd.toFixed(2)}`);
        });
      }

      console.log('\n  ' + '='.repeat(75));
      console.log('\n  KEY TAKEAWAYS FOR SONAR:');
      console.log('  ' + '-'.repeat(30));
      console.log('  1. Every field above is FREE. No API key. No Alchemy.');
      console.log('  2. isBuyerMaker gives VERIFIED buy/sell direction.');
      console.log('  3. Funding rate is the #1 contrarian indicator for crypto.');
      console.log('  4. Top trader ratio IS your whale signal from Binance.');
      console.log('  5. Taker buy/sell volume replaces binary volume confirmation.');
      console.log('  6. Keep Alchemy for: DEX swaps, wallet tracking, non-Binance tokens.');
      console.log('  7. Use Binance for: price data, CEX trade flow, derivatives signals.\n');

      resolve();
    });

    ws.on('error', (err) => {
      console.log(`  WebSocket error: ${err.message}`);
      resolve();
    });
  });
}


// ── Main ──
async function main() {
  console.log('\n' + '#'.repeat(90));
  console.log('  SONAR x BINANCE API -- LIVE DATA DEMO');
  console.log('  No API key. No authentication. No cost.');
  console.log('#'.repeat(90));

  try {
    await demoREST();
  } catch (e) {
    console.log(`\n  REST API error: ${e.message}\n`);
  }

  try {
    await demoFutures();
  } catch (e) {
    console.log(`\n  Futures API error: ${e.message}`);
  }

  try {
    await demoWebSocket();
  } catch (e) {
    console.log(`\n  WebSocket error: ${e.message}`);
  }
}

main().catch(console.error);
