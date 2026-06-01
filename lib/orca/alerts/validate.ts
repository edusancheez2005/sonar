/**
 * ORCA Alerts — input validation shared by the REST API and the chat
 * write-tools so both paths enforce identical rules (§7 / §8).
 */
import { ALERT_KINDS, type AlertKind } from './types'

const TICKER_RE = /^[A-Z0-9._-]{1,12}$/
const ADDRESS_RE = /^[a-zA-Z0-9]{20,80}$/

export function normaliseTicker(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().toUpperCase()
  if (!TICKER_RE.test(t)) return null
  return t
}

/**
 * Normalise an on-chain address. Accepts EVM (0x…40 hex) and common base58
 * chains (Solana etc). EVM addresses are lower-cased; others keep their case
 * (base58 is case-sensitive). Returns null when the shape is implausible.
 */
export function normaliseAddress(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const a = raw.trim()
  if (!a) return null
  if (/^0x[a-fA-F0-9]{40}$/.test(a)) return a.toLowerCase()
  if (!ADDRESS_RE.test(a)) return null
  return a
}

export function isAlertKind(value: unknown): value is AlertKind {
  return typeof value === 'string' && (ALERT_KINDS as string[]).includes(value)
}

export interface NormalisedThreshold {
  threshold_pct: number | null
  threshold_usd: number | null
}

/**
 * Resolve the threshold columns for a given kind. Exactly one of
 * threshold_pct / threshold_usd is set; the other is null (matches the
 * chk_threshold_shape DB constraint). signal_flip and news_high_impact carry
 * no threshold. Returns null when the supplied value is invalid for the kind.
 */
export function resolveThreshold(
  kind: AlertKind,
  opts: { threshold_pct?: unknown; threshold_usd?: unknown }
): NormalisedThreshold | null {
  if (kind === 'price_move') {
    const pct = Number(opts.threshold_pct)
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100000) return null
    return { threshold_pct: pct, threshold_usd: null }
  }
  if (kind === 'whale_flow') {
    const usd = Number(opts.threshold_usd)
    if (!Number.isFinite(usd) || usd <= 0) return null
    return { threshold_pct: null, threshold_usd: Math.round(usd) }
  }
  if (kind === 'wallet_activity') {
    // Optional minimum transaction size. Absent/zero = any movement.
    if (opts.threshold_usd === undefined || opts.threshold_usd === null || opts.threshold_usd === '') {
      return { threshold_pct: null, threshold_usd: null }
    }
    const usd = Number(opts.threshold_usd)
    if (!Number.isFinite(usd) || usd < 0) return null
    return { threshold_pct: null, threshold_usd: usd > 0 ? Math.round(usd) : null }
  }
  // signal_flip / news_high_impact / news_any / social_post — no threshold.
  return { threshold_pct: null, threshold_usd: null }
}
