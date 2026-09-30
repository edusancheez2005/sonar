/**
 * Stored token logos (app_cache `cg_logo:<SYMBOL>` rows, seeded by
 * scripts/logos/seed_token_logos.py). One batched query, no CoinGecko call.
 * Use this server-side wherever an API response carries token symbols so
 * the client never has to resolve icons one request at a time.
 */
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export async function getTokenLogos(symbols: string[]): Promise<Record<string, string>> {
  const syms = Array.from(new Set(symbols.map((s) => String(s || '').trim().toUpperCase()).filter(Boolean))).slice(0, 500)
  if (syms.length === 0) return {}
  try {
    const { data } = await supabaseAdmin
      .from('app_cache')
      .select('key, value')
      .in('key', syms.map((s) => `cg_logo:${s}`))
    const out: Record<string, string> = {}
    for (const row of data || []) {
      const url = (row as any)?.value?.image_url
      if (typeof url === 'string' && url) out[String((row as any).key).slice('cg_logo:'.length)] = url
    }
    return out
  } catch {
    return {}
  }
}
