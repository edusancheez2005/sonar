import 'server-only'
import type {
  BacktestChain,
  CanonicalTrade,
  EquityPoint,
  BacktestResult,
  BenchmarkResult,
  TradeAction,
} from './types'
import {
  getPriceSeries,
  priceAt,
  NATIVE_COINGECKO,
  type TokenRef,
  type PricePoint,
} from '../coingecko/history'
import { getEvmTransfers, QUOTE_CONTRACTS, type RawEvmTransfer } from '../wallet/transfers'
import { getSolanaSwaps, type RawSolSwap } from '../wallet/sol-swaps'

const FEE_BPS = 30          // 30 bps round-trip per trade
const DUST_USD = 25         // ignore trade legs worth less than $25
const SOL_DECIMALS = 9
// Crude WETH/WMATIC symbols treated as native equivalents.
const NATIVE_WRAP_SYMBOLS: Record<BacktestChain, Set<string>> = {
  ethereum: new Set(['WETH']),
  polygon: new Set(['WMATIC']),
  solana: new Set(['WSOL']),
}

// Approximate avg block time per chain — used to map a date range to a
// block-height range when calling Alchemy. We pad both sides by 1 day
// so we don't accidentally clip trades near the boundaries.
const AVG_BLOCK_SECS: Record<BacktestChain, number> = {
  ethereum: 12,
  polygon: 2,
  solana: 0, // unused; Solana fetcher uses timestamp directly
}

function nowMs() { return Date.now() }

// ─── Price helpers ──────────────────────────────────────────────────────
async function getSeries(ref: TokenRef, fromMs: number, toMs: number): Promise<PricePoint[]> {
  return getPriceSeries(ref, fromMs, toMs)
}

// ─── EVM canonicalization ────────────────────────────────────────────────
// Group raw transfers by tx hash. Within each tx, the wallet's net
// flow per token decides whether the tx is a BUY/SELL/swap/transfer.
function groupByHash<T extends { hash?: string; signature?: string; ts: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const r of rows) {
    const k = (r as any).hash || (r as any).signature || ''
    if (!k) continue
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(r)
  }
  return map
}

interface NetLeg {
  symbol: string | null
  contract: string | null         // null => native
  net_amount: number              // positive = received, negative = sent
}

// Reduce all transfers in one tx to a single net leg per (contract).
// This collapses LP routes / aggregator splits into a clean delta.
function netLegsForEvmTx(transfers: RawEvmTransfer[]): NetLeg[] {
  const buckets = new Map<string, { symbol: string | null; contract: string | null; net: number }>()
  for (const t of transfers) {
    const key = t.contract || '__native__'
    if (!buckets.has(key)) {
      buckets.set(key, { symbol: t.symbol, contract: t.contract, net: 0 })
    }
    const b = buckets.get(key)!
    b.net += t.direction === 'in' ? t.amount : -t.amount
    if (!b.symbol && t.symbol) b.symbol = t.symbol
  }
  const out: NetLeg[] = []
  for (const b of buckets.values()) {
    if (b.net === 0) continue
    out.push({ symbol: b.symbol, contract: b.contract, net_amount: b.net })
  }
  return out
}

function isQuoteEvmLeg(chain: BacktestChain, leg: NetLeg): boolean {
  // Native is always the chain's native token (ETH/MATIC) — treat as quote.
  if (leg.contract === null) return true
  const wrapped = NATIVE_WRAP_SYMBOLS[chain]
  if (leg.symbol && wrapped.has(leg.symbol.toUpperCase())) return true
  const set = QUOTE_CONTRACTS[chain]
  return set ? set.has(leg.contract.toLowerCase()) : false
}

interface TokenRefWithCoingecko { ref: TokenRef; isNative: boolean }

function evmRefForLeg(chain: BacktestChain, leg: NetLeg): TokenRefWithCoingecko {
  if (leg.contract === null) {
    return { ref: { kind: 'coin_id', id: NATIVE_COINGECKO[chain] }, isNative: true }
  }
  return { ref: { kind: 'contract', chain, contract: leg.contract }, isNative: false }
}

