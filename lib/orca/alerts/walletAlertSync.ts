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
import { addressVariants } from '@/lib/orca/alerts/evaluators'
import { mergeWalletAlertRows, type WalletAlertRow } from '@/lib/orca/alerts/runCheckUserAlerts'

type SupabaseLike = { from: (table: string) => any }

export async function syncFoldedWalletRule(
  supabase: SupabaseLike,
  userId: string,
  rawAddress: unknown
): Promise<'updated' | 'created' | 'deleted' | 'noop'> {
  const address = normaliseAddress(rawAddress)
  if (!address || !userId) return 'noop'
  const variants = addressVariants(address)
  try {
    const { data: rows } = await supabase
      .from('wallet_alerts')
      .select('id, user_id, address, chain, alert_type, min_usd_value, is_active, created_at')
      .eq('user_id', userId)
      .in('address', variants)
      .eq('is_active', true)
    const { data: rules } = await supabase
      .from('user_alerts')
      .select('id, address')
      .eq('user_id', userId)
      .eq('kind', 'wallet_activity')
      .in('address', variants)
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
        .update({ threshold_usd: merged.threshold_usd, threshold_pct: null, chain: merged.chain, enabled: true, updated_at: new Date().toISOString() })
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
    await supabase
      .from('wallet_alerts')
      .update({ is_active: false })
      .eq('user_id', userId)
      .in('address', addressVariants(address))
  } catch {
    /* best-effort */
  }
}
