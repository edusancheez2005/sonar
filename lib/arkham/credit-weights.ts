/**
 * Per-endpoint credit weights.
 *
 * 2026-07-25 recalibration against the official pricing guide
 * (arkm.com/llms/guides/credit-pricing.md) and our own burn read from the
 * FREE /analytics/endpoint-calls endpoint (which is the ground truth —
 * responses still carry no x-credit headers). The old "1 credit per call"
 * assumption undercounted ~45×: 30d actual burn was 14,126 credits while
 * arkham_call_log had logged 312.
 *
 * Verified real costs: /transfers & /swaps bill 2 credits PER ROW (we
 * approximate rows with the limit= query param), /intelligence/search 30,
 * /counterparties 50, /token/holders 30, /token/top 10, /risk 5,
 * /balances/entity ≈7 observed (1,335 credits / 186 calls). Credits are
 * NOT the scarce resource on the trial (1M allowance) — the binding meter
 * is label lookups (see license.ts).
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

/** Per-row endpoints: cost = 2 × rows; we approximate rows by the limit
 * query param (Arkham's default page size when omitted is ~20). */
const PER_ROW_PATTERNS = ['/transfers', '/swaps'] as const;
const DEFAULT_PAGE_ROWS = 20;

const FLAT_WEIGHTS: ReadonlyArray<readonly [pattern: string, credits: number]> = [
  ['/counterparties/', 50],
  ['/intelligence/search', 30],
  ['/token/holders', 30],
  ['/token/top_flow', 10],
  ['/token/top', 10],
  ['/risk/', 5],
  ['/balances/entity/', 7],   // observed 2026-07: 1,335 credits / 186 calls
  ['/balances/', 3],
  ['/portfolio/', 3],
];

/** Returns the credit cost we will charge to our budget. */
export function creditWeight(path: string): number {
  if (PER_ROW_PATTERNS.some((p) => path.includes(p))) {
    const m = path.match(/[?&]limit=(\d+)/);
    const rows = m ? Number(m[1]) : DEFAULT_PAGE_ROWS;
    return 2 * Math.max(1, rows);
  }
  for (const [pattern, credits] of FLAT_WEIGHTS) {
    if (path.includes(pattern)) return credits;
  }
  return 1;
}
