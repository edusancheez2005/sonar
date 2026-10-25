/**
 * Following wallets — the one write path behind the wallet tracker's Follow
 * button, the famous-wallet picker and ORCA ("track 0x…", "follow MrBeast").
 * Rows live in wallet_follows (what the Personal page, the hourly poller and
 * the daily digest read). One wallet, one follow: any stored spelling of an
 * address (checksummed vs lower-case) counts as the same follow.
 */
import { addressVariants, canonicalAddress } from '@/lib/wallet/addressVariants'

type Client = { from: (table: string) => any }

export interface FollowResult {
  ok: boolean
  address: string
  created: boolean
  nickname?: string | null
  error?: string
}

export async function followWallet(sb: Client, userId: string, address: string, nickname: string | null = null): Promise<FollowResult> {
  const raw = String(address || '').trim()
  if (!raw) return { ok: false, address: raw, created: false, error: 'invalid_address' }
  const canon = canonicalAddress(raw)
  const { data: existing } = await sb
    .from('wallet_follows')
    .select('address, nickname')
    .eq('user_id', userId)
    .in('address', addressVariants(raw))
    .limit(1)
  if (Array.isArray(existing) && existing.length > 0) {
    return { ok: true, address: existing[0].address, created: false, nickname: existing[0].nickname ?? null }
  }
  const { error } = await sb
    .from('wallet_follows')
    .upsert({ user_id: userId, address: canon, nickname }, { onConflict: 'user_id,address' })
  if (error) return { ok: false, address: canon, created: false, error: String(error.message || 'write_failed') }
  return { ok: true, address: canon, created: true, nickname }
}

/**
 * Unfollow addresses (any spelling). With removeAlerts, the user's
 * wallet_activity rules on those addresses go too: "stop following X" means
 * stop hearing about X.
 */
export async function unfollowWallets(
  sb: Client,
  userId: string,
  addresses: string[],
  opts: { removeAlerts?: boolean } = {}
): Promise<{ ok: boolean; removed: number; alertsRemoved: number; error?: string }> {
  const variants = [...new Set(addresses.flatMap((a) => addressVariants(String(a || '').trim())).filter(Boolean))]
  if (variants.length === 0) return { ok: false, removed: 0, alertsRemoved: 0, error: 'invalid_address' }
  const { data: removedRows, error } = await sb
    .from('wallet_follows')
    .delete()
    .eq('user_id', userId)
    .in('address', variants)
    .select('address')
  if (error) return { ok: false, removed: 0, alertsRemoved: 0, error: String(error.message || 'write_failed') }
  let alertsRemoved = 0
  if (opts.removeAlerts) {
    try {
      const { data: gone } = await sb
        .from('user_alerts')
        .delete()
        .eq('user_id', userId)
        .eq('kind', 'wallet_activity')
        .in('address', variants)
        .select('id')
      alertsRemoved = Array.isArray(gone) ? gone.length : 0
    } catch { /* the unfollow stands */ }
  }
  return { ok: true, removed: Array.isArray(removedRows) ? removedRows.length : 0, alertsRemoved }
}
