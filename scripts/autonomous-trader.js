#!/usr/bin/env node

/**
 * 🤖 AUTONOMOUS TRADING BOT
 * 
 * This script acts as an independent trader with £2,400 capital.
 * It makes its own decisions based on whale data, news, and price action.
 * Runs for 24 hours, checking every hour and updating positions.
 */

const fetch = require('node-fetch')
require('dotenv').config({ path: '.env.local' })

// Configuration
const CONFIG = {
  INITIAL_CAPITAL_GBP: 2400,
  MAX_POSITION_SIZE_GBP: 200,
  MAX_POSITIONS: 12,
  CHECK_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
  DURATION_HOURS: 24,
  STOP_LOSS_PCT: -8, // Exit if down 8%
  TAKE_PROFIT_PCT: 12, // Exit if up 12%
  MIN_CONVICTION_SCORE: 6, // Out of 10
  TAKER_FEE_BPS: 10,
  SLIPPAGE_BPS: 5,
  GBPUSD: 1.27,
  
  // API Keys from env
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE,
  COINGECKO_KEY: process.env.COINGECKO_API_KEY,
  CRYPTOPANIC_KEY: process.env.CRYPTOPANIC_API_KEY
}

// Symbol to CoinGecko ID mapping
const SYMBOL_TO_ID = {
  'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin', 'SOL': 'solana',
  'XRP': 'ripple', 'ADA': 'cardano', 'DOGE': 'dogecoin', 'MATIC': 'matic-network',
  'LINK': 'chainlink', 'UNI': 'uniswap', 'ATOM': 'cosmos', 'LTC': 'litecoin',
  'WBTC': 'wrapped-bitcoin', 'NEAR': 'near', 'APT': 'aptos', 'ARB': 'arbitrum',
  'OP': 'optimism', 'FIL': 'filecoin', 'IMX': 'immutable-x', 'GRT': 'the-graph',
  'AAVE': 'aave', 'MKR': 'maker', 'SNX': 'synthetix-network-token', 'CRV': 'curve-dao-token',
  'LDO': 'lido-dao', 'BLUR': 'blur', 'PENDLE': 'pendle', 'RNDR': 'render-token',
  'FET': 'fetch-ai', 'OCEAN': 'ocean-protocol', 'API3': 'api3', 'BAND': 'band-protocol',
  'INJ': 'injective-protocol', 'SAND': 'the-sandbox', 'MANA': 'decentraland',
  'AXS': 'axie-infinity', 'AVAX': 'avalanche-2', 'DOT': 'polkadot'
}

const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD']

// Bot state
let portfolio = {
  cash_gbp: CONFIG.INITIAL_CAPITAL_GBP,
  positions: [], // { symbol, side: 'LONG'|'SHORT', entry_price, size_gbp, entry_time, conviction }
  closed_trades: [],
  total_pnl: 0,
  iteration: 0
}

// Logs
const logs = []
function log(msg) {
  const timestamp = new Date().toISOString()
  const entry = `[${timestamp}] ${msg}`
  console.log(entry)
  logs.push(entry)
}

// Main bot loop
async function main() {
  log('🤖 AUTONOMOUS TRADER STARTING')
  log(`💰 Initial Capital: £${CONFIG.INITIAL_CAPITAL_GBP}`)
  log(`⏰ Duration: ${CONFIG.DURATION_HOURS} hours`)
  log(`🔄 Check Interval: ${CONFIG.CHECK_INTERVAL_MS / 1000 / 60} minutes`)
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const startTime = Date.now()
  const endTime = startTime + (CONFIG.DURATION_HOURS * 60 * 60 * 1000)
  
  while (Date.now() < endTime) {
    portfolio.iteration++
    const hoursElapsed = ((Date.now() - startTime) / (60 * 60 * 1000)).toFixed(1)
    
    log(`\n🕐 HOUR ${portfolio.iteration} (${hoursElapsed}h elapsed)`)
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    try {
      // Step 1: Update existing positions
      await updatePositions()
      
      // Step 2: Get market data
      const opportunities = await analyzeMarket()
      
      // Step 3: Make trading decisions
      await makeTradeDecisions(opportunities)
      
      // Step 4: Show portfolio status
      showPortfolioStatus()
      
    } catch (error) {
      log(`❌ ERROR: ${error.message}`)
      console.error(error)
    }
    
    // Wait for next iteration
    if (Date.now() < endTime) {
      const waitMinutes = CONFIG.CHECK_INTERVAL_MS / 1000 / 60
      log(`\n⏳ Waiting ${waitMinutes} minutes until next check...`)
      await sleep(CONFIG.CHECK_INTERVAL_MS)
    }
  }
  
  // Final report
  await generateFinalReport()
}

