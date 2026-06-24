// Wallet backtest types — shared between engine, fetchers, and API.
//
// CanonicalTrade is the normalized representation of a single on-chain
// economic event we choose to replay. Anything we can't price (or
// classify) becomes a NOISE / TRANSFER row that the engine ignores.

export type BacktestChain = 'ethereum' | 'polygon' | 'solana'

export type TradeAction =
  | 'BUY'
  | 'SELL'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'NOISE'

export interface CanonicalTrade {
  ts: string                  // ISO timestamp
  tx_hash: string
  action: TradeAction
  // For BUY/SELL: the *traded* (non-quote) token is recorded here.
  // For BUY:  qty_in  = amount of `token` received, usd_value = USD spent.
  // For SELL: qty_out = amount of `token` sold,     usd_value = USD received.
  token_symbol: string | null
  token_contract: string | null   // null for native (ETH/SOL/MATIC)
  token_coingecko_id: string | null
  qty: number                 // signed for clarity: positive on BUY, positive on SELL
  usd_value: number           // dollar size of the leg at trade time
  // Free-form notes for debugging (counterparty type, original raw row).
  raw?: any
}

export interface EquityPoint {
  ts: string                  // ISO
  equity_usd: number
}

export interface BacktestResult {
  final_equity_usd: number
  total_return_pct: number
  max_drawdown_pct: number
  win_rate_pct: number
  sharpe: number              // annualized from daily returns
  fees_paid_usd: number
  trade_count: number
}

export interface BenchmarkResult {
  final_equity_usd: number
  total_return_pct: number
}

// Market-maker / exchange-routing assessment for a wallet. When a wallet's
// tracked activity is mostly CEX deposits/withdrawals, a copy-trade backtest
// is not meaningful and the UI surfaces a caveat from this.
export interface CexRoutingInfo {
  is_cex_router: boolean
  venue: string | null            // dominant exchange brand, e.g. 'Binance'
  top_counterparty_pct: number    // % of tracked volume via the single top counterparty
  sell_to_cex_pct: number         // % of SELL volume deposited into exchanges
  deposits_usd: number            // volume sent to exchanges (sells into CEX)
  withdrawals_usd: number         // volume received from exchanges (buys from CEX)
}

export interface BacktestResponse {
  address: string
  chain: BacktestChain
  capital_usd: number
  start: string               // ISO
  end: string                 // ISO
  trades_count: number
  equity_curve: EquityPoint[]
  result: BacktestResult
  benchmarks: {
    btc_hodl: BenchmarkResult
    eth_hodl: BenchmarkResult
  }
  computed_in_ms: number
  cache_hit: boolean
  warnings: string[]
  cex_routing?: CexRoutingInfo | null
}
