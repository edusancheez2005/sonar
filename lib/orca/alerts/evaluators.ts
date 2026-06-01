/**
 * ORCA Alerts — per-kind evaluators
 * =============================================================================
 * One function per alert kind. Each reads the canonical public table directly
 * via the injected Supabase-like client (no new endpoints, HARD RULE §0.1) and
 * returns a NotificationCopy when the rule's trigger condition is met, else
 * null. Every read is wrapped so a single broken query yields null, never a
 * thrown error (HARD RULE §0.6).
 *
 * Canonical sources:
 *   price_move        -> price_snapshots (latest row for ticker)
 *   whale_flow        -> all_whale_transactions (rolling 24h net buy-sell USD)
 *   signal_flip       -> token_signals (latest 2 rows; column is `signal`)
 *   news_high_impact  -> news_items (published in last 1h, |sentiment| >= 0.6)
 *   wallet_activity   -> all_whale_transactions (address moved in last 1h)
 *   news_any          -> news_items (any article for ticker in last 1h)
 *   social_post       -> social_posts (any mention of ticker in last 1h)
 */
import type { NotificationCopy } from './types'
import { NEWS_SENTIMENT_THRESHOLD, RECENT_WINDOW_MS } from './types'
import {
  formatPriceMove,
  formatWhaleFlow,
  formatSignalFlip,
  formatNewsImpact,
  formatWalletActivity,
  formatNewsAny,
  formatSocialPost,
} from './format'

export interface SupabaseLike {
  from: (table: string) => any
}

const DIRECTIONAL = new Set(['BUY', 'SELL', 'STRONG BUY', 'STRONG SELL'])

export async function evaluatePriceMove(
  ticker: string,
  thresholdPct: number,
  supabase: SupabaseLike
): Promise<NotificationCopy | null> {
  try {
    const { data } = await supabase
      .from('price_snapshots')
      .select('price_change_24h')
      .eq('ticker', ticker)
      .order('timestamp', { ascending: false })
      .limit(1)
    const row = Array.isArray(data) ? data[0] : null
    const pct = row && typeof row.price_change_24h === 'number' ? row.price_change_24h : null
    if (pct === null || !Number.isFinite(thresholdPct)) return null
    if (Math.abs(pct) < thresholdPct) return null
    return formatPriceMove(ticker, pct)
  } catch {
    return null
  }
}