// Update existing positions (check stop loss, take profit, exit signals)
async function updatePositions() {
  if (portfolio.positions.length === 0) {
    log('📊 No open positions')
    return
  }
  
  log(`📊 Checking ${portfolio.positions.length} open positions...`)
  
  for (const position of [...portfolio.positions]) {
    const currentPrice = await getCurrentPrice(position.symbol)
    if (!currentPrice) {
      log(`  ⚠️ ${position.symbol}: No price data, keeping position`)
      continue
    }
    
    const priceChange = position.side === 'LONG'
      ? ((currentPrice - position.entry_price) / position.entry_price) * 100
      : ((position.entry_price - currentPrice) / position.entry_price) * 100
    
    const currentValue = position.size_gbp * (1 + priceChange / 100)
    const pnl = currentValue - position.size_gbp
    const pnlPct = (pnl / position.size_gbp) * 100
    
    // Apply trading costs on exit
    const exitCost = position.size_gbp * ((CONFIG.TAKER_FEE_BPS + CONFIG.SLIPPAGE_BPS) / 10000)
    const netPnl = pnl - exitCost
    
    log(`  ${position.symbol} ${position.side}: £${position.size_gbp.toFixed(2)} → £${currentValue.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`)
    
    // Check exit conditions
    let shouldExit = false
    let exitReason = ''
    
    if (pnlPct <= CONFIG.STOP_LOSS_PCT) {
      shouldExit = true
      exitReason = `STOP LOSS (${pnlPct.toFixed(1)}%)`
    } else if (pnlPct >= CONFIG.TAKE_PROFIT_PCT) {
      shouldExit = true
      exitReason = `TAKE PROFIT (${pnlPct.toFixed(1)}%)`
    } else {
      // Re-evaluate conviction
      const signal = await getSignalForCoin(position.symbol)
      
      // Exit if signal flipped
      if (position.side === 'LONG' && signal?.direction === 'BEARISH' && signal.conviction >= 6) {
        shouldExit = true
        exitReason = `SIGNAL FLIP (now bearish ${signal.conviction}/10)`
      } else if (position.side === 'SHORT' && signal?.direction === 'BULLISH' && signal.conviction >= 6) {
        shouldExit = true
        exitReason = `SIGNAL FLIP (now bullish ${signal.conviction}/10)`
      }
    }
    
    if (shouldExit) {
      closePosition(position, currentPrice, netPnl, exitReason)
    }
  }
}

// Close a position
function closePosition(position, exitPrice, netPnl, reason) {
  portfolio.cash_gbp += position.size_gbp + netPnl
  portfolio.total_pnl += netPnl
  
  portfolio.positions = portfolio.positions.filter(p => p !== position)
  portfolio.closed_trades.push({
    ...position,
    exit_price: exitPrice,
    exit_time: new Date().toISOString(),
    pnl_gbp: netPnl,
    return_pct: (netPnl / position.size_gbp) * 100,
    reason
  })
  
  log(`  ✅ CLOSED ${position.symbol} ${position.side}: ${reason} | P&L: £${netPnl.toFixed(2)}`)
}