// ─── Engine ──────────────────────────────────────────────────────────────
interface PortfolioState {
  cash_usd: number
  // Holdings keyed by canonical key (contract or native marker).
  holdings: Map<string, { qty: number; cost_basis_usd: number; last_known_price: number; coingecko_ref: TokenRef }>
  fees_paid_usd: number
  closed_positions: Array<{ token_key: string; pnl_usd: number }>
}

function initState(capital: number): PortfolioState {
  return {
    cash_usd: capital,
    holdings: new Map(),
    fees_paid_usd: 0,
    closed_positions: [],
  }
}

function holdingKey(ref: TokenRef): string {
  return ref.kind === 'coin_id' ? `cid:${ref.id}` : `ctr:${ref.chain}:${ref.contract.toLowerCase()}`
}

function applyFee(amountUsd: number, state: PortfolioState): number {
  const fee = amountUsd * (FEE_BPS / 10000)
  state.fees_paid_usd += fee
  return amountUsd - fee
}

function recordEquity(curve: EquityPoint[], state: PortfolioState, ts: string, priceLookups: Map<string, number>) {
  let equity = state.cash_usd
  for (const [key, h] of state.holdings) {
    const px = priceLookups.get(key) ?? h.last_known_price
    equity += h.qty * px
  }
  curve.push({ ts, equity_usd: equity })
}

