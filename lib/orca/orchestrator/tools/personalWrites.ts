/**
 * ORCA writes that mirror the Personal page (2026-10-25): a wallet_activity
 * rule on an address (the follows and famous-wallet follows go through
 * lib/wallet/follows.ts and lib/onboarding/followFamous.js). Same rule shape,
 * cap and upsert key as POST /api/personal/alerts.
 */
import type { SupabaseLike, ToolResult } from '../types'
import { normaliseAddress } from '@/lib/orca/alerts/validate'
import { ruleChainFor } from '@/lib/orca/alerts/runCheckUserAlerts'
import { MAX_ACTIVE_RULES_PER_USER } from '@/lib/orca/alerts/types'

export async function runCreateWalletAlert(
  args: { userId: string; address?: unknown; threshold_usd?: unknown },
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<ToolResult> {
  const fetched_at = now().toISOString()
  const address = normaliseAddress(args.address)
  if (!args.userId || !address) return { ok: false, data: null, source: 'user_alerts', fetched_at, error: 'invalid_address' }
  const usd = Number(args.threshold_usd)
  const threshold_usd = Number.isFinite(usd) && usd > 0 ? Math.round(usd) : null
  try {
    const { data: existing, error: countErr } = await supabase
      .from('user_alerts')
      .select('id, address, kind, enabled')
      .eq('user_id', args.userId)
      .limit(MAX_ACTIVE_RULES_PER_USER + 50)
    if (countErr) return { ok: false, data: null, source: 'user_alerts', fetched_at, error: String(countErr.message || 'write_failed') }
    const rows = (existing ?? []) as Array<{ address: string | null; kind: string; enabled: boolean }>
    const already = rows.some((r) => r.kind === 'wallet_activity' && r.address === address)
    if (!already && rows.filter((r) => r.enabled).length >= MAX_ACTIVE_RULES_PER_USER) {
      return { ok: false, data: null, source: 'user_alerts', fetched_at, error: 'rule_limit_reached' }
    }
    const { error } = await supabase
      .from('user_alerts')
      .upsert(
        {
          user_id: args.userId,
          kind: 'wallet_activity',
          ticker: null,
          address,
          chain: ruleChainFor(address),
          threshold_pct: null,
          threshold_usd,
          enabled: true,
          updated_at: fetched_at,
        },
        { onConflict: 'user_id,address,kind' }
      )
    if (error) return { ok: false, data: null, source: 'user_alerts', fetched_at, error: String(error.message || 'write_failed') }
    return { ok: true, data: { address, threshold_usd }, source: 'user_alerts', fetched_at }
  } catch (err: any) {
    return { ok: false, data: null, source: 'user_alerts', fetched_at, error: err?.message ?? 'write_failed' }
  }
}
