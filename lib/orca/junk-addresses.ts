/**
 * Addresses whose rows are classifier noise: they must never count as whale
 * buying or selling, or surface in "biggest buyers/sellers" lists or X posts.
 *
 * - 0xbbbb…eeffcb is Morpho Blue. Its flash-loan legs (~$100M of WBTC at a
 *   time, under the $150M sanity cap) are written as high-confidence BUYs
 *   (ORCA audit 2026-07-19 issue #1). The 2026-09-22 battery showed it filling
 *   all five "biggest BTC buyer" slots, and the 2026-10-06 real-user audit
 *   traced the cached first answer's "$0.7–1B of whale BTC buying" to it.
 * - 0xba12…f2c8 is the Balancer V2 Vault. Flash-loan repayments into it were
 *   most of the "ETH selling" in the same answers (audit 2026-10-06). A real
 *   swap routed through the Vault is dropped too, which is the accepted cost.
 *
 * Ingestion-side fix pending; this is the read-side guard. Readers must check
 * the whale, sender AND receiver: the Vault is usually the counterparty.
 */
export const JUNK_ADDRESSES = new Set<string>([
  '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb', // Morpho Blue
  '0xba12222222228d8ba445958a75a0704d566bf2c8', // Balancer V2 Vault
])

export function isJunkAddress(address: string | null | undefined): boolean {
  return !!address && JUNK_ADDRESSES.has(String(address).toLowerCase())
}

/** True when the whale, sender or receiver of a whale-tape row is a junk address. */
export function isNoiseRow(
  row: { whale_address?: unknown; from_address?: unknown; to_address?: unknown } | null | undefined
): boolean {
  if (!row) return false
  const s = (v: unknown) => (typeof v === 'string' ? v : null)
  return isJunkAddress(s(row.whale_address)) || isJunkAddress(s(row.from_address)) || isJunkAddress(s(row.to_address))
}

// Labels that mean "an exchange's own wallet" on the whale tape.
const EXCHANGE_LABEL_RE =
  /\b(hot wallet|cold wallet|deposit|exchange|binance|coinbase|okx|bybit|kraken|kucoin|bitfinex|bitget|gate\.?io|htx|huobi|mexc|crypto\.com|bitstamp|gemini|upbit|bithumb|robinhood|bitpanda|poloniex)\b/i

export function isExchangeLabel(label: unknown): boolean {
  return typeof label === 'string' && label.trim() !== '' && EXCHANGE_LABEL_RE.test(label)
}

/**
 * An exchange moving coins between its own wallets (hot → hot, deposit →
 * hot, hot → deposit). The tape has no TRANSFER class in production, so these
 * are written as BUY/SELL: about half the "UNI and ENA whale buying" in a
 * 2026-10-06 sample was hot→hot or deposit→hot. A withdrawal to a user's wallet (only the
 * sender is an exchange) or a deposit from one (only the receiver is) is kept:
 * those are real exchange outflows and inflows.
 */
export function isExchangeInternalRow(row: { from_label?: unknown; to_label?: unknown } | null | undefined): boolean {
  if (!row) return false
  return isExchangeLabel(row.from_label) && isExchangeLabel(row.to_label)
}

/** Rows that are not whale trades: junk/flash-loan addresses or exchange-internal moves. */
export function isNonTradeRow(
  row: { whale_address?: unknown; from_address?: unknown; to_address?: unknown; from_label?: unknown; to_label?: unknown } | null | undefined
): boolean {
  return isNoiseRow(row) || isExchangeInternalRow(row)
}
