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

/** whale_convergence needs migration 20261001 on production; hidden until it has run. */
export const CONVERGENCE_PRESET_ENABLED = false

export type PresetTarget = 'wallet' | 'coin'

export interface AlertPreset {
  kind: AlertKind
  title: string
  target: PresetTarget
  /** Threshold choices shown as chips; the unit follows `unit`. */
  options: number[]
  defaultOption: number | null
  unit: 'usd' | 'pct' | 'count' | null
}

export const ALERT_PRESETS: AlertPreset[] = [
  { kind: 'wallet_activity', title: 'A wallet I follow moves more than $100K', target: 'wallet', options: [25_000, 100_000, 1_000_000], defaultOption: 100_000, unit: 'usd' },
  { kind: 'price_move', title: 'A coin I watch moves 5% in an hour', target: 'coin', options: [3, 5, 10], defaultOption: 5, unit: 'pct' },
  { kind: 'whale_flow', title: 'Whale net flow on a coin crosses a level', target: 'coin', options: [1_000_000, 5_000_000, 10_000_000], defaultOption: 5_000_000, unit: 'usd' },
  { kind: 'news_high_impact', title: 'A big headline about a coin I watch', target: 'coin', options: [], defaultOption: null, unit: null },
  { kind: 'whale_convergence', title: '3 or more whale wallets move into the same coin within 24 h', target: 'coin', options: [3, 5], defaultOption: CONVERGENCE_DEFAULT_MIN_WHALES, unit: 'count' },
]

export function visiblePresets(): AlertPreset[] {
  return ALERT_PRESETS.filter((p) => p.kind !== 'whale_convergence' || CONVERGENCE_PRESET_ENABLED)
}

/** Coins offered when the user watches none. */
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
  const v = sel.option ?? preset.defaultOption
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