export async function evaluateWhaleFlow(
  ticker: string,
  thresholdUsd: number,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<NotificationCopy | null> {
  try {
    const sinceIso = new Date(now().getTime() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('all_whale_transactions')
      .select('usd_value, classification')
      .eq('token_symbol', ticker)
      .gte('timestamp', sinceIso)
      .limit(1000)
    if (!Array.isArray(data) || data.length === 0) return null
    let net = 0
    for (const r of data as Array<{ usd_value: number | string; classification: string }>) {
      const v = Number(r.usd_value)
      if (!Number.isFinite(v) || v <= 0) continue
      const c = String(r.classification || '').toLowerCase()
      if (c.startsWith('buy')) net += v
      else if (c.startsWith('sell')) net -= v
    }
    if (!Number.isFinite(thresholdUsd) || Math.abs(net) < thresholdUsd) return null
    return formatWhaleFlow(ticker, net)
  } catch {
    return null
  }
}

export async function evaluateSignalFlip(
  ticker: string,
  supabase: SupabaseLike
): Promise<NotificationCopy | null> {
  try {
    const { data } = await supabase
      .from('token_signals')
      .select('signal, confidence, computed_at')
      .eq('token', ticker)
      .order('computed_at', { ascending: false })
      .limit(2)
    if (!Array.isArray(data) || data.length < 2) return null
    const latest = data[0]
    const prior = data[1]
    const to = String(latest?.signal || '').toUpperCase()
    const from = String(prior?.signal || '').toUpperCase()
    if (!to || !from) return null
    if (to === from) return null
    if (!DIRECTIONAL.has(to)) return null
    const confidence = Number(latest?.confidence) || 0
    return formatSignalFlip(ticker, from, to, confidence)
  } catch {
    return null
  }
}

export async function evaluateNewsImpact(
  ticker: string,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<NotificationCopy | null> {
  try {
    const sinceIso = new Date(now().getTime() - 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('news_items')
      .select('title, sentiment_score, url, published_at')
      .eq('ticker', ticker)
      .gte('published_at', sinceIso)
      .order('published_at', { ascending: false })
      .limit(20)
    if (!Array.isArray(data)) return null
    for (const r of data as Array<{ title?: string; sentiment_score?: number; url?: string }>) {
      const s = Number(r.sentiment_score)
      if (!Number.isFinite(s)) continue
      if (Math.abs(s) < NEWS_SENTIMENT_THRESHOLD) continue
      const headline = typeof r.title === 'string' ? r.title.trim() : ''
      if (!headline) continue
      return formatNewsImpact(ticker, headline, s, typeof r.url === 'string' ? r.url : '')
    }
    return null
  } catch {
    return null
  }
}

/**
 * wallet_activity — fire when the watched address moved in the last hour.
 * Reads all_whale_transactions across whale_address / from_address /
 * to_address (the address can sit on either side of a transfer). Optional
 * thresholdUsd filters out dust by minimum per-transaction USD value.
 */
export async function evaluateWalletActivity(
  address: string,
  thresholdUsd: number | null,
  chain: string | null,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<NotificationCopy | null> {
  try {
    const addr = String(address || '').trim()
    if (!addr) return null
    const sinceIso = new Date(now().getTime() - RECENT_WINDOW_MS).toISOString()
    const orFilter = `whale_address.eq.${addr},from_address.eq.${addr},to_address.eq.${addr}`
    let query = supabase
      .from('all_whale_transactions')
      .select('usd_value, token_symbol, blockchain, timestamp')
      .or(orFilter)
      .gte('timestamp', sinceIso)
    if (chain) query = query.eq('blockchain', chain)
    const { data } = await query.order('timestamp', { ascending: false }).limit(100)
    if (!Array.isArray(data) || data.length === 0) return null

    const minUsd = Number.isFinite(thresholdUsd as number) ? Number(thresholdUsd) : 0
    let txCount = 0
    let totalUsd = 0
    let topToken: string | null = null
    let topTokenUsd = -1
    for (const r of data as Array<{ usd_value?: number | string; token_symbol?: string }>) {
      const v = Number(r.usd_value)
      if (!Number.isFinite(v) || v < minUsd) continue
      txCount += 1
      totalUsd += Math.max(0, v)
      if (v > topTokenUsd && typeof r.token_symbol === 'string' && r.token_symbol) {
        topTokenUsd = v
        topToken = r.token_symbol
      }
    }
    if (txCount === 0) return null
    return formatWalletActivity(addr, chain, txCount, totalUsd, topToken)
  } catch {
    return null
  }
}

/**
 * news_any — fire on any article mentioning the ticker in the last hour,
 * regardless of sentiment. Returns the most recent headline.
 */
export async function evaluateNewsAny(
  ticker: string,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<NotificationCopy | null> {
  try {
    const sinceIso = new Date(now().getTime() - RECENT_WINDOW_MS).toISOString()
    const { data } = await supabase
      .from('news_items')
      .select('title, url, published_at')
      .eq('ticker', ticker)
      .gte('published_at', sinceIso)
      .order('published_at', { ascending: false })
      .limit(5)
    if (!Array.isArray(data)) return null
    for (const r of data as Array<{ title?: string; url?: string }>) {
      const headline = typeof r.title === 'string' ? r.title.trim() : ''
      if (!headline) continue
      return formatNewsAny(ticker, headline, typeof r.url === 'string' ? r.url : '')
    }
    return null
  } catch {
    return null
  }
}

/**
 * social_post — fire on any tweet/post mentioning the ticker in the last
 * hour. Reads social_posts.tickers_mentioned (a text[] of symbols).
 */
export async function evaluateSocialPost(
  ticker: string,
  supabase: SupabaseLike,
  now: () => Date = () => new Date()
): Promise<NotificationCopy | null> {
  try {
    const sinceIso = new Date(now().getTime() - RECENT_WINDOW_MS).toISOString()
    const { data } = await supabase
      .from('social_posts')
      .select('body, creator_screen_name, url, published_at, interactions')
      .contains('tickers_mentioned', [ticker])
      .gte('published_at', sinceIso)
      .order('published_at', { ascending: false })
      .limit(5)
    if (!Array.isArray(data) || data.length === 0) return null
    const r = data[0] as {
      body?: string
      creator_screen_name?: string
      url?: string
      interactions?: number
    }
    const author = typeof r.creator_screen_name === 'string' ? r.creator_screen_name : ''
    const snippet = typeof r.body === 'string' ? r.body : ''
    const url = typeof r.url === 'string' ? r.url : ''
    const interactions = Number(r.interactions) || 0
    return formatSocialPost(ticker, author, snippet, url, interactions)
  } catch {
    return null
  }
}
