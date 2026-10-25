/**
 * Alert presets and the one phrasing per kind every surface uses
 * (AlertPresets, AlertsTab, the Personal page rail, the wallet page modal).
 * Plain descriptions of what is measured; no directional verbs.
 */
import type { AlertKind } from './types'
import { CONVERGENCE_DEFAULT_MIN_WHALES } from './types'

/** The one cadence sentence every alert surface copies. */
export const CADENCE_SENTENCE =
  'Price, whale-flow and news rules are checked every 5 minutes; wallet-activity rules are checked every 5 minutes against wallet data we refresh hourly.'

/** whale_convergence needs migration 20261001; Eduardo ran it on 2026-10-25. */
export const CONVERGENCE_PRESET_ENABLED = true

export type PresetTarget = 'wallet' | 'coin'

export interface AlertPreset {
  kind: AlertKind
  title: string
  target: PresetTarget
  /** Quick choices shown as chips; the unit follows `unit`. */
  options: number[]
  defaultOption: number | null
  unit: 'usd' | 'pct' | 'count' | null
  /** Bounds for the custom value box. */
  custom?: { min: number; max: number }
  /** wallet_activity: a chip for "any valued move" (no floor). */
  allowAny?: boolean
  /** whale_convergence: a chip for "any coin". */
  anyCoin?: boolean
}

// Titles describe the rule; the editor sets the coin, wallet and number
// (Eduardo, 2026-10-25: fixed "$100K" / "5%" titles read as not adjustable).
export const ALERT_PRESETS: AlertPreset[] = [
  { kind: 'wallet_activity', title: 'A wallet moves more than an amount', target: 'wallet', options: [10_000, 25_000, 100_000, 500_000, 1_000_000, 5_000_000], defaultOption: 100_000, unit: 'usd', custom: { min: 1_000, max: 1_000_000_000 }, allowAny: true },
  { kind: 'price_move', title: "A coin's price moves in an hour", target: 'coin', options: [1, 2, 3, 5, 10], defaultOption: 5, unit: 'pct', custom: { min: 0.5, max: 50 } },
  { kind: 'whale_flow', title: 'Whale net flow on a coin crosses a level', target: 'coin', options: [500_000, 1_000_000, 5_000_000, 10_000_000, 25_000_000], defaultOption: 5_000_000, unit: 'usd', custom: { min: 50_000, max: 1_000_000_000 } },
  { kind: 'news_high_impact', title: 'A big headline about a coin', target: 'coin', options: [], defaultOption: null, unit: null },
  { kind: 'whale_convergence', title: 'Several whale wallets move into the same coin', target: 'coin', options: [2, 3, 5, 10], defaultOption: CONVERGENCE_DEFAULT_MIN_WHALES, unit: 'count', custom: { min: 2, max: 20 }, anyCoin: true },
]

/** Coins offered on every coin preset after the user's own. */
export const POPULAR_COINS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'LINK', 'PEPE', 'ENA', 'UNI', 'AAVE']

/**
 * Read a custom amount typed by the user: "250k", "1.5m", "$2,000,000", "3"
 * (usd), "1.5" (pct), "4" (count). Returns null when it does not parse or
 * falls outside the preset's bounds.
 */
export function parseCustomValue(preset: AlertPreset, raw: string): number | null {
  const t = String(raw || '').trim().toLowerCase().replace(/[$,%\s]/g, '')
  if (!t) return null
  const m = t.match(/^(\d+(?:\.\d+)?)([kmb])?$/)
  if (!m) return null
  let v = Number(m[1])
  if (preset.unit === 'usd') v *= m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : m[2] === 'b' ? 1e9 : 1
  else if (m[2]) return null
  if (preset.unit === 'count') v = Math.round(v)
  if (!Number.isFinite(v) || !preset.custom || v < preset.custom.min || v > preset.custom.max) return null
  return preset.unit === 'usd' ? Math.round(v) : v
}

export function visiblePresets(): AlertPreset[] {
  return ALERT_PRESETS.filter((p) => p.kind !== 'whale_convergence' || CONVERGENCE_PRESET_ENABLED)
}

/** Kept for callers that only want the three majors. */
export const FALLBACK_COINS = ['BTC', 'ETH', 'SOL']

export function fmtUsdShort(n: number): string {
  const a = Math.abs(Number(n) || 0)
  const short = (x: number, d: number) => String(Number(x.toFixed(d)))
  if (a >= 1e9) return `$${short(a / 1e9, 2)}B`
  if (a >= 1e6) return `$${short(a / 1e6, a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2)}M`
  if (a >= 1e3) return `$${short(a / 1e3, a >= 1e5 ? 0 : 1)}K`
  return `$${Math.round(a)}`
}

export function fmtOption(unit: AlertPreset['unit'], v: number): string {
  if (unit === 'usd') return fmtUsdShort(v)
  if (unit === 'pct') return `${v}%`
  if (unit === 'count') return `${v}+ whales`
  return String(v)
}

/** POST body for /api/personal/alerts. */
export function presetBody(
  preset: AlertPreset,
  sel: { ticker?: string | null; address?: string | null; option?: number | null },
  source = 'alert_preset'
): Record<string, unknown> {
  const body: Record<string, unknown> = { kind: preset.kind, source }
  if (preset.target === 'wallet') body.address = sel.address
  else body.ticker = sel.ticker
  // option === null on a wallet preset = any valued move (no floor).
  const v = sel.option === null && preset.allowAny ? null : (sel.option ?? preset.defaultOption)
  if (preset.unit === 'usd' && v != null) body.threshold_usd = v
  if ((preset.unit === 'pct' || preset.unit === 'count') && v != null) body.threshold_pct = v
  return body
}

export interface RuleLike {
  kind: string
  ticker?: string | null
  address?: string | null
  threshold_pct?: number | null
  threshold_usd?: number | null
}

/** One sentence per rule. `names` maps a lowercased address to a wallet name. */
export function describeRule(r: RuleLike | null | undefined, names?: Map<string, string>): string {
  if (!r) return ''
  const named = r.address ? names?.get(String(r.address).toLowerCase()) : null
  const coin = r.ticker && r.ticker !== '_ALL_' ? r.ticker : null
  const wallet = named || (r.address ? `${String(r.address).slice(0, 6)}…${String(r.address).slice(-4)}` : 'A wallet')
  switch (r.kind) {
    case 'price_move': return `${coin || 'A coin'} moves ${r.threshold_pct}% in an hour`
    case 'whale_flow': return `Whale net flow on ${coin || 'a coin'} crosses ${fmtUsdShort(Number(r.threshold_usd) || 0)} in 24 h`
    case 'wallet_activity': return Number(r.threshold_usd) > 0 ? `${wallet} moves more than ${fmtUsdShort(Number(r.threshold_usd))}` : `${wallet} makes any valued move`
    case 'whale_convergence': return `${r.threshold_pct || CONVERGENCE_DEFAULT_MIN_WHALES}+ whale wallets move into ${coin || 'the same coin'} within 24 h`
    case 'news_high_impact': return `A big headline about ${coin || 'a coin'}`
    case 'news_any': return `Any headline about ${coin || 'a coin'}`
    case 'social_post': return `A social post about ${coin || 'a coin'}`
    case 'signal_flip': return `The Sonar signal on ${coin || 'a coin'} changes`
    default: return r.kind
  }
}
