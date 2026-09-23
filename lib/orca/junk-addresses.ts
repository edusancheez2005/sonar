/**
 * Addresses whose rows are classifier noise and must never surface in
 * user-facing "biggest buyers/sellers" lists or X posts. The vanity
 * contract below receives ~$300M of WBTC hourly and every row is written as
 * a high-confidence BUY (ORCA audit 2026-07-19, issue #1) — the 2026-09-22
 * battery showed it filling all five "biggest BTC buyer" slots.
 * Ingestion-side fix pending; this is the read-side guard.
 */
export const JUNK_ADDRESSES = new Set<string>([
  '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
])

export function isJunkAddress(address: string | null | undefined): boolean {
  return !!address && JUNK_ADDRESSES.has(String(address).toLowerCase())
}
