import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { createHash } from 'crypto'

export interface ApiKeyInfo {
  user_id: string
  tier: 'free' | 'pro'
  key_hash: string
}

const TIER_LIMITS: Record<string, number> = {
  free: 100,   // 100 req/day
  pro: 10000,  // 10,000 req/day
}

// In-memory daily usage counter (resets on deploy/cold start — fine for v1)
const dailyUsage = new Map<string, { count: number; date: string }>()

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function authenticateApiKey(req: Request): Promise<
  { ok: true; keyInfo: ApiKeyInfo } | { ok: false; status: number; error: string }
> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing API key. Use Authorization: Bearer <key>' }
  }

  const rawKey = authHeader.slice(7)
  if (!rawKey || rawKey.length < 10) {
    return { ok: false, status: 401, error: 'Invalid API key format' }
  }

  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('user_id, key_hash, tier')
    .eq('key_hash', keyHash)
    .single()

  if (error || !data) {
    return { ok: false, status: 401, error: 'Invalid API key' }
  }

  const tier = (data.tier || 'free') as 'free' | 'pro'
  const limit = TIER_LIMITS[tier] || 100
  const dateKey = `${data.key_hash}:${today()}`

  const usage = dailyUsage.get(dateKey)
  if (usage && usage.date === today()) {
    if (usage.count >= limit) {
      return { ok: false, status: 429, error: `Daily rate limit exceeded (${limit} req/day for ${tier} tier)` }
    }
    usage.count++
  } else {
    dailyUsage.set(dateKey, { count: 1, date: today() })
  }

  return { ok: true, keyInfo: { user_id: data.user_id, tier, key_hash: data.key_hash } }
}