// ─── Build trade list per chain ──────────────────────────────────────────
async function buildEvmTrades(
  address: string,
  chain: BacktestChain,
  startMs: number,
  endMs: number
): Promise<{ trades: CanonicalTrade[]; warnings: string[] }> {
  const warnings: string[] = []

  // We can't call alchemy with a timestamp range; estimate block range
  // from chain block time and pad by 1 day on each side.
  const blockSec = AVG_BLOCK_SECS[chain]
  const padSec = 86400
  const fromBlock = Math.max(0, Math.floor((startMs / 1000 - padSec) / blockSec) - 0)
  // Simpler & safer: set toBlock = 'latest'; we filter by ts below.
  const transfers = await getEvmTransfers(address, chain, fromBlock, 'latest')

  const inRange = transfers.filter((t) => {
    const tsMs = new Date(t.ts).getTime()
    return tsMs >= startMs && tsMs <= endMs
  })

  const byHash = groupByHash(inRange)
  const trades: CanonicalTrade[] = []

  // Pre-fetch price series for each unique token contract present, so
  // we avoid hammering coingecko once per trade.
  const uniqueRefs = new Map<string, TokenRef>()
  for (const tx of byHash.values()) {
    for (const leg of netLegsForEvmTx(tx)) {
      const r = evmRefForLeg(chain, leg)
      uniqueRefs.set(holdingKey(r.ref), r.ref)
    }
  }
  const seriesByKey = new Map<string, PricePoint[]>()
  for (const [key, ref] of uniqueRefs) {
    try {
      const s = await getSeries(ref, startMs, endMs + 86400000)
      seriesByKey.set(key, s)
    } catch {
      seriesByKey.set(key, [])
    }
  }

  for (const [hash, txTransfers] of byHash) {
    const ts = txTransfers[0].ts
    const tsMs = new Date(ts).getTime()
    const legs = netLegsForEvmTx(txTransfers)
    if (legs.length === 0) continue

    // Two-sided swap: one quote leg + one non-quote leg.
    const quoteLegs = legs.filter((l) => isQuoteEvmLeg(chain, l))
    const tokenLegs = legs.filter((l) => !isQuoteEvmLeg(chain, l))

    if (quoteLegs.length >= 1 && tokenLegs.length >= 1) {
      // Choose the dominant non-quote leg by absolute value.
      // Fall back: process every non-quote leg as a separate BUY/SELL.
      for (const tokenLeg of tokenLegs) {
        const ref = evmRefForLeg(chain, tokenLeg)
        const key = holdingKey(ref.ref)
        const series = seriesByKey.get(key) || []
        const px = priceAt(series, tsMs)
        if (px == null) {
          // Survivorship-aware: leave an unpriceable BUY out (we
          // wouldn't have copied it without a price); for SELL, drop
          // any prior holding to zero so phantom airdrops aren't
          // marked to market.
          if (tokenLeg.net_amount < 0) {
            // selling something we couldn't price → treat as $0 proceeds
            trades.push({
              ts,
              tx_hash: hash,
              action: 'SELL',
              token_symbol: tokenLeg.symbol,
              token_contract: tokenLeg.contract,
              token_coingecko_id: ref.isNative ? NATIVE_COINGECKO[chain] : null,
              qty: Math.abs(tokenLeg.net_amount),
              usd_value: 0,
            })
          }
          continue
        }
        const usdValue = Math.abs(tokenLeg.net_amount) * px
        if (usdValue < DUST_USD) continue
        const action: TradeAction = tokenLeg.net_amount > 0 ? 'BUY' : 'SELL'
        trades.push({
          ts,
          tx_hash: hash,
          action,
          token_symbol: tokenLeg.symbol,
          token_contract: tokenLeg.contract,
          token_coingecko_id: ref.isNative ? NATIVE_COINGECKO[chain] : null,
          qty: Math.abs(tokenLeg.net_amount),
          usd_value: usdValue,
        })
      }
      continue
    }

    // Pure transfers (no swap). Mark TRANSFER_IN at cost basis and
    // TRANSFER_OUT at fair-value. We still need a price to record cost
    // basis; if missing, treat the asset as untracked.
    for (const leg of legs) {
      const ref = evmRefForLeg(chain, leg)
      const series = seriesByKey.get(holdingKey(ref.ref)) || []
      const px = priceAt(series, tsMs)
      if (px == null) continue
      const usdValue = Math.abs(leg.net_amount) * px
      if (usdValue < DUST_USD) continue
      trades.push({
        ts,
        tx_hash: hash,
        action: leg.net_amount > 0 ? 'TRANSFER_IN' : 'TRANSFER_OUT',
        token_symbol: leg.symbol,
        token_contract: leg.contract,
        token_coingecko_id: ref.isNative ? NATIVE_COINGECKO[chain] : null,
        qty: Math.abs(leg.net_amount),
        usd_value: usdValue,
      })
    }
  }

  trades.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

  if (trades.length === 0) {
    warnings.push('No priced trades found in the selected window for this address.')
  }
  return { trades, warnings }
}

