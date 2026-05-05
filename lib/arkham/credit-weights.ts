/**
 * Per-endpoint credit weights.
 *
 * Probe (2026-05-05) confirmed Arkham returns NO `x-credit-*` /
 * `x-ratelimit-*` headers, so we cannot read true cost per call from
 * responses. We assume:
 *   - 1 credit per "standard" call
 *   - 1 credit per "HEAVY" call (no evidence yet that heavy costs more,
 *     just that it's rate-limited to 1/sec instead of 20/sec)
 *
 * Update this table if Arkham publishes credit pricing or if our actual
 * monthly burn diverges from the projection in arkham_quota_month.
 */

/** Path substrings that indicate the 1-rps "HEAVY" rate limit. */
export const HEAVY_PATTERNS: readonly string[] = [
  '/transfers',
  '/swaps',
  '/counterparties/',
  '/token/top_flow/',
  '/token/volume/',
];

export function isHeavy(path: string): boolean {
  return HEAVY_PATTERNS.some((p) => path.includes(p));
}

/** Returns the credit cost we will charge to our budget. */
export function creditWeight(_path: string): number {
  return 1;
}
