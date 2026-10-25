/**
 * "Send me a test": one inbox row marked payload.test so the user sees where
 * alerts land. Capped at TEST_ALERTS_PER_HOUR; the alert cron and the email
 * digest ignore these rows (they never count against caps, never emailed).
 * Shared by POST /api/personal/alerts/test and ORCA.
 */
type Client = { from: (table: string) => any }

export const TEST_ALERTS_PER_HOUR = 3

export async function sendTestAlert(sb: Client, userId: string, now = Date.now()): Promise<{ ok: boolean; id?: number | null; error?: 'test_limit' | string }> {
  const since = new Date(now - 3_600_000).toISOString()
  const { count } = await sb
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('payload->>test', 'true')
    .gte('created_at', since)
  if ((count ?? 0) >= TEST_ALERTS_PER_HOUR) return { ok: false, error: 'test_limit' }
  const stamp = new Date(now).toISOString()
  const { data, error } = await sb
    .from('user_notifications')
    .insert({
      user_id: userId,
      rule_id: null,
      kind: 'price_move',
      ticker: 'BTC',
      title: 'Test alert',
      body: 'This is a test. Your real alerts arrive here, in the bell, the same way.',
      payload: { test: true },
      dedup_hour: stamp,
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: String(error.message || 'write_failed') }
  return { ok: true, id: data?.id ?? null }
}