async function buildSolTrades(
  address: string,
  startMs: number,
  endMs: number
): Promise<{ trades: CanonicalTrade[]; warnings: string[] }> {
  const warnings: string[] = []
  const swaps = await getSolanaSwaps(address, startMs)
  const inRange = swaps.filter((s) => {
    const tsMs = new Date(s.ts).getTime()
    return tsMs >= startMs && tsMs <= endMs
  })

  // Helius doesn't give us prices; we look up SOL + each mint via
  // CoinGecko. SOL price series is shared across the run.
  const solSeries = await getSeries({ kind: 'coin_id', id: 'solana' }, startMs, endMs + 86400000)
  const mintSeries = new Map<string, PricePoint[]>()
  const mints = new Set<string>()
  for (const s of inRange) {
    if (s.sold_mint) mints.add(s.sold_mint)
    if (s.bought_mint) mints.add(s.bought_mint)
  }
  for (const mint of mints) {
    try {
      const series = await getSeries({ kind: 'contract', chain: 'solana', contract: mint }, startMs, endMs + 86400000)
      mintSeries.set(mint, series)
    } catch {
      mintSeries.set(mint, [])
    }
  }

  const trades: CanonicalTrade[] = []
  for (const s of inRange) {
    const tsMs = new Date(s.ts).getTime()

    // Pricing for sold + bought legs.
    const soldPx = s.sold_mint
      ? priceAt(mintSeries.get(s.sold_mint) || [], tsMs)
      : priceAt(solSeries, tsMs)
    const boughtPx = s.bought_mint
      ? priceAt(mintSeries.get(s.bought_mint) || [], tsMs)
      : priceAt(solSeries, tsMs)

    // SELL leg
    if (s.sold_amount > 0 && soldPx != null) {
      const usd = s.sold_amount * soldPx
      if (usd >= DUST_USD) {
        trades.push({
          ts: s.ts,
          tx_hash: s.signature,
          action: 'SELL',
          token_symbol: s.sold_mint || 'SOL',
          token_contract: s.sold_mint,
          token_coingecko_id: s.sold_mint ? null : 'solana',
          qty: s.sold_amount,
          usd_value: usd,
        })
      }
    }

    // BUY leg
    if (s.bought_amount > 0 && boughtPx != null) {
      const usd = s.bought_amount * boughtPx
      if (usd >= DUST_USD) {
        trades.push({
          ts: s.ts,
          tx_hash: s.signature,
          action: 'BUY',
          token_symbol: s.bought_mint || 'SOL',
          token_contract: s.bought_mint,
          token_coingecko_id: s.bought_mint ? null : 'solana',
          qty: s.bought_amount,
          usd_value: usd,
        })
      }
    }
  }

  trades.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  if (trades.length === 0) warnings.push('No priced swaps found in the selected window for this Solana address.')
  return { trades, warnings }
}

