import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60s for computation

// CoinGecko ID mappings (top coins)
const SYMBOL_TO_COINGECKO_ID = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'AVAX': 'avalanche-2',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'LTC': 'litecoin',
  'SHIB': 'shiba-inu',
  'WBTC': 'wrapped-bitcoin',
  'BCH': 'bitcoin-cash',
  'NEAR': 'near',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'FIL': 'filecoin',
  'IMX': 'immutable-x',
  'GRT': 'the-graph',
  'AAVE': 'aave',
  'MKR': 'maker',
  'SNX': 'synthetix-network-token',
  'CRV': 'curve-dao-token',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'LDO': 'lido-dao',
  'BLUR': 'blur',
  'PENDLE': 'pendle',
  'RNDR': 'render-token',
  'WLD': 'worldcoin-wld',
  'FET': 'fetch-ai',
  'OCEAN': 'ocean-protocol',
  'API3': 'api3',
  'BAND': 'band-protocol',
  'INJ': 'injective-protocol'
}

// Stablecoins to exclude
const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD', 'FRAX', 'LUSD']

export async function POST(req) {
  try {
    const body = await req.json()
    const {
      coins = null, // If null, auto-detect from whale data
      hours = 24,
      allocation_per_signal_gbp = 100,
      taker_fee_bps = 10,
      slippage_bps = 5,
      start_time_utc = null // If null, use 24 hours ago
    } = body

    const startTime = start_time_utc ? new Date(start_time_utc) : new Date(Date.now() - hours * 60 * 60 * 1000)
    const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000)
    
    console.log(`🔬 Backtest: ${startTime.toISOString()} → ${endTime.toISOString()}`)
    console.log(`⚙️ Config: £${allocation_per_signal_gbp} per signal, ${taker_fee_bps}bps fee, ${slippage_bps}bps slippage`)

    // Get GBPUSD rate (simplified: use latest)
    let gbpusd = 1.27 // Default fallback
    try {
      const fxRes = await fetch('https://api.exchangerate-api.com/v4/latest/GBP')
      if (fxRes.ok) {
        const fxData = await fxRes.json()
        gbpusd = fxData.rates.USD || 1.27
      }
    } catch (err) {
      console.warn('FX API failed, using default GBPUSD=1.27')
    }

    // Auto-detect coins from whale transactions if not provided
    let targetCoins = coins
    if (!targetCoins) {
      const { data: topCoins } = await supabaseAdmin
        .from('whale_transactions')
        .select('token_symbol')
        .gte('timestamp', startTime.toISOString())
        .lte('timestamp', endTime.toISOString())
        .not('token_symbol', 'is', null)
        .not('token_symbol', 'ilike', 'unknown%')
      
      const coinCounts = {}
      topCoins?.forEach(t => {
        const sym = t.token_symbol?.toUpperCase()
        if (sym && !STABLECOINS.includes(sym)) {
          coinCounts[sym] = (coinCounts[sym] || 0) + 1
        }
      })
      
      targetCoins = Object.entries(coinCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20) // Top 20 coins by whale activity
        .map(([sym]) => sym)
      
      console.log(`📊 Auto-detected ${targetCoins.length} coins:`, targetCoins)
      
      if (targetCoins.length === 0) {
        return NextResponse.json({
          error: 'No active coins found in time window',
          suggestion: 'Try a different time period or check if whale transactions exist',
          config: { startTime: startTime.toISOString(), endTime: endTime.toISOString() }
        }, { status: 400 })
      }
    }

    // Filter out stablecoins
    targetCoins = targetCoins.filter(c => !STABLECOINS.includes(c.toUpperCase()))

    // Calculate sentiment signals for each coin at each hour
    console.log(`🧠 Generating signals...`)
    const signalsByHour = await generateHourlySignals(targetCoins, startTime, endTime)
    
    // Count total signals
    let totalSignals = 0
    Object.values(signalsByHour).forEach(hours => {
      totalSignals += hours.filter(h => h.signal).length
    })
    console.log(`✅ Generated ${totalSignals} tradeable signals`)
    
    if (totalSignals === 0) {
      return NextResponse.json({
        error: 'No valid signals generated',
        suggestion: 'Try lowering thresholds or extending time window',
        diagnostics: {
          coins: targetCoins,
          signalsByHour
        }
      }, { status: 400 })
    }

    // Fetch hourly price data for each coin
    console.log(`💰 Fetching price data...`)
    const priceData = await fetchHourlyPrices(targetCoins, startTime, endTime, gbpusd)
    console.log(`✅ Fetched prices for ${Object.keys(priceData).length} coins`)

    // Run backtest
    const results = runBacktest({
      signalsByHour,
      priceData,
      targetCoins,
      hours,
      allocation_per_signal_gbp,
      taker_fee_bps,
      slippage_bps,
      gbpusd
    })

    // Generate report
    const report = generateReport(results, {
      start_time_utc: startTime.toISOString(),
      end_time_utc: endTime.toISOString(),
      hours,
      allocation_per_signal_gbp,
      taker_fee_bps,
      slippage_bps,
      gbpusd
    })

    return NextResponse.json(report)

  } catch (error) {
    console.error('Backtest error:', error)
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}

