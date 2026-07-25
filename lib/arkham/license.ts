/**
 * Arkham Intelligence — license / commercial-use guard.
 *
 * The Starter tier ($1,500/mo, 10,000 credits) explicitly excludes
 * commercial use. We must NOT paywall ARKM-derived data while this
 * constant is false. When we upgrade to a commercial tier, flip this
 * single boolean and PremiumGate-related code paths unlock.
 */
export const ARKHAM_COMMERCIAL_USE = false;

/**
 * Master kill switch. Flip ARKHAM_ENABLED=false in env (or remove the var)
 * to make the client refuse ALL outbound calls. Existing rows in
 * arkham_cache and tracked_address_universe remain readable; only network
 * fetches are blocked. Use this when cancelling the Arkham subscription so
 * the codebase keeps compiling without burning credits on retries.
 */
export const ARKHAM_ENABLED =
  (process.env.ARKHAM_ENABLED ?? 'false').toLowerCase() === 'true';

/**
 * Arkham meters TWO things, and we had them conflated (2026-07-25 audit):
 *
 * 1. CREDITS — 1,000,000 on the Individual Trial (docs: guides/
 *    credit-pricing.md; paid tiers are usage-billed/unlimited). Our real
 *    30-day burn was 14,126, so credits are effectively not a constraint.
 *    Ground truth is the FREE /analytics/endpoint-calls endpoint.
 * 2. LABEL LOOKUPS — 10,000 per billing period on the trial. THIS is the
 *    scarce resource: every address the intelligence endpoints resolve
 *    consumes one. Live meter: FREE /subscription/intel-usage
 *    ({totalCount, totalLimit}, period starts the 1st, ~1 min lag).
 *
 * The old constants treated 10,000 as the CREDIT budget, which throttled
 * the balances cron to every-3-nights over ~310 "credits" that were never
 * scarce, while leaving 96%+ of the real allowances unused.
 */
export const ARKHAM_MONTHLY_BUDGET = 1_000_000;

/**
 * Soft guard ceiling on projected month-end CREDITS. Generous headroom —
 * this exists to catch a runaway loop, not to ration normal use.
 */
export const ARKHAM_BUDGET_GUARD = 900_000;

/** Trial label-lookup allowance per billing period (resets the 1st). */
export const ARKHAM_LABEL_LOOKUP_LIMIT = 10_000;

/**
 * Stop bulk label harvesting once /subscription/intel-usage totalCount
 * reaches this — keeps a buffer for organic ORCA/cron intelligence calls
 * for the rest of the period.
 */
export const ARKHAM_LABEL_LOOKUP_GUARD = 9_300;

export type CommercialUsage = 'paywall' | 'resale' | 'export' | 'reseller_api';

/**
 * Throws if the caller is about to do something that requires a
 * commercial tier. Use at the boundary of any paywall / export route.
 */
export function assertNonCommercialOk(usage: CommercialUsage): void {
  if (!ARKHAM_COMMERCIAL_USE) {
    throw new Error(
      `ARKM commercial use disabled — cannot use for: ${usage}. Upgrade plan first.`
    );
  }
}