// Analyze market and find opportunities
async function analyzeMarket() {
  log(`\n🔍 Analyzing market...`)
  
  // Get top coins by whale activity in last 2 hours
  const topCoins = await getTopActiveCoins(20)
  log(`  Found ${topCoins.length} active coins`)
  
  const opportunities = []
  
  for (const coin of topCoins) {
    const signal = await getSignalForCoin(coin)
    if (!signal || signal.conviction < CONFIG.MIN_CONVICTION_SCORE) continue
    
    opportunities.push({ coin, ...signal })
  }
  
  // Sort by conviction
  opportunities.sort((a, b) => b.conviction - a.conviction)
  
  log(`  Identified ${opportunities.length} high-conviction opportunities`)
  opportunities.slice(0, 5).forEach(opp => {
    log(`    ${opp.coin}: ${opp.direction} (${opp.conviction}/10) - ${opp.reason}`)
  })
  
  return opportunities
}

// Make trading decisions
async function makeTradeDecisions(opportunities) {
  if (portfolio.positions.length >= CONFIG.MAX_POSITIONS) {
    log(`\n💼 Portfolio full (${portfolio.positions.length}/${CONFIG.MAX_POSITIONS} positions)`)
    return
  }
  
  const availableSlots = CONFIG.MAX_POSITIONS - portfolio.positions.length
  const availableCash = portfolio.cash_gbp
  
  log(`\n💡 Evaluating new positions (${availableSlots} slots, £${availableCash.toFixed(2)} cash)...`)
  
  for (const opp of opportunities) {
    if (portfolio.positions.length >= CONFIG.MAX_POSITIONS) break
    if (portfolio.cash_gbp < CONFIG.MAX_POSITION_SIZE_GBP) break
    
    // Don't open duplicate positions
    if (portfolio.positions.some(p => p.symbol === opp.coin)) {
      log(`  ⏭️ ${opp.coin}: Already have position, skipping`)
      continue
    }
    
    // Open position
    const positionSize = Math.min(CONFIG.MAX_POSITION_SIZE_GBP, portfolio.cash_gbp * 0.8)
    const entryPrice = await getCurrentPrice(opp.coin)
    
    if (!entryPrice) {
      log(`  ⚠️ ${opp.coin}: No price data, skipping`)
      continue
    }
    
    // Apply entry costs
    const entryCost = positionSize * ((CONFIG.TAKER_FEE_BPS + CONFIG.SLIPPAGE_BPS) / 10000)
    const netPositionSize = positionSize - entryCost
    
    portfolio.cash_gbp -= positionSize
    
    portfolio.positions.push({
      symbol: opp.coin,
      side: opp.direction === 'BULLISH' ? 'LONG' : 'SHORT',
      entry_price: entryPrice,
      size_gbp: netPositionSize,
      entry_time: new Date().toISOString(),
      conviction: opp.conviction,
      entry_reason: opp.reason
    })
    
    log(`  ✅ OPENED ${opp.direction === 'BULLISH' ? 'LONG' : 'SHORT'} ${opp.coin} at £${entryPrice.toFixed(4)} | Size: £${netPositionSize.toFixed(2)} | Conviction: ${opp.conviction}/10`)
    log(`     Reason: ${opp.reason}`)
  }
}

