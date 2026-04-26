/**
 * CRON: Evaluate Signal Accuracy
 * Schedule: Every hour
 * 
 * Looks back at signals from 1h, 6h, and 24h ago.
 * Fetches current price from Binance (live) with price_snapshots fallback.
 * Compares price_at_signal vs current price to see if the signal was correct.
 * Stores results in signal_outcomes table.
 * 
 * A signal is "correct" if:
 *   - STRONG BUY / BUY → price went UP
 *   - STRONG SELL / SELL → price went DOWN
 *   - NEUTRAL → no evaluation (excluded)
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const EVAL_WINDOWS = [
  { label: '1h', ms: 1 * 60 * 60 * 1000 },
  { label: '6h', ms: 6 * 60 * 60 * 1000 },
  { label: '24h', ms: 24 * 60 * 60 * 1000 },
]

// Noise floor: any |price change| below this is statistically indistinguishable
// from data-feed jitter (and unprofitable after fees+slippage). We mark these
// outcomes as `correct = null` instead of scoring them as wrong.
// 5 bps ≈ 0.05% ≈ Binance taker fee on a single side.
const NOISE_FLOOR_PCT = 0.05

// CoinGecko ID lookup for tokens NOT reliably on Binance USDT (or where the
// USDT pair has thin volume / weird symbol). Used as a live fallback when the
// Binance batch ticker doesn't return a quote — avoids the silent regression
// where evaluate-signals would fall through to price_snapshots and pick up the
// SAME signal-time price (yielding price_change_pct = 0.00% and a false negative).
// Subset mirrored from app/api/cron/fetch-prices/route.ts TICKER_MAP — keep
// in sync for any new low-liquidity additions.
const CG_ID_FALLBACK = {
  SSV: 'ssv-network', EIGEN: 'eigenlayer', LDO: 'lido-dao', CVX: 'convex-finance',
  BAT: 'basic-attention-token', LRC: 'loopring', MNT: 'mantle', NMR: 'numeraire',
  YFI: 'yearn-finance', DYDX: 'dydx', LPT: 'livepeer', APE: 'apecoin',
  QNT: 'quant-network', BLUR: 'blur', PENDLE: 'pendle', ONDO: 'ondo-finance',
  ENA: 'ethena', ENS: 'ethereum-name-service', RPL: 'rocket-pool', GNO: 'gnosis',
  FXS: 'frax-share', TAO: 'bittensor', RENDER: 'render-token', RNDR: 'render-token',
  PYTH: 'pyth-network', JUP: 'jupiter-exchange-solana', KAS: 'kaspa',
  STRK: 'starknet', CELO: 'celo', API3: 'api3', SKL: 'skale', ANKR: 'ankr',
  MASK: 'mask-network', GMX: 'gmx', ZRX: '0x', GRT: 'the-graph',
  COMP: 'compound-governance-token', CRV: 'curve-dao-token', SNX: 'havven',
}

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // v8 (2026-04-26 FIX): api.binance.com is geo-blocked from Vercel's
    // serverless region. The previous implementation silently caught the
    // failure and fell through to price_snapshots — which were ALSO stale
    // because fetch-prices uses the same broken Binance feed. Net effect:
    // every outcome since 2026-04-24 20:00 UTC was evaluated against a
    // 49-hour-old price (BTC stuck at $71258 vs real $77981, 9.4% gap).
    // Switched to CoinGecko Pro as primary (proven reliable from any
    // region). Binance kept ONLY as enrichment opportunity.
    const priceMap = new Map()

    // Build CG ID list from TICKER_MAP equivalents — we want the same
    // universe as fetch-prices. Cheaper to just hit CG /simple/price for
    // all the tokens we care about.
    const cgKey = process.env.COINGECKO_API_KEY
    if (cgKey) {
      // Pull the ticker→cg id map from price_snapshots indirectly by asking
      // CG for the most-traded universe. Simpler: hardcode the IDs we need
      // (mirrors fetch-prices/route.ts TICKER_MAP). For evaluate-signals
      // we only need the tokens that appeared in token_signals recently, so
      // we ask CG for the union of CG_ID_FALLBACK + a small core set.
      const CORE_TOKENS = {
        BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
        XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', TRX: 'tron',
        AVAX: 'avalanche-2', SHIB: 'shiba-inu', DOT: 'polkadot', LINK: 'chainlink',
        MATIC: 'matic-network', UNI: 'uniswap', LTC: 'litecoin', ATOM: 'cosmos',
        ETC: 'ethereum-classic', XLM: 'stellar', NEAR: 'near', ALGO: 'algorand',
        VET: 'vechain', FIL: 'filecoin', APT: 'aptos', HBAR: 'hedera-hashgraph',
        ARB: 'arbitrum', OP: 'optimism', SUI: 'sui', SEI: 'sei-network',
        TIA: 'celestia', STX: 'blockstack', INJ: 'injective-protocol',
        AAVE: 'aave', MKR: 'maker', RUNE: 'thorchain', SUSHI: 'sushi',
        SAND: 'the-sandbox', MANA: 'decentraland', IMX: 'immutable-x',
        AXS: 'axie-infinity', GALA: 'gala', ENJ: 'enjincoin', CHZ: 'chiliz',
        PEPE: 'pepe', WLD: 'worldcoin-wld', WIF: 'dogwifcoin', BONK: 'bonk',
        FLOKI: 'floki', FTM: 'fantom', '1INCH': '1inch', FET: 'artificial-superintelligence-alliance',
        WBTC: 'wrapped-bitcoin', WETH: 'weth',
      }
      const allMap = { ...CORE_TOKENS, ...CG_ID_FALLBACK }
      const ids = [...new Set(Object.values(allMap))].join(',')
      try {
        const cgRes = await fetch(
          `https://pro-api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
          { headers: { 'x-cg-pro-api-key': cgKey }, signal: AbortSignal.timeout(15000) }
        )
        if (cgRes.ok) {
          const data = await cgRes.json()
          for (const [sym, cgId] of Object.entries(allMap)) {
            const usd = data[cgId]?.usd
            if (usd && usd > 0) priceMap.set(sym, Number(usd))
          }
        }
      } catch (e) {
        console.warn('[EvalSignals] CoinGecko price fetch failed, using snapshots:', e.message)
      }
    }

    // Wrapped tokens mirror their underlying when CG didn't return them
    // explicitly (some CG IDs for wrapped variants drift from spot).
    if (!priceMap.has('WBTC') && priceMap.has('BTC')) priceMap.set('WBTC', priceMap.get('BTC'))
    if (!priceMap.has('WETH') && priceMap.has('ETH')) priceMap.set('WETH', priceMap.get('ETH'))

    // Last-resort fallback: fill gaps from price_snapshots. With CG primary
    // working, this should never fire — but if it does, the freshness
    // check at insert time means anything we read here is at most 15min old.
    if (priceMap.size < 20) {
      const { data: priceRows } = await supabaseAdmin
        .from('price_snapshots')
        .select('ticker, price_usd')
        .order('timestamp', { ascending: false })
        .limit(500)
      for (const row of (priceRows || [])) {
        if (!priceMap.has(row.ticker)) priceMap.set(row.ticker, row.price_usd)
      }
    }

    let evaluated = 0
    let skipped = 0
    const errors = []

    // BTC is our risk-free-ish benchmark for crypto-relative alpha.
    // Current BTC price comes from the live priceMap; historical BTC for
    // each eval window comes from price_snapshots.
    const btcNow = priceMap.get('BTC') || null

    for (const window of EVAL_WINDOWS) {
      // Find signals that were created approximately `window.ms` ago
      // Look in a 30-min window around the target time
      const targetTime = new Date(Date.now() - window.ms)
      const windowStart = new Date(targetTime.getTime() - 15 * 60 * 1000)
      const windowEnd = new Date(targetTime.getTime() + 15 * 60 * 1000)

      // Pull the closest BTC snapshot inside this window (one query per window).
      let btcAtSignal = null
      try {
        const { data: btcRows } = await supabaseAdmin
          .from('price_snapshots')
          .select('price_usd, timestamp')
          .eq('ticker', 'BTC')
          .gte('timestamp', windowStart.toISOString())
          .lte('timestamp', windowEnd.toISOString())
          .order('timestamp', { ascending: true })
          .limit(1)
        if (btcRows && btcRows.length > 0) btcAtSignal = Number(btcRows[0].price_usd)
      } catch (e) {
        // Non-fatal: alpha will be NULL for this window's outcomes
      }

      const btcChangePct = (btcNow && btcAtSignal)
        ? ((btcNow - btcAtSignal) / btcAtSignal) * 100
        : null

      const { data: signals, error: sigErr } = await supabaseAdmin
        .from('token_signals')
        .select('id, token, signal, score, confidence, price_at_signal, computed_at')
        .gte('computed_at', windowStart.toISOString())
        .lte('computed_at', windowEnd.toISOString())
        .not('signal', 'eq', 'NEUTRAL')
        .not('price_at_signal', 'is', null)

      if (sigErr) {
        errors.push(`${window.label}: ${sigErr.message}`)
        continue
      }

      if (!signals || signals.length === 0) continue

      for (const sig of signals) {
        const currentPrice = priceMap.get(sig.token)
        if (!currentPrice || !sig.price_at_signal) {
          skipped++
          continue
        }

        // Check if already evaluated for this window
        const { data: existing } = await supabaseAdmin
          .from('signal_outcomes')
          .select('id')
          .eq('signal_id', sig.id)
          .eq('eval_window', window.label)
          .maybeSingle()

        if (existing) {
          skipped++
          continue
        }

        const priceChange = ((currentPrice - sig.price_at_signal) / sig.price_at_signal) * 100
        const isBullish = sig.signal === 'STRONG BUY' || sig.signal === 'BUY'
        const isBearish = sig.signal === 'STRONG SELL' || sig.signal === 'SELL'

        // Noise-floor gate: tiny moves (or stale-price gaps where
        // currentPrice ≈ price_at_signal) are NOT a failed prediction.
        // Mark them null so they're excluded from accuracy aggregations.
        let correct = null
        if (Math.abs(priceChange) >= NOISE_FLOOR_PCT) {
          if (isBullish) correct = priceChange > 0
          else if (isBearish) correct = priceChange < 0
        }

        // Alpha vs BTC benchmark. NULL when we couldn't pin down a BTC
        // snapshot for this window — better than fabricating zero.
        let alphaPct = null
        let beatBenchmark = null
        if (btcChangePct !== null) {
          alphaPct = priceChange - btcChangePct
          if (isBullish) beatBenchmark = alphaPct > 0
          else if (isBearish) beatBenchmark = alphaPct < 0
        }

        const { error: insertErr } = await supabaseAdmin
          .from('signal_outcomes')
          .insert({
            signal_id: sig.id,
            token: sig.token,
            signal_type: sig.signal,
            signal_score: sig.score,
            signal_confidence: sig.confidence,
            price_at_signal: sig.price_at_signal,
            price_at_eval: currentPrice,
            price_change_pct: Math.round(priceChange * 100) / 100,
            correct,
            eval_window: window.label,
            signal_time: sig.computed_at,
            eval_time: new Date().toISOString(),
            btc_price_at_signal: btcAtSignal,
            btc_price_at_eval: btcNow,
            btc_change_pct: btcChangePct === null ? null : Math.round(btcChangePct * 100) / 100,
            alpha_pct: alphaPct === null ? null : Math.round(alphaPct * 100) / 100,
            beat_benchmark: beatBenchmark,
          })

        if (insertErr) {
          errors.push(`${sig.token}/${window.label}: ${insertErr.message}`)
        } else {
          evaluated++
        }
      }
    }

    return NextResponse.json({
      message: 'Signal accuracy evaluation complete',
      evaluated,
      skipped,
      errors_count: errors.length,
      errors: errors.slice(0, 10),
    })
  } catch (err) {
    console.error('Signal accuracy eval error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
