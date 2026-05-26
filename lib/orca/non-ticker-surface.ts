/**
 * non-ticker-surface
 * =============================================================================
 * Stage A fix (2026-05-26) for ORCA chat routing.
 *
 * The legacy ticker extractor (lib/orca/ticker-extractor.ts) maps the
 * substring "0x" to ZRX, "uni" to UNI, "op" to OP, etc. When the user
 * pastes an Ethereum address ("0x28C6c0...") or an article URL, the
 * extractor produces a false-positive ticker hit which prevents the
 * Stage A intent router from ever firing.
 *
 * This helper detects those non-ticker surfaces (addresses, URLs, base58
 * strings) so the route handler can suppress the extractor's false guess
 * and let the LLM router decide if the message is a wallet_lookup,
 * article_explain, data_query, etc.
 *
 * Pure function — no IO, easy to unit test.
 */
export function hasNonTickerSurface(message: string): boolean {
  if (typeof message !== 'string' || message.length === 0) return false
  // Ethereum / EVM address (most common, full 40-hex form)
  if (/0x[a-fA-F0-9]{40}\b/.test(message)) return true
  // Abbreviated EVM address with ellipsis: "0x28C6...d60", "0x28C6…d60".
  // 2026-05-26 regression: users paste truncated addresses copied from
  // block explorers / our own UI; the ticker extractor maps the bare
  // "0x" to ZRX and short-circuits Stage A. Detect ascii or unicode
  // ellipsis between hex groups.
  if (/0x[a-fA-F0-9]{2,}(?:\.{2,}|\u2026)[a-fA-F0-9]*/.test(message)) return true
  // Explicit "wallet 0x..." / "address 0x..." / "holder 0x..." — even when
  // the hex tail is short or partially elided, the keyword signals intent.
  if (/\b(?:wallet|address|holder|account|owner)\b[^.\n]{0,30}0x[a-fA-F0-9]+/i.test(message)) return true
  // Bare http(s) URL (article / tweet links)
  if (/\bhttps?:\/\/\S+/i.test(message)) return true
  // Tron address
  if (/\bT[A-Za-z0-9]{33}\b/.test(message)) return true
  // Bitcoin address (legacy or bech32)
  if (/\b(bc1[a-z0-9]{20,90}|[13][A-HJ-NP-Za-km-z1-9]{25,39})\b/.test(message)) return true
  // Solana / base58 address — require 32+ chars to avoid ticker collisions.
  if (/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/.test(message)) return true
  // XRP address
  if (/\br[A-Za-z0-9]{24,34}\b/.test(message)) return true
  return false
}
