/**
 * One plain-English line under every feed row: "why it matters". Fixed
 * templates from the transfer's labels — never an LLM call, never advice.
 * Exchange wording follows the Prompt 1 memo: deposit → hot wallet is a
 * routine sweep; cold → hot is a refill for withdrawals; hot → hot stays on
 * the exchange; into an exchange deposit is often about to be traded; out of
 * an exchange is a withdrawal.
 */
const EXCHANGE_RE = /\b(binance|coinbase|okx|bybit|kraken|kucoin|bitfinex|bitget|gate\.?io|htx|huobi|mexc|crypto\.com|bitstamp|gemini|upbit|bithumb|robinhood|exchange|hot wallet|cold wallet|deposit)\b/i

export interface MoveLike {
  direction?: 'in' | 'out' | null
  usd?: number | null
  from_label?: string | null
  to_label?: string | null
  isFollowedWallet?: boolean
}

function isExchange(label?: string | null): boolean {
  return !!label && EXCHANGE_RE.test(label)
}

export function whyItMatters(m: MoveLike): string {
  const from = m.from_label || ''
  const to = m.to_label || ''
  const fromEx = isExchange(from)
  const toEx = isExchange(to)
  if (/deposit/i.test(from) && /hot/i.test(to)) return 'Routine exchange housekeeping: customer deposits are swept into one hot wallet.'
  if (/cold/i.test(from) && /hot/i.test(to)) return 'The exchange is refilling its hot wallet, usually to cover withdrawals.'
  if (fromEx && toEx) return 'The coins stayed on the exchange: a move between its own wallets, not a trade.'
  if (toEx) return 'Coins sent to an exchange are often about to be traded, but not always.'
  if (fromEx) return 'A withdrawal from an exchange: the coins left the exchange for a private wallet.'
  if (m.isFollowedWallet) {
    const size = Math.abs(Number(m.usd) || 0)
    return size >= 1_000_000 ? 'A seven-figure move by a wallet you follow.' : 'A wallet you follow moved; small, but it is one you chose to watch.'
  }
  return 'A large transfer between two wallets; the tape shows the move, not the reason.'
}
