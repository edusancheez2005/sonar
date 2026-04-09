/**
 * Binance Symbol Mapping
 * Maps token symbols (BTC, ETH) → Binance trading pairs (BTCUSDT)
 * Single source of truth — used by API routes, signal engine, charts
 */

// Symbol → Binance USDT pair
const SYMBOL_TO_PAIR: Record<string, string> = {
  BTC: 'BTCUSDT', ETH: 'ETHUSDT', BNB: 'BNBUSDT', SOL: 'SOLUSDT',
  XRP: 'XRPUSDT', ADA: 'ADAUSDT', DOGE: 'DOGEUSDT', AVAX: 'AVAXUSDT',
  DOT: 'DOTUSDT', MATIC: 'POLUSDT', POL: 'POLUSDT', LINK: 'LINKUSDT',
  UNI: 'UNIUSDT', ATOM: 'ATOMUSDT', LTC: 'LTCUSDT', FIL: 'FILUSDT',
  NEAR: 'NEARUSDT', APT: 'APTUSDT', ARB: 'ARBUSDT', OP: 'OPUSDT',
  AAVE: 'AAVEUSDT', MKR: 'MKRUSDT', CRV: 'CRVUSDT', SNX: 'SNXUSDT',
  COMP: 'COMPUSDT', SUSHI: 'SUSHIUSDT', ALGO: 'ALGOUSDT', FTM: 'FTMUSDT',
  SAND: 'SANDUSDT', MANA: 'MANAUSDT', AXS: 'AXSUSDT', GRT: 'GRTUSDT',
  SHIB: 'SHIBUSDT', PEPE: 'PEPEUSDT', WLD: 'WLDUSDT', SUI: 'SUIUSDT',
  SEI: 'SEIUSDT', TIA: 'TIAUSDT', INJ: 'INJUSDT', STX: 'STXUSDT',
  IMX: 'IMXUSDT', RENDER: 'RENDERUSDT', FET: 'FETUSDT', RNDR: 'RNDRUSDT',
  JUP: 'JUPUSDT', WIF: 'WIFUSDT', BONK: 'BONKUSDT', FLOKI: 'FLOKIUSDT',
  JASMY: 'JASMYUSDT', ENA: 'ENAUSDT', PENDLE: 'PENDLEUSDT', TAO: 'TAOUSDT',
  ONDO: 'ONDOUSDT', TRX: 'TRXUSDT', TON: 'TONUSDT', ETC: 'ETCUSDT',
  XLM: 'XLMUSDT', HBAR: 'HBARUSDT', VET: 'VETUSDT', ICP: 'ICPUSDT',
  THETA: 'THETAUSDT', RUNE: 'RUNEUSDT', ENS: 'ENSUSDT',
  // Wrapped tokens — not on Binance directly, use base asset
  WBTC: 'BTCUSDT', WETH: 'ETHUSDT',
}

// Reverse: Binance pair → symbol
const PAIR_TO_SYMBOL: Record<string, string> = {}
for (const [sym, pair] of Object.entries(SYMBOL_TO_PAIR)) {
  if (!PAIR_TO_SYMBOL[pair]) PAIR_TO_SYMBOL[pair] = sym
}

// Futures pairs (subset that have USDT-M futures)
const FUTURES_PAIRS = new Set([
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT',
  'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT', 'UNIUSDT', 'ATOMUSDT',
  'LTCUSDT', 'FILUSDT', 'NEARUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT',
  'AAVEUSDT', 'MKRUSDT', 'SUSHIUSDT', 'FTMUSDT', 'GRTUSDT', 'INJUSDT',
  'SUIUSDT', 'SEIUSDT', 'TIAUSDT', 'FETUSDT', 'PEPEUSDT', 'WLDUSDT',
  'BONKUSDT', 'WIFUSDT', 'ENAUSDT', 'PENDLEUSDT', 'TAOUSDT', 'ONDOUSDT',
  'TRXUSDT', 'TONUSDT', 'ETCUSDT', 'ICPUSDT', 'RENDERUSDT',
])

/**
 * Convert token symbol to Binance trading pair
 * Returns null if token isn't on Binance
 */
export function symbolToPair(symbol: string): string | null {
  return SYMBOL_TO_PAIR[symbol.toUpperCase()] || null
}

/**
 * Convert Binance pair back to token symbol
 */
export function pairToSymbol(pair: string): string | null {
  return PAIR_TO_SYMBOL[pair.toUpperCase()] || null
}

/**
 * Check if a token has Binance futures
 */
export function hasFutures(symbol: string): boolean {
  const pair = symbolToPair(symbol)
  return pair ? FUTURES_PAIRS.has(pair) : false
}

/**
 * Get all tracked Binance pairs (for batch fetches)
 */
export function getAllPairs(): string[] {
  return [...new Set(Object.values(SYMBOL_TO_PAIR))]
}

/**
 * Get all tracked symbols
 */
export function getAllSymbols(): string[] {
  return Object.keys(SYMBOL_TO_PAIR)
}

/**
 * Map days to appropriate kline interval
 * Tries to return ~200-500 candles for good chart resolution
 */
export function daysToInterval(days: number): string {
  if (days <= 1) return '5m'      // 288 candles
  if (days <= 3) return '15m'     // 288 candles
  if (days <= 7) return '1h'      // 168 candles
  if (days <= 30) return '4h'     // 180 candles
  if (days <= 90) return '12h'    // 180 candles
  if (days <= 180) return '1d'    // 180 candles
  return '1d'                     // 365 candles
}

/**
 * Map days to appropriate OHLC interval
 * CoinGecko OHLC was: 1-2d → 30m, 3-30d → 4h, 31+ → 4d
 * We match similar granularity from Binance klines
 */
export function daysToOhlcInterval(days: number): string {
  if (days <= 2) return '30m'     // matches CoinGecko
  if (days <= 30) return '4h'     // matches CoinGecko
  if (days <= 90) return '12h'
  return '1d'
}
