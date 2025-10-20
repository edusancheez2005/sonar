# 🤖 Autonomous Trader - Instructions

## What This Does

This script acts as an **independent AI trader** with £2,400 capital. It makes real trading decisions based on:
- ✅ Whale transaction data (buy/sell pressure)
- ✅ Live price momentum from CoinGecko
- ✅ News sentiment from CryptoPanic
- ✅ Multi-factor conviction scoring (0-10)

It runs for **24 hours**, checking the market **every hour**, and makes decisions to:
- Open new positions (LONG or SHORT)
- Close positions (stop loss, take profit, signal flip)
- Track full P&L with fees and slippage

## How to Run

### 1. Install dependencies (if not already installed)
```bash
npm install node-fetch dotenv
```

### 2. Ensure `.env.local` has these keys
```
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE=your_key
COINGECKO_API_KEY=your_key
CRYPTOPANIC_API_KEY=your_key
```

### 3. Run the script
```bash
node scripts/autonomous-trader.js
```

### 4. Let it run for 24 hours
The script will:
- Check the market every hour
- Make trading decisions autonomously
- Log everything to console + save to file

## Configuration

Edit these values in the script if needed:

```javascript
const CONFIG = {
  INITIAL_CAPITAL_GBP: 2400,      // Starting capital
  MAX_POSITION_SIZE_GBP: 200,     // Max per trade
  MAX_POSITIONS: 12,              // Max concurrent positions
  CHECK_INTERVAL_MS: 3600000,     // 1 hour (change to 300000 for 5 min testing)
  DURATION_HOURS: 24,             // Total test duration
  STOP_LOSS_PCT: -8,              // Exit if down 8%
  TAKE_PROFIT_PCT: 12,            // Exit if up 12%
  MIN_CONVICTION_SCORE: 6,        // Only trade signals 6/10 or higher
  TAKER_FEE_BPS: 10,              // 0.10% exchange fee
  SLIPPAGE_BPS: 5                 // 0.05% slippage
}
```

## Conviction Scoring (0-10)

The bot scores each opportunity based on:

1. **Whale Sentiment** (0-4 points)
   - >65% buys: +2 points (BULLISH)
   - <35% sells: +2 points (BEARISH)
   - 55-65% buys: +1 point
   - 35-45% sells: +1 point

2. **Net Flow** (0-2 points)
   - >$1M flow: +2 points
   - $500K-$1M flow: +1 point

3. **Price Momentum** (0-2 points)
   - Confirming direction: +2 points
   - Slightly confirming: +1 point
   - Diverging: -1 point (penalty)

4. **News Sentiment** (0-1 point)
   - Positive/negative aligning with signal: +1 point

5. **Activity Bonus** (0-1 point)
   - >20 whale transactions: +1 point

**Minimum to trade: 6/10 conviction**

## Trading Logic

### Opening Positions
- Only opens if conviction >= 6/10
- Max 12 concurrent positions
- Max £200 per position
- LONG for BULLISH signals, SHORT for BEARISH

### Closing Positions
Exits when:
1. **Stop Loss**: Down 8%
2. **Take Profit**: Up 12%
3. **Signal Flip**: Whale sentiment reverses with 6/10+ conviction
4. **End of Test**: Closes all at 24h mark

## Output

### During Run
```
🕐 HOUR 5 (5.0h elapsed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Checking 3 open positions...
  BTC LONG: £200.00 → £218.40 (+9.20%)
  ETH SHORT: £200.00 → £188.20 (-5.90%)
  ✅ CLOSED LDO LONG: TAKE PROFIT (12.3%) | P&L: £24.60

🔍 Analyzing market...
  Found 18 active coins
  Identified 7 high-conviction opportunities
    BTC: BULLISH (8/10) - 68% whale buys, $2.3M flow, +4.2% momentum
    LINK: BEARISH (7/10) - 72% whale sells, $890K flow

💡 Evaluating new positions (9 slots, £2,124.60 cash)...
  ✅ OPENED LONG BTC at £45,234.50 | Size: £200.00 | Conviction: 8/10
     Reason: 68% whale buys, $2.3M flow, +4.2% momentum, 24 whale txs

💼 PORTFOLIO STATUS
   Cash: £1,924.60
   Open Positions: 4
   Closed Trades: 2
   Total P&L: £18.70
   Total Value: £2,418.70 (+0.78%)
```

### Final Report
```
╔══════════════════════════════════════════════════════════════════╗
║                    FINAL TRADING REPORT                          ║
╚══════════════════════════════════════════════════════════════════╝

📈 PERFORMANCE SUMMARY
   Starting Capital: £2,400.00
   Ending Capital:   £2,687.35
   Total Return:     £287.35 (+11.97%)

   Total Trades:     18
   Winning Trades:   12 (66.7%)
   Losing Trades:    6
   Avg Win:          £42.18
   Avg Loss:         £-18.52
   Win/Loss Ratio:   2.28

🏆 TOP 5 TRADES
   1. BTC LONG: £89.23 (44.6%) - TAKE PROFIT
   2. LINK SHORT: £67.80 (33.9%) - SIGNAL FLIP
   ...

💔 WORST 5 TRADES
   1. LDO LONG: £-42.15 (-21.1%) - STOP LOSS
   ...

🎯 VERDICT
   ✅ EXCELLENT - Signals are highly profitable!

📄 Full log saved to: ./backtest-report-1729512345678.txt
```

## Quick Testing (5-min intervals)

To test faster, change line 14:
```javascript
CHECK_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
DURATION_HOURS: 2, // 2 hours total = 24 iterations
```

## Notes

- **Live prices**: Uses real CoinGecko market data
- **Real whale data**: From your Supabase database
- **Realistic costs**: 0.15% total per trade (fees + slippage)
- **Risk management**: Stop loss, take profit, position sizing
- **Autonomous**: Makes all decisions independently

## Monitoring

The script logs everything. You can:
- Watch live in terminal
- Check the saved `.txt` report file after completion
- Press `Ctrl+C` to stop early (will generate report with current data)

---

**Ready to test your signals? Run:**
```bash
node scripts/autonomous-trader.js
```

Let it run and see if your whale sentiment analysis can beat the market! 🚀📊