// Get signal for a specific coin
async function getSignalForCoin(symbol) {
  try {
    // 1. Get whale data (last 2 hours)
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const whaleRes = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/whale_transactions?token_symbol=eq.${symbol}&timestamp=gte.${since}&select=classification,usd_value,timestamp`,
      {
        headers: {
          'apikey': CONFIG.SUPABASE_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
        }
      }
    )
    
    if (!whaleRes.ok) return null
    const txs = await whaleRes.json()
    
    if (!txs || txs.length < 3) return null
    
    const buys = txs.filter(t => t.classification?.toUpperCase() === 'BUY')
    const sells = txs.filter(t => t.classification?.toUpperCase() === 'SELL')
    const buyVolume = buys.reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0)
    const sellVolume = sells.reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0)
    const totalVolume = buyVolume + sellVolume
    const netFlow = buyVolume - sellVolume
    const buyPct = totalVolume > 0 ? (buyVolume / totalVolume) * 100 : 50
    
    // 2. Get price momentum (4h vs 1h)
    const priceData = await getPriceData(symbol)
    let priceMomentum = 0
    if (priceData) {
      const change1h = priceData.price_change_percentage_1h || 0
      const change4h = priceData.price_change_percentage_4h || 0
      priceMomentum = (change1h + change4h) / 2
    }
    
    // 3. Get news sentiment
    let newsSentiment = 0
    try {
      const newsRes = await fetch(
        `https://cryptopanic.com/api/developer/v2/posts/?auth_token=${CONFIG.CRYPTOPANIC_KEY}&currencies=${symbol}&kind=news`,
        { timeout: 5000 }
      )
      if (newsRes.ok) {
        const newsData = await newsRes.json()
        const recent = (newsData.results || []).slice(0, 5)
        const positive = recent.filter(n => n.votes?.positive > n.votes?.negative).length
        const negative = recent.filter(n => n.votes?.negative > n.votes?.positive).length
        newsSentiment = positive - negative // -5 to +5
      }
    } catch (err) {
      // News API timeout, ignore
    }
    
    // 4. Calculate conviction score (0-10)
    let conviction = 5 // Neutral start
    let direction = null
    let reason = ''
    
    // Whale sentiment weight (0-4 points)
    if (buyPct > 65) {
      conviction += 2
      direction = 'BULLISH'
      reason = `${buyPct.toFixed(0)}% whale buys`
    } else if (buyPct < 35) {
      conviction += 2
      direction = 'BEARISH'
      reason = `${(100-buyPct).toFixed(0)}% whale sells`
    } else if (buyPct > 55) {
      conviction += 1
      direction = 'BULLISH'
      reason = `${buyPct.toFixed(0)}% whale buys (moderate)`
    } else if (buyPct < 45) {
      conviction += 1
      direction = 'BEARISH'
      reason = `${(100-buyPct).toFixed(0)}% whale sells (moderate)`
    } else {
      return null // Too neutral, skip
    }
    
    // Net flow weight (0-2 points)
    if (Math.abs(netFlow) > 1000000) {
      conviction += 2
      reason += `, $${(Math.abs(netFlow) / 1000000).toFixed(1)}M flow`
    } else if (Math.abs(netFlow) > 500000) {
      conviction += 1
      reason += `, $${(Math.abs(netFlow) / 1000).toFixed(0)}K flow`
    }
    
    // Price momentum weight (0-2 points)
    if ((direction === 'BULLISH' && priceMomentum > 3) || (direction === 'BEARISH' && priceMomentum < -3)) {
      conviction += 2
      reason += `, ${priceMomentum > 0 ? '+' : ''}${priceMomentum.toFixed(1)}% momentum`
    } else if ((direction === 'BULLISH' && priceMomentum > 0) || (direction === 'BEARISH' && priceMomentum < 0)) {
      conviction += 1
    } else if ((direction === 'BULLISH' && priceMomentum < -2) || (direction === 'BEARISH' && priceMomentum > 2)) {
      conviction -= 1 // Divergence penalty
      reason += ` (⚠️ diverging from price)`
    }
    
    // News sentiment weight (0-1 points)
    if ((direction === 'BULLISH' && newsSentiment > 0) || (direction === 'BEARISH' && newsSentiment < 0)) {
      conviction += 1
      reason += `, news ${newsSentiment > 0 ? 'positive' : 'negative'}`
    }
    
    // Transaction count weight (bonus for high activity)
    if (txs.length > 20) {
      conviction += 1
      reason += `, ${txs.length} whale txs`
    }
    
    // Cap at 10
    conviction = Math.min(10, conviction)
    
    return { direction, conviction, reason, buyPct, netFlow, priceMomentum, newsSentiment }
    
  } catch (error) {
    console.error(`Signal error for ${symbol}:`, error.message)
    return null
  }
}

