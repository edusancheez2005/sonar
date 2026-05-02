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
