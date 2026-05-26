/**
 * Stage C — context-aware suggestion chips for the new /ai page.
 *
 * Pure function. No side effects. The caller resolves any URL params or
 * other deep-link context, hands us a `{ ticker?, wallet? }` object, and
 * we return a small list of suggested prompts. Order matters — the first
 * chip is shown most prominently.
 *
 * Defaults are intentionally neutral and information-oriented (per ORCA
 * HARD RULES — no buy/sell framing).
 */

export interface ChipContext {
  ticker?: string | null
  wallet?: string | null
}

export interface Chip {
  /** Short label shown on the chip. */
  label: string
  /** Full prompt sent to /api/chat when the chip is clicked. */
  prompt: string
}

function looksLikeAddress(s: string): boolean {
  // EVM 0x… or Solana-ish base58. We accept both shapes and let the
  // server/router sort it out; this is just to decide "is this an
  // address?" for chip purposes.
  if (/^0x[0-9a-fA-F]{40}$/.test(s)) return true
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return true
  return false
}

function shortenAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function getSuggestedChips(ctx: ChipContext = {}): Chip[] {
  const ticker = (ctx.ticker || '').trim().toUpperCase().replace(/^\$/, '') || null
  const wallet = (ctx.wallet || '').trim() || null

  if (ticker && /^[A-Z0-9._-]{1,12}$/.test(ticker)) {
    return [
      { label: `Why did $${ticker} move today?`, prompt: `Why did $${ticker} move today?` },
      { label: `Whale flow on $${ticker}`, prompt: `What does whale flow on $${ticker} look like over the last 24h and 7d?` },
      { label: `News driving $${ticker}`, prompt: `What recent news is driving $${ticker}?` },
      { label: `Add $${ticker} to my watchlist`, prompt: `Add ${ticker} to my watchlist` },
    ]
  }

  if (wallet && looksLikeAddress(wallet)) {
    const short = shortenAddress(wallet)
    return [
      { label: `What is ${short} doing?`, prompt: `What is the wallet ${wallet} doing?` },
      { label: `Is ${short} smart money?`, prompt: `Is the wallet ${wallet} considered smart money?` },
      { label: `Recent counterparties`, prompt: `Who are the recent counterparties of wallet ${wallet}?` },
    ]
  }

  return [
    { label: 'What changed in macro today?', prompt: 'What changed in crypto macro today?' },
    { label: 'Top whale moves this week', prompt: 'What are the top whale moves this week?' },
    { label: 'Hot tokens by social momentum', prompt: 'Which tokens are hot right now by social momentum?' },
  ]
}
