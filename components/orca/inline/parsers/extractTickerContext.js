// Walk a paragraph (and optional prior paragraphs) for the dominant ticker.
// Recognises forms: $BTC, BTC, bitcoin, btc. Returns uppercase ticker or null.
// Pure + cheap; called once per paragraph and memoised by caller.

const KNOWN_TICKERS = new Set([
  'BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'TRX', 'TON', 'AVAX',
  'LINK', 'DOT', 'MATIC', 'POL', 'NEAR', 'LTC', 'BCH', 'ATOM', 'UNI', 'APT',
  'ARB', 'OP', 'SUI', 'SEI', 'PEPE', 'SHIB', 'WIF', 'BONK', 'HYPE', 'INJ',
  'AAVE', 'MKR', 'CRV', 'LDO', 'RNDR', 'FET', 'TAO', 'JTO', 'JUP', 'PYTH',
])

const NAME_TO_TICKER = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', ripple: 'XRP', cardano: 'ADA',
  dogecoin: 'DOGE', tron: 'TRX', toncoin: 'TON', avalanche: 'AVAX', polygon: 'POL',
  chainlink: 'LINK', polkadot: 'DOT', litecoin: 'LTC', cosmos: 'ATOM',
  uniswap: 'UNI', aptos: 'APT', arbitrum: 'ARB', optimism: 'OP', sui: 'SUI',
}

export function extractTickerContext(paragraph) {
  if (!paragraph || typeof paragraph !== 'string') return null
  const counts = new Map()
  const bump = (t) => counts.set(t, (counts.get(t) || 0) + 1)

  // $TICKER form first (strongest signal)
  const dollarRe = /\$([A-Z]{2,6})\b/g
  let m
  while ((m = dollarRe.exec(paragraph)) !== null) {
    const t = m[1].toUpperCase()
    if (KNOWN_TICKERS.has(t)) bump(t)
  }
  // Bare TICKER words
  const wordRe = /\b([A-Z]{2,6})\b/g
  while ((m = wordRe.exec(paragraph)) !== null) {
    const t = m[1].toUpperCase()
    if (KNOWN_TICKERS.has(t)) bump(t)
  }
  // Names (case-insensitive)
  const lower = paragraph.toLowerCase()
  for (const [name, t] of Object.entries(NAME_TO_TICKER)) {
    if (lower.includes(name)) bump(t)
  }

  if (counts.size === 0) return null
  let best = null
  let bestCount = 0
  for (const [t, c] of counts) {
    if (c > bestCount) { best = t; bestCount = c }
  }
  return best
}
