/**
 * Short-lived app_cache read-through for the Frontier APIs.
 * The page polls every 15-60s per viewer; the underlying per-address reads
 * are ~190 queries, so each route stores its finished payload for a short TTL
 * and every instance/viewer within that window gets the stored copy.
 */
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function cachedPayload(key, ttlMs, compute) {
  try {
    const { data } = await supabaseAdmin.from('app_cache').select('value, updated_at').eq('key', key).maybeSingle()
    const age = data?.updated_at ? Date.now() - Date.parse(data.updated_at) : NaN
    if (data?.value && Number.isFinite(age) && age < ttlMs) return { payload: data.value, cached: true, ageMs: age }
  } catch { /* fall through to compute */ }
  const payload = await compute()
  try {
    await supabaseAdmin.from('app_cache').upsert({ key, value: payload, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  } catch { /* best effort */ }
  return { payload, cached: false, ageMs: 0 }
}
