// Map wrapped/derivative tokens to their canonical symbol used in
// `all_whale_transactions.token_symbol`. Conservative on purpose — only
// aliases where the underlying exposure is unambiguous.
const ALIASES: Record<string, string> = {
  WETH: 'ETH',
  STETH: 'ETH',
  WSTETH: 'ETH',
  RETH: 'ETH',
  CBETH: 'ETH',
  WBTC: 'BTC',
  CBBTC: 'BTC',
  TBTC: 'BTC',
  WSOL: 'SOL',
  JITOSOL: 'SOL',
  MSOL: 'SOL',
  BSOL: 'SOL',
  WMATIC: 'MATIC',
  WAVAX: 'AVAX',
  WBNB: 'BNB',
}

export function canonicalSymbol(symbol: string | null | undefined): string | null {
  if (!symbol) return null
  const up = String(symbol).trim().toUpperCase()
  return ALIASES[up] || up
}

export function canonicalSymbolList(symbols: Array<string | null | undefined>): string[] {
  const out = new Set<string>()
  for (const s of symbols) {
    const c = canonicalSymbol(s)
    if (c) out.add(c)
  }
  return Array.from(out)
}

// Reverse index: canonical symbol → every symbol that maps to it.
const VARIANTS: Record<string, string[]> = {}
for (const [wrapped, canonical] of Object.entries(ALIASES)) {
  ;(VARIANTS[canonical] ||= [canonical]).push(wrapped)
}

/**
 * All `token_symbol` values that represent the same underlying exposure as
 * `symbol`, including itself. `all_whale_transactions` stores wrapped symbols
 * as-is (there are zero ETH/BTC rows — only WETH/WBTC/…), so any per-ticker
 * read of that table must query the full variant list or it silently returns
 * "no whale activity" for the majors.
 */
export function symbolVariants(symbol: string | null | undefined): string[] {
  const c = canonicalSymbol(symbol)
  if (!c) return []
  return VARIANTS[c] ? [...VARIANTS[c]] : [c]
}