// Generate signals for each coin at each hour based on whale sentiment
async function generateHourlySignals(coins, startTime, endTime) {
  const signals = {}
  const hourMs = 60 * 60 * 1000
  
  for (let coin of coins) {
    signals[coin] = []
    
    for (let h = 0; h < 24; h++) {
      const hourStart = new Date(startTime.getTime() + h * hourMs)
      const hourEnd = new Date(hourStart.getTime() + hourMs)
      
      // Fetch whale transactions for this coin in this hour
      const { data: txs } = await supabaseAdmin
        .from('whale_transactions')
        .select('classification,usd_value')
        .eq('token_symbol', coin)
        .gte('timestamp', hourStart.toISOString())
        .lt('timestamp', hourEnd.toISOString())
      
      if (!txs || txs.length === 0) {
        signals[coin].push({
          hour: h,
          timestamp: hourStart.toISOString(),
          signal: null,
          reason: 'NO_DATA'
        })
        continue
      }
      
      // Calculate sentiment
      const buys = txs.filter(t => t.classification?.toUpperCase() === 'BUY')
      const sells = txs.filter(t => t.classification?.toUpperCase() === 'SELL')
      const buyVolume = buys.reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0)
      const sellVolume = sells.reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0)
      const netFlow = buyVolume - sellVolume
      const totalVolume = buyVolume + sellVolume
      
      const buyPct = totalVolume > 0 ? (buyVolume / totalVolume) * 100 : 50
      
      // Signal logic: RELAXED thresholds for testing
      // >55% buys = BULLISH, <45% sells = BEARISH
      let signal = null
      let reason = 'NEUTRAL'
      
      if (buyPct > 55 && netFlow > 10000) {
        signal = 'BULLISH'
        reason = `${buyPct.toFixed(1)}% buy pressure, $${(netFlow/1000).toFixed(1)}K inflow`
      } else if (buyPct < 45 && netFlow < -10000) {
        signal = 'BEARISH'
        reason = `${(100-buyPct).toFixed(1)}% sell pressure, $${(Math.abs(netFlow)/1000).toFixed(1)}K outflow`
      } else if (txs.length > 0) {
        reason = `Insufficient signal: ${buyPct.toFixed(1)}% buys, $${(netFlow/1000).toFixed(1)}K net`
      }
      
      console.log(`${coin} hour ${h}: ${signal || 'SKIP'} - ${reason}`)
      
      signals[coin].push({
        hour: h,
        timestamp: hourStart.toISOString(),
        signal,
        buyPct: buyPct.toFixed(1),
        netFlow: netFlow.toFixed(2),
        txCount: txs.length,
        reason
      })
    }
  }
  
  return signals
}

