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
 */
import type { NotificationCopy } from './types'
import { NEWS_SENTIMENT_THRESHOLD } from './types'
import {
  formatPriceMove,
  formatWhaleFlow,
  formatSignalFlip,
  formatNewsImpact,
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
