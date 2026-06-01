/**
 * ORCA Alerts — shared types
 * =============================================================================
 * Proactive-alerts stage (ORCA_PROACTIVE_ALERTS_BUILD_PROMPT.md §2/§3).
 */

export type AlertKind =
  | 'price_move'
  | 'whale_flow'
  | 'signal_flip'
  | 'news_high_impact'

export const ALERT_KINDS: AlertKind[] = [
  'price_move',
  'whale_flow',
  'signal_flip',
  'news_high_impact',
]

export interface AlertRule {
  id: string
  user_id: string
  ticker: string
  kind: AlertKind
  threshold_pct: number | null
  threshold_usd: number | null
  enabled?: boolean
}

/** A re-ask hint so clicking a notification can deep-link into ORCA. */
export interface ReaskHint {
  intent: 'overview' | 'article_explain'
  prompt: string
  url?: string
}

/** Output of every copy generator + evaluator trigger. */
export interface NotificationCopy {
  title: string
  body: string
  payload: {
    kind: AlertKind
    ticker: string
    raw: Record<string, unknown>
    reask: ReaskHint
  }
}

/** notification_style scales the per-day in-app cap. */
export type NotificationStyle = 'quiet' | 'balanced' | 'frequent'

export const DAILY_CAP_BY_STYLE: Record<NotificationStyle, number> = {
  quiet: 5,
  balanced: 10,
  frequent: 20,
}

/** Absolute hard caps (HARD RULE §0.5). */
export const MAX_ACTIVE_RULES_PER_USER = 50
export const MAX_INAPP_PER_DAY = 20
export const MAX_EMAIL_DIGESTS_PER_DAY = 3

/** Default thresholds when the user does not specify one. */
export const DEFAULT_PRICE_MOVE_PCT = 5
export const DEFAULT_WHALE_FLOW_USD = 1_000_000

/** News impact sentiment trigger magnitude. */
export const NEWS_SENTIMENT_THRESHOLD = 0.6