// Fetch hourly prices from CoinGecko
async function fetchHourlyPrices(coins, startTime, endTime, gbpusd) {
  const prices = {}
  const fromTs = Math.floor(startTime.getTime() / 1000)
  const toTs = Math.floor(endTime.getTime() / 1000)
  
  for (let coin of coins) {
    const cgId = SYMBOL_TO_COINGECKO_ID[coin]
    if (!cgId) {
      console.warn(`⚠️ No CoinGecko ID for ${coin}`)
      prices[coin] = []
      continue
    }
    
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart/range?vs_currency=usd&from=${fromTs}&to=${toTs}`,
        {
          headers: {
            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || ''
          }
        }
      )
      
      if (res.ok) {
        const data = await res.json()
        const hourlyPrices = []
        
        // CoinGecko returns prices at ~5min intervals, aggregate to hourly
        const pricesByHour = {}
        data.prices?.forEach(([ts, price]) => {
          const hourBucket = Math.floor(ts / (60 * 60 * 1000))
          if (!pricesByHour[hourBucket]) pricesByHour[hourBucket] = []
          pricesByHour[hourBucket].push(price / gbpusd) // Convert to GBP
        })
        
        // Take the last price of each hour as the "close"
        Object.keys(pricesByHour).sort().forEach(hourBucket => {
          const pricesInHour = pricesByHour[hourBucket]
          hourlyPrices.push({
            timestamp: new Date(Number(hourBucket) * 60 * 60 * 1000).toISOString(),
            close: pricesInHour[pricesInHour.length - 1]
          })
        })
        
        prices[coin] = hourlyPrices
        console.log(`  ${coin}: ${hourlyPrices.length} hourly prices`)
      } else {
        console.warn(`  ${coin}: Price fetch failed (${res.status})`)
        prices[coin] = []
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
      
    } catch (err) {
      console.error(`Price fetch failed for ${coin}:`, err)
      prices[coin] = []
    }
  }
  
  return prices
}

// Run the backtest simulation
function runBacktest({ signalsByHour, priceData, targetCoins, hours, allocation_per_signal_gbp, taker_fee_bps, slippage_bps, gbpusd }) {
  const results = {
    perCoin: {},
    allTrades: []
  }
  
  const totalCostBps = (taker_fee_bps + slippage_bps) * 2 // Entry + Exit
  
  for (let coin of targetCoins) {
    const coinSignals = signalsByHour[coin] || []
    const coinPrices = priceData[coin] || []
    const trades = []
    
    for (let h = 0; h < hours - 1; h++) { // -1 because we need h+1 for exit
      const signal = coinSignals[h]
      if (!signal || !signal.signal) continue // Skip NEUTRAL or NO_DATA
      
      // Find entry and exit prices
      const entryPrice = coinPrices.find(p => p.timestamp === signal.timestamp)?.close
      const exitSignal = coinSignals[h + 1]
      const exitPrice = coinPrices.find(p => p.timestamp === exitSignal?.timestamp)?.close
      
      if (!entryPrice || !exitPrice) {
        trades.push({
          ts_entry_utc: signal.timestamp,
          ts_exit_utc: exitSignal?.timestamp || null,
          signal: signal.signal,
          price_entry: null,
          price_exit: null,
          notional_gbp: allocation_per_signal_gbp,
          gross_pnl_gbp: 0,
          fees_slippage_gbp: 0,
          net_pnl_gbp: 0,
          return_pct: 0,
          skipped: true,
          reason: 'MISSING_PRICE_DATA'
        })
        continue
      }
      
      // Calculate PnL
      let grossPnl = 0
      if (signal.signal === 'BULLISH') {
        // Long: profit if price goes up
        grossPnl = allocation_per_signal_gbp * ((exitPrice / entryPrice) - 1)
      } else if (signal.signal === 'BEARISH') {
        // Short: profit if price goes down
        grossPnl = allocation_per_signal_gbp * (1 - (exitPrice / entryPrice))
      }
      
      const feesCost = allocation_per_signal_gbp * (totalCostBps / 10000)
      const netPnl = grossPnl - feesCost
      const returnPct = (netPnl / allocation_per_signal_gbp) * 100
      
      const trade = {
        ts_entry_utc: signal.timestamp,
        ts_exit_utc: exitSignal.timestamp,
        signal: signal.signal,
        price_entry: entryPrice,
        price_exit: exitPrice,
        notional_gbp: allocation_per_signal_gbp,
        gross_pnl_gbp: grossPnl,
        fees_slippage_gbp: feesCost,
        net_pnl_gbp: netPnl,
        return_pct: returnPct,
        skipped: false
      }
      
      trades.push(trade)
      results.allTrades.push({ coin, ...trade })
    }
    
    // Calculate per-coin summary
    const validTrades = trades.filter(t => !t.skipped)
    const profitableTrades = validTrades.filter(t => t.net_pnl_gbp > 0)
    const returns = validTrades.map(t => t.return_pct)
    const cumulativePnl = validTrades.reduce((sum, t) => sum + t.net_pnl_gbp, 0)
    const totalNotional = validTrades.length * allocation_per_signal_gbp
    
    // Max drawdown
    let equity = 0
    let peak = 0
    let maxDrawdown = 0
    validTrades.forEach(t => {
      equity += t.net_pnl_gbp
      if (equity > peak) peak = equity
      const drawdown = ((equity - peak) / totalNotional) * 100
      if (drawdown < maxDrawdown) maxDrawdown = drawdown
    })
    
    results.perCoin[coin] = {
      trades,
      summary: {
        trades_count: validTrades.length,
        hit_rate_pct: validTrades.length > 0 ? (profitableTrades.length / validTrades.length * 100).toFixed(2) : 0,
        avg_trade_return_pct: returns.length > 0 ? (returns.reduce((a, b) => a + b, 0) / returns.length).toFixed(2) : 0,
        median_trade_return_pct: returns.length > 0 ? median(returns).toFixed(2) : 0,
        cumulative_pnl_gbp: cumulativePnl.toFixed(2),
        cumulative_return_pct: totalNotional > 0 ? ((cumulativePnl / totalNotional) * 100).toFixed(2) : 0,
        max_drawdown_pct: maxDrawdown.toFixed(2)
      }
    }
  }
  
  return results
}

// Generate final report
function generateReport(results, config) {
  const allValidTrades = results.allTrades.filter(t => !t.skipped)
  const profitableTrades = allValidTrades.filter(t => t.net_pnl_gbp > 0)
  const returns = allValidTrades.map(t => t.return_pct)
  const cumulativePnl = allValidTrades.reduce((sum, t) => sum + t.net_pnl_gbp, 0)
  const totalNotional = allValidTrades.length * config.allocation_per_signal_gbp
  
  // Sharpe & Sortino
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
  const variance = returns.length > 0 ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length : 0
  const volatility = Math.sqrt(variance)
  const sharpe = volatility > 0 ? (avgReturn / volatility) : 0
  
  const negativeReturns = returns.filter(r => r < 0)
  const downsideDeviation = negativeReturns.length > 0 
    ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length)
    : 0
  const sortino = downsideDeviation > 0 ? (avgReturn / downsideDeviation) : 0
  
  // Max drawdown (aggregate)
  let equity = 0
  let peak = 0
  let maxDrawdown = 0
  allValidTrades.forEach(t => {
    equity += t.net_pnl_gbp
    if (equity > peak) peak = equity
    const dd = totalNotional > 0 ? ((equity - peak) / totalNotional) * 100 : 0
    if (dd < maxDrawdown) maxDrawdown = dd
  })
  
  // Bullish vs Bearish
  const bullishTrades = allValidTrades.filter(t => t.signal === 'BULLISH')
  const bearishTrades = allValidTrades.filter(t => t.signal === 'BEARISH')
  
  const bullishPnl = bullishTrades.reduce((sum, t) => sum + t.net_pnl_gbp, 0)
  const bearishPnl = bearishTrades.reduce((sum, t) => sum + t.net_pnl_gbp, 0)
  
  const bullishAvgReturn = bullishTrades.length > 0 
    ? (bullishTrades.reduce((sum, t) => sum + t.return_pct, 0) / bullishTrades.length).toFixed(2)
    : 0
  const bearishAvgReturn = bearishTrades.length > 0
    ? (bearishTrades.reduce((sum, t) => sum + t.return_pct, 0) / bearishTrades.length).toFixed(2)
    : 0
  
  // By hour of day
  const byHour = {}
  allValidTrades.forEach(t => {
    const hour = new Date(t.ts_entry_utc).getUTCHours()
    if (!byHour[hour]) byHour[hour] = { returns: [], count: 0 }
    byHour[hour].returns.push(t.return_pct)
    byHour[hour].count++
  })
  
  const byHourArray = Object.keys(byHour).map(hour => ({
    hour_utc: Number(hour),
    avg_return_pct: (byHour[hour].returns.reduce((a, b) => a + b, 0) / byHour[hour].count).toFixed(2),
    trades: byHour[hour].count
  })).sort((a, b) => a.hour_utc - b.hour_utc)
  
  // Top/worst trades
  const sortedTrades = [...allValidTrades].sort((a, b) => b.net_pnl_gbp - a.net_pnl_gbp)
  
  return {
    config,
    perCoin: results.perCoin,
    aggregate: {
      total_trades: allValidTrades.length,
      hit_rate_pct: allValidTrades.length > 0 ? (profitableTrades.length / allValidTrades.length * 100).toFixed(2) : 0,
      avg_return_pct: avgReturn.toFixed(2),
      cumulative_pnl_gbp: cumulativePnl.toFixed(2),
      sharpe_hourly: sharpe.toFixed(2),
      sortino_hourly: sortino.toFixed(2),
      volatility_hourly_pct: volatility.toFixed(2),
      max_drawdown_pct: maxDrawdown.toFixed(2),
      bullish_vs_bearish: {
        bullish: {
          trades: bullishTrades.length,
          avg_return_pct: bullishAvgReturn,
          cumulative_pnl_gbp: bullishPnl.toFixed(2)
        },
        bearish: {
          trades: bearishTrades.length,
          avg_return_pct: bearishAvgReturn,
          cumulative_pnl_gbp: bearishPnl.toFixed(2)
        }
      }
    },
    diagnostics: {
      by_hour_of_day: byHourArray,
      top_worst_trades: {
        top: sortedTrades.slice(0, 5).map(t => ({
          coin: t.coin,
          signal: t.signal,
          entry_time: t.ts_entry_utc,
          return_pct: t.return_pct.toFixed(2),
          pnl_gbp: t.net_pnl_gbp.toFixed(2)
        })),
        worst: sortedTrades.slice(-5).reverse().map(t => ({
          coin: t.coin,
          signal: t.signal,
          entry_time: t.ts_entry_utc,
          return_pct: t.return_pct.toFixed(2),
          pnl_gbp: t.net_pnl_gbp.toFixed(2)
        }))
      },
      data_issues: results.allTrades.filter(t => t.skipped).map(t => `${t.coin}: ${t.reason}`)
    },
    summary: generateHumanSummary(cumulativePnl, allValidTrades.length, profitableTrades.length, results.perCoin)
  }
}

function generateHumanSummary(totalPnl, totalTrades, profitableTrades, perCoin) {
  const hitRate = totalTrades > 0 ? (profitableTrades / totalTrades * 100).toFixed(1) : 0
  const bestCoin = Object.entries(perCoin)
    .filter(([_, data]) => data.summary.trades_count > 0)
    .sort((a, b) => Number(b[1].summary.cumulative_pnl_gbp) - Number(a[1].summary.cumulative_pnl_gbp))[0]
  const worstCoin = Object.entries(perCoin)
    .filter(([_, data]) => data.summary.trades_count > 0)
    .sort((a, b) => Number(a[1].summary.cumulative_pnl_gbp) - Number(b[1].summary.cumulative_pnl_gbp))[0]
  
  const verdict = totalPnl > 0 ? '✅ SIGNALS VALID' : totalPnl < -50 ? '❌ SIGNALS INVALID' : '⚠️ INCONCLUSIVE'
  
  return [
    `24-Hour Signal Backtest Complete`,
    `Total P&L: £${totalPnl.toFixed(2)} | Hit Rate: ${hitRate}% (${profitableTrades}/${totalTrades})`,
    `Best Coin: ${bestCoin?.[0] || 'N/A'} (£${bestCoin?.[1].summary.cumulative_pnl_gbp || '0'})`,
    `Worst Coin: ${worstCoin?.[0] || 'N/A'} (£${worstCoin?.[1].summary.cumulative_pnl_gbp || '0'})`,
    `Verdict: ${verdict}`,
    totalPnl > 0 
      ? `Signals show promise. Consider live paper trading.` 
      : totalPnl < -50
      ? `Signals underperform. Review sentiment algorithm.`
      : `Results mixed. Need more data or tuning.`
  ].join('\n')
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

