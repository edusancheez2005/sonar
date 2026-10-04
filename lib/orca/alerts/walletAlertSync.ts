/**
 * Keep legacy wallet_alerts and their folded user_alerts rule in step.
 * =============================================================================
 * wallet_alerts rows are what the wallet page's "Set alert" modal and the
 * profile alert list show and edit; runCheckUserAlerts folds them into ONE
 * wallet_activity rule per (user, address), which is what fires. Without this
 * sync, deleting on one side left the other firing or brought it back.
 *
 *   syncFoldedWalletRule — after a wallet_alerts create/edit/delete: recompute
 *     the rule from the user's active rows for that address (most permissive
 *     floor), or delete the rule when none are left.
 *   retireWalletAlertsFor — after the folded rule is deleted in the Alerts
 *     tab: deactivate the legacy rows so the fold does not recreate it.
 */
import { normaliseAddress } from '@/lib/orca/alerts/validate'
import { addressVariants, EVM_ADDRESS_RE } from '@/lib/wallet/addressVariants'
import { mergeWalletAlertRows, type WalletAlertRow } from '@/lib/orca/alerts/runCheckUserAlerts'

/**
 * Match an address column in any stored spelling. EVM hex is matched with a
 * case-insensitive equality (ilike without wildcards — hex has no % or _);
 * base58 addresses are case-sensitive and matched exactly.
 */
function whereAddress(query: any, address: string): any {
  return EVM_ADDRESS_RE.test(address) ? query.ilike('address', address) : query.in('address', addressVariants(address))
}

type SupabaseLike = { from: (table: string) => any }

export async function syncFoldedWalletRule(
  supabase: SupabaseLike,
  userId: string,
  rawAddress: unknown,
  opts: { enable?: boolean } = {}
): Promise<'updated' | 'created' | 'deleted' | 'noop'> {
  const address = normaliseAddress(rawAddress)
  if (!address || !userId) return 'noop'
  try {
    const { data: rows } = await whereAddress(
      supabase
        .from('wallet_alerts')
        .select('id, user_id, address, chain, alert_type, min_usd_value, is_active, created_at')
        .eq('user_id', userId)
        .eq('is_active', true),
      address
    )
    const { data: rules } = await whereAddress(
      supabase
        .from('user_alerts')
        .select('id, address')
        .eq('user_id', userId)
        .eq('kind', 'wallet_activity'),
      address
    )
    const existing = (Array.isArray(rules) ? rules : []) as Array<{ id: string; address: string }>
    const merged = mergeWalletAlertRows((Array.isArray(rows) ? rows : []) as WalletAlertRow[])[0]

    if (!merged) {
      if (existing.length === 0) return 'noop'
      await supabase.from('user_alerts').delete().eq('user_id', userId).in('id', existing.map((r) => r.id))
      return 'deleted'
    }
    if (existing.length > 0) {
      await supabase
        .from('user_alerts')
        // The newest explicit wallet-page setting decides the floor; a rule the
        // user switched off in the Alerts tab stays off.
        .update({
          threshold_usd: merged.threshold_usd,
          threshold_pct: null,
          chain: merged.chain,
          updated_at: new Date().toISOString(),
          ...(opts.enable ? { enabled: true } : {}), // only for a newly created wallet-page alert
        })
        .eq('user_id', userId)
        .in('id', existing.map((r) => r.id))
      return 'updated'
    }
    const { error } = await supabase.from('user_alerts').insert(merged)
    return error ? 'noop' : 'created'
  } catch {
    return 'noop' // the 5-minute fold catches up for creates
  }
}

export async function retireWalletAlertsFor(supabase: SupabaseLike, userId: string, rawAddress: unknown): Promise<void> {
  const address = normaliseAddress(rawAddress)
  if (!address || !userId) return
  try {
    await whereAddress(
      supabase.from('wallet_alerts').update({ is_active: false }).eq('user_id', userId),
      address
    )
  } catch {
    /* best-effort */
  }
}