// Get top active coins
async function getTopActiveCoins(limit = 20) {
  try {
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const res = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/whale_transactions?timestamp=gte.${since}&select=token_symbol`,
      {
        headers: {
          'apikey': CONFIG.SUPABASE_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
        }
      }
    )
    
    if (!res.ok) return []
    const txs = await res.json()
    
    const counts = {}
    txs.forEach(t => {
      const sym = t.token_symbol?.toUpperCase()
      if (sym && !STABLECOINS.includes(sym) && SYMBOL_TO_ID[sym]) {
        counts[sym] = (counts[sym] || 0) + 1
      }
    })
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([sym]) => sym)
      
  } catch (error) {
    console.error('Failed to get top coins:', error)
    return []
  }
}

// Get current price
async function getCurrentPrice(symbol) {
  const cgId = SYMBOL_TO_ID[symbol]
  if (!cgId) return null
  
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=gbp`,
      {
        headers: { 'x-cg-demo-api-key': CONFIG.COINGECKO_KEY || '' },
        timeout: 5000
      }
    )
    
    if (!res.ok) return null
    const data = await res.json()
    return data[cgId]?.gbp || null
    
  } catch (error) {
    return null
  }
}

// Get price data with momentum
async function getPriceData(symbol) {
  const cgId = SYMBOL_TO_ID[symbol]
  if (!cgId) return null
  
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${cgId}?localization=false&tickers=false&market_data=true`,
      {
        headers: { 'x-cg-demo-api-key': CONFIG.COINGECKO_KEY || '' },
        timeout: 5000
      }
    )
    
    if (!res.ok) return null
    const data = await res.json()
    
    return {
      price_change_percentage_1h: data.market_data?.price_change_percentage_1h_in_currency?.gbp || 0,
      price_change_percentage_4h: data.market_data?.price_change_percentage_4h_in_currency?.gbp || 0,
      price_change_percentage_24h: data.market_data?.price_change_percentage_24h_in_currency?.gbp || 0
    }
    
  } catch (error) {
    return null
  }
}

// Show portfolio status
function showPortfolioStatus() {
  log(`\n💼 PORTFOLIO STATUS`)
  log(`   Cash: £${portfolio.cash_gbp.toFixed(2)}`)
  log(`   Open Positions: ${portfolio.positions.length}`)
  log(`   Closed Trades: ${portfolio.closed_trades.length}`)
  log(`   Total P&L: £${portfolio.total_pnl.toFixed(2)}`)
  
  const totalValue = portfolio.cash_gbp + portfolio.positions.reduce((sum, p) => sum + p.size_gbp, 0)
  const totalReturn = ((totalValue - CONFIG.INITIAL_CAPITAL_GBP) / CONFIG.INITIAL_CAPITAL_GBP * 100).toFixed(2)
  log(`   Total Value: £${totalValue.toFixed(2)} (${totalReturn >= 0 ? '+' : ''}${totalReturn}%)`)
}

// Generate final report
async function generateFinalReport() {
  log('\n\n')
  log('╔══════════════════════════════════════════════════════════════════╗')
  log('║                    FINAL TRADING REPORT                          ║')
  log('╚══════════════════════════════════════════════════════════════════╝')
  
  // Close all remaining positions
  log('\n📊 Closing all remaining positions...')
  for (const position of [...portfolio.positions]) {
    const currentPrice = await getCurrentPrice(position.symbol)
    if (currentPrice) {
      const priceChange = position.side === 'LONG'
        ? ((currentPrice - position.entry_price) / position.entry_price) * 100
        : ((position.entry_price - currentPrice) / position.entry_price) * 100
      
      const currentValue = position.size_gbp * (1 + priceChange / 100)
      const pnl = currentValue - position.size_gbp
      const exitCost = position.size_gbp * ((CONFIG.TAKER_FEE_BPS + CONFIG.SLIPPAGE_BPS) / 10000)
      const netPnl = pnl - exitCost
      
      closePosition(position, currentPrice, netPnl, 'END OF TEST')
    }
  }
  
  // Calculate final metrics
  const finalCash = portfolio.cash_gbp
  const finalValue = finalCash
  const totalReturn = finalValue - CONFIG.INITIAL_CAPITAL_GBP
  const totalReturnPct = (totalReturn / CONFIG.INITIAL_CAPITAL_GBP) * 100
  
  const profitableTrades = portfolio.closed_trades.filter(t => t.pnl_gbp > 0)
  const hitRate = portfolio.closed_trades.length > 0 
    ? (profitableTrades.length / portfolio.closed_trades.length * 100).toFixed(1)
    : 0
  
  const avgProfit = profitableTrades.length > 0
    ? profitableTrades.reduce((sum, t) => sum + t.pnl_gbp, 0) / profitableTrades.length
    : 0
  
  const losingTrades = portfolio.closed_trades.filter(t => t.pnl_gbp < 0)
  const avgLoss = losingTrades.length > 0
    ? losingTrades.reduce((sum, t) => sum + t.pnl_gbp, 0) / losingTrades.length
    : 0
  
  log('\n📈 PERFORMANCE SUMMARY')
  log(`   Starting Capital: £${CONFIG.INITIAL_CAPITAL_GBP.toFixed(2)}`)
  log(`   Ending Capital:   £${finalValue.toFixed(2)}`)
  log(`   Total Return:     £${totalReturn.toFixed(2)} (${totalReturnPct >= 0 ? '+' : ''}${totalReturnPct.toFixed(2)}%)`)
  log('')
  log(`   Total Trades:     ${portfolio.closed_trades.length}`)
  log(`   Winning Trades:   ${profitableTrades.length} (${hitRate}%)`)
  log(`   Losing Trades:    ${losingTrades.length}`)
  log(`   Avg Win:          £${avgProfit.toFixed(2)}`)
  log(`   Avg Loss:         £${avgLoss.toFixed(2)}`)
  log(`   Win/Loss Ratio:   ${avgLoss !== 0 ? (Math.abs(avgProfit / avgLoss)).toFixed(2) : 'N/A'}`)
  
  // Best/worst trades
  const sorted = [...portfolio.closed_trades].sort((a, b) => b.pnl_gbp - a.pnl_gbp)
  
  log('\n🏆 TOP 5 TRADES')
  sorted.slice(0, 5).forEach((t, i) => {
    log(`   ${i + 1}. ${t.symbol} ${t.side}: £${t.pnl_gbp.toFixed(2)} (${t.return_pct.toFixed(1)}%) - ${t.reason}`)
  })
  
  log('\n💔 WORST 5 TRADES')
  sorted.slice(-5).reverse().forEach((t, i) => {
    log(`   ${i + 1}. ${t.symbol} ${t.side}: £${t.pnl_gbp.toFixed(2)} (${t.return_pct.toFixed(1)}%) - ${t.reason}`)
  })
  
  // Verdict
  log('\n🎯 VERDICT')
  if (totalReturnPct > 10) {
    log('   ✅ EXCELLENT - Signals are highly profitable!')
  } else if (totalReturnPct > 5) {
    log('   ✅ GOOD - Signals show promise, profitable strategy')
  } else if (totalReturnPct > 0) {
    log('   ⚠️ MARGINAL - Slightly profitable, needs optimization')
  } else if (totalReturnPct > -5) {
    log('   ⚠️ BREAK-EVEN - Signals need improvement')
  } else {
    log('   ❌ UNPROFITABLE - Strategy needs major revision')
  }
  
  // Save report to file
  const fs = require('fs')
  const reportPath = `./backtest-report-${Date.now()}.txt`
  fs.writeFileSync(reportPath, logs.join('\n'))
  log(`\n📄 Full log saved to: ${reportPath}`)
  
  log('\n╔══════════════════════════════════════════════════════════════════╗')
  log('║                      TEST COMPLETE                               ║')
  log('╚══════════════════════════════════════════════════════════════════╝')
}

// Helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Run
main().catch(error => {
  console.error('FATAL ERROR:', error)
  process.exit(1)
})