// ─── Equity replay ───────────────────────────────────────────────────────
async function replay(
  trades: CanonicalTrade[],
  capital: number,
  startMs: number,
  endMs: number,
  chain: BacktestChain
): Promise<{ result: BacktestResult; curve: EquityPoint[] }> {
  const state = initState(capital)
  const curve: EquityPoint[] = []
  curve.push({ ts: new Date(startMs).toISOString(), equity_usd: capital })

  // We need price series for every token the wallet touches so we can
  // mark to market accurately at the end.
  const needed = new Map<string, TokenRef>()
  for (const t of trades) {
    const ref: TokenRef = t.token_coingecko_id
      ? { kind: 'coin_id', id: t.token_coingecko_id }
      : t.token_contract
        ? { kind: 'contract', chain, contract: t.token_contract }
        : { kind: 'coin_id', id: NATIVE_COINGECKO[chain] }
    needed.set(holdingKey(ref), ref)
  }
  const seriesByKey = new Map<string, PricePoint[]>()
  for (const [key, ref] of needed) {
    try {
      seriesByKey.set(key, await getSeries(ref, startMs, endMs + 86400000))
    } catch {
      seriesByKey.set(key, [])
    }
  }

  const lookupKey = (t: CanonicalTrade): { key: string; ref: TokenRef } => {
    const ref: TokenRef = t.token_coingecko_id
      ? { kind: 'coin_id', id: t.token_coingecko_id }
      : t.token_contract
        ? { kind: 'contract', chain, contract: t.token_contract }
        : { kind: 'coin_id', id: NATIVE_COINGECKO[chain] }
    return { key: holdingKey(ref), ref }
  }

  for (const t of trades) {
    if (t.action === 'NOISE') continue
    const tsMs = new Date(t.ts).getTime()
    const { key, ref } = lookupKey(t)

    if (t.action === 'BUY' || t.action === 'TRANSFER_IN') {
      const series = seriesByKey.get(key) || []
      const px = priceAt(series, tsMs) ?? 0
      if (px === 0 && t.action === 'BUY') continue

      let usdToSpend = t.usd_value
      let qtyToReceive = t.qty
      if (t.action === 'BUY') {
        // Scale position if user is cash-constrained.
        if (state.cash_usd <= 0) continue
        if (usdToSpend > state.cash_usd) {
          const scale = state.cash_usd / usdToSpend
          usdToSpend = state.cash_usd
          qtyToReceive = t.qty * scale
        }
        const netReceived = applyFee(usdToSpend, state)
        const effectiveQty = px > 0 ? netReceived / px : qtyToReceive
        state.cash_usd -= usdToSpend
        const cur = state.holdings.get(key)
        if (cur) {
          cur.qty += effectiveQty
          cur.cost_basis_usd += usdToSpend
          cur.last_known_price = px
        } else {
          state.holdings.set(key, {
            qty: effectiveQty,
            cost_basis_usd: usdToSpend,
            last_known_price: px,
            coingecko_ref: ref,
          })
        }
      } else {
        // TRANSFER_IN at cost basis = current FMV (anti-airdrop bias).
        const cur = state.holdings.get(key)
        if (cur) {
          cur.qty += t.qty
          cur.cost_basis_usd += t.usd_value
          cur.last_known_price = px
        } else {
          state.holdings.set(key, {
            qty: t.qty,
            cost_basis_usd: t.usd_value,
            last_known_price: px,
            coingecko_ref: ref,
          })
        }
      }
    } else if (t.action === 'SELL' || t.action === 'TRANSFER_OUT') {
      const cur = state.holdings.get(key)
      if (!cur || cur.qty <= 0) continue
      const series = seriesByKey.get(key) || []
      const px = priceAt(series, tsMs) ?? cur.last_known_price ?? 0
      const qtySold = Math.min(cur.qty, t.qty)
      const grossProceeds = qtySold * px
      const netProceeds = applyFee(grossProceeds, state)
      const costPortion = cur.qty > 0 ? cur.cost_basis_usd * (qtySold / cur.qty) : 0
      const pnl = netProceeds - costPortion
      cur.qty -= qtySold
      cur.cost_basis_usd -= costPortion
      cur.last_known_price = px
      if (t.action === 'SELL') {
        state.cash_usd += netProceeds
      }
      // Record a closed-position pnl whenever we fully exit.
      if (cur.qty <= 1e-12) {
        state.closed_positions.push({ token_key: key, pnl_usd: pnl + costPortion - cur.cost_basis_usd })
        state.closed_positions[state.closed_positions.length - 1].pnl_usd = pnl
      }
    }

    // Snapshot equity using priceAt for each holding at this ts.
    const lookups = new Map<string, number>()
    for (const [k, h] of state.holdings) {
      const s = seriesByKey.get(k) || []
      const px = priceAt(s, tsMs) ?? h.last_known_price ?? 0
      lookups.set(k, px)
    }
    recordEquity(curve, state, t.ts, lookups)
  }

  // Final mark-to-market at endMs.
  const finalLookups = new Map<string, number>()
  for (const [k, h] of state.holdings) {
    const s = seriesByKey.get(k) || []
    const px = priceAt(s, endMs) ?? h.last_known_price ?? 0
    // Survivorship: if a held token has no priced sample at ANY time
    // up to end, mark to zero. priceAt already returns null when ts <
    // first sample; here we additionally treat empty series as zero.
    finalLookups.set(k, s.length === 0 ? 0 : px)
  }
  recordEquity(curve, state, new Date(endMs).toISOString(), finalLookups)

  // ─── Stats ──────────────────────────────────────────────────────────
  const finalEquity = curve[curve.length - 1].equity_usd
  const totalReturnPct = ((finalEquity - capital) / capital) * 100

  // Max drawdown from running peak.
  let peak = curve[0].equity_usd
  let maxDd = 0
  for (const p of curve) {
    if (p.equity_usd > peak) peak = p.equity_usd
    const dd = peak > 0 ? (peak - p.equity_usd) / peak : 0
    if (dd > maxDd) maxDd = dd
  }

  // Daily returns → Sharpe (rf = 0). Bucket curve into daily samples.
  const dailyEquity = bucketDaily(curve)
  const sharpe = annualizedSharpe(dailyEquity)

  // Win rate from closed positions.
  const wins = state.closed_positions.filter((p) => p.pnl_usd > 0).length
  const winRate = state.closed_positions.length > 0
    ? (wins / state.closed_positions.length) * 100
    : 0

  return {
    result: {
      final_equity_usd: round2(finalEquity),
      total_return_pct: round2(totalReturnPct),
      max_drawdown_pct: round2(maxDd * 100),
      win_rate_pct: round2(winRate),
      sharpe: round2(sharpe),
      fees_paid_usd: round2(state.fees_paid_usd),
      trade_count: trades.filter((t) => t.action === 'BUY' || t.action === 'SELL').length,
    },
    curve,
  }
}

