/**
 * X (Twitter) API v2 client — OAuth 1.0a user-context, zero dependencies.
 *
 * Posts as @SonarTrackerio using the app + user tokens in env:
 *   X_API_KEY, X_API_KEY_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 * (local: .env.local; prod: Vercel env — must be added there manually).
 *
 * Quota reality (verified 2026-07-28): legacy free-tier apps get 17 posts
 * per 24h app-wide; pay-per-use apps are billed $0.015/post ($0.20 with a
 * link). The news bot may share this app's quota, so callers must budget
 * posts (see /api/cron/x-whale-alerts) and record the x-app-limit-24hour-*
 * response headers we surface in PostTweetResult.quota.
 */
import crypto from 'crypto'

// RFC 3986 percent-encoding (encodeURIComponent misses these five).
function pct(s: string): string {
  return encodeURIComponent(s).replace(/[!*'()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}

type OAuthCreds = {
  consumerKey: string
  consumerSecret: string
  accessToken: string
  accessTokenSecret: string
}

function credsFromEnv(): OAuthCreds | null {
  const consumerKey = process.env.X_API_KEY
  const consumerSecret = process.env.X_API_KEY_SECRET
  const accessToken = process.env.X_ACCESS_TOKEN
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) return null
  return { consumerKey, consumerSecret, accessToken, accessTokenSecret }
}

/**
 * Build an OAuth 1.0a HMAC-SHA1 Authorization header. For JSON-body requests
 * only the oauth_* params are signed (no body/query params), per spec.
 */
export function oauth1Header(method: string, url: string, creds: OAuthCreds): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  }
  const paramString = Object.keys(oauth)
    .sort()
    .map(k => `${pct(k)}=${pct(oauth[k])}`)
    .join('&')
  const baseString = `${method.toUpperCase()}&${pct(url)}&${pct(paramString)}`
  const signingKey = `${pct(creds.consumerSecret)}&${pct(creds.accessTokenSecret)}`
  oauth.oauth_signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')
  return (
    'OAuth ' +
    Object.keys(oauth)
      .sort()
      .map(k => `${pct(k)}="${pct(oauth[k])}"`)
      .join(', ')
  )
}

export type XQuota = {
  app24hLimit: string | null
  app24hRemaining: string | null
  app24hReset: string | null
  user24hLimit: string | null
  user24hRemaining: string | null
}

export type PostTweetResult = {
  ok: boolean
  status: number
  /** Tweet id on success. */
  id: string | null
  error: string | null
  quota: XQuota
}

function quotaFromHeaders(h: Headers): XQuota {
  return {
    app24hLimit: h.get('x-app-limit-24hour-limit'),
    app24hRemaining: h.get('x-app-limit-24hour-remaining'),
    app24hReset: h.get('x-app-limit-24hour-reset'),
    user24hLimit: h.get('x-user-limit-24hour-limit'),
    user24hRemaining: h.get('x-user-limit-24hour-remaining'),
  }
}

/** Post a tweet. Optionally pass reply_to to thread under a previous post. */
export async function postTweet(text: string, replyToId?: string): Promise<PostTweetResult> {
  const creds = credsFromEnv()
  if (!creds) {
    return {
      ok: false,
      status: 0,
      id: null,
      error: 'X credentials not set (X_API_KEY / X_API_KEY_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET)',
      quota: { app24hLimit: null, app24hRemaining: null, app24hReset: null, user24hLimit: null, user24hRemaining: null },
    }
  }
  const url = 'https://api.x.com/2/tweets'
  const body: Record<string, unknown> = { text }
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: oauth1Header('POST', url, creds),
      'Content-Type': 'application/json',
      'User-Agent': 'SonarTracker/1.0',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })

  const quota = quotaFromHeaders(res.headers)
  let json: any = null
  try { json = await res.json() } catch { /* non-JSON error body */ }

  if (!res.ok) {
    const detail = json?.detail || json?.title || json?.errors?.[0]?.message || `HTTP ${res.status}`
    return { ok: false, status: res.status, id: null, error: detail, quota }
  }
  return { ok: true, status: res.status, id: json?.data?.id ?? null, error: null, quota }
}
