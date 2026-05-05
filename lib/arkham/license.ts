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

/** Hard monthly ceiling enforced by Arkham (Starter). */
export const ARKHAM_MONTHLY_BUDGET = 10_000;

/**
 * Soft guard ceiling. Once `arkham_quota_month.projected_month_end`
 * exceeds this, the client refuses new outbound calls. Leaves a
 * 500-credit buffer for ORCA spikes / health checks.
 */
export const ARKHAM_BUDGET_GUARD = 9_500;

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