function bucketDaily(curve: EquityPoint[]): { ts: number; eq: number }[] {
  const byDay = new Map<number, number>()
  for (const p of curve) {
    const day = Math.floor(new Date(p.ts).getTime() / 86400000)
    byDay.set(day, p.equity_usd) // last point of the day wins
  }
  return [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([ts, eq]) => ({ ts, eq }))
}

function annualizedSharpe(daily: { ts: number; eq: number }[]): number {
  if (daily.length < 2) return 0
  const rets: number[] = []
  for (let i = 1; i < daily.length; i += 1) {
    const prev = daily[i - 1].eq
    const cur = daily[i].eq
    if (prev > 0) rets.push((cur - prev) / prev)
  }
  if (rets.length === 0) return 0
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length
  const sd = Math.sqrt(variance)
  if (sd === 0) return 0
  return (mean / sd) * Math.sqrt(365)
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

// ─── Benchmarks ─────────────────────────────────────────────────────────
async function hodlBenchmark(coinId: string, capital: number, startMs: number, endMs: number): Promise<BenchmarkResult> {
  const series = await getSeries({ kind: 'coin_id', id: coinId }, startMs, endMs + 86400000)
  const startPx = priceAt(series, startMs)
  const endPx = priceAt(series, endMs)
  if (!startPx || !endPx || startPx === 0) {
    return { final_equity_usd: capital, total_return_pct: 0 }
  }
  const qty = capital / startPx
  const finalEquity = qty * endPx
  return {
    final_equity_usd: round2(finalEquity),
    total_return_pct: round2(((finalEquity - capital) / capital) * 100),
  }
}

// ─── Public entrypoint ──────────────────────────────────────────────────
export interface RunBacktestArgs {
  address: string
  chain: BacktestChain
  capital_usd: number
  start_ms: number
  end_ms: number
}

export interface RunBacktestOutput {
  trades_count: number
  equity_curve: EquityPoint[]
  result: BacktestResult
  benchmarks: { btc_hodl: BenchmarkResult; eth_hodl: BenchmarkResult }
  warnings: string[]
}

export async function runBacktest(args: RunBacktestArgs): Promise<RunBacktestOutput> {
  const { address, chain, capital_usd, start_ms, end_ms } = args
  const warnings: string[] = []

  let trades: CanonicalTrade[] = []
  if (chain === 'ethereum' || chain === 'polygon') {
    const r = await buildEvmTrades(address, chain, start_ms, end_ms)
    trades = r.trades
    warnings.push(...r.warnings)
  } else if (chain === 'solana') {
    const r = await buildSolTrades(address, start_ms, end_ms)
    trades = r.trades
    warnings.push(...r.warnings)
  }

  const { result, curve } = await replay(trades, capital_usd, start_ms, end_ms, chain)

  const [btc, eth] = await Promise.all([
    hodlBenchmark('bitcoin', capital_usd, start_ms, end_ms),
    hodlBenchmark('ethereum', capital_usd, start_ms, end_ms),
  ])

  return {
    trades_count: trades.length,
    equity_curve: curve,
    result,
    benchmarks: { btc_hodl: btc, eth_hodl: eth },
    warnings,
  }
}
