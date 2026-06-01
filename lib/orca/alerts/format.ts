/**
 * ORCA Alerts — copy generators
 * =============================================================================
 * Pure functions that turn an evaluator trigger into in-app / email copy.
 *
 * HARD RULE §0.4: alert copy states what happened, never what to do. No
 * directional verbs (buy / sell / target / rally / crash / moon / dump /
 * long / short). The unit tests assert the rendered title + body contain
 * none of them. Signal-direction labels are kept out of the rendered text
 * and live in `payload.raw` for re-render only.
 */
import type { AlertKind, NotificationCopy, ReaskHint } from './types'

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

/** Compact USD: $1.4M, $442k, $980. */
export function formatUsd(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : '+'
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`
  return `${sign}$${abs.toFixed(0)}`
}

function overviewReask(ticker: string): ReaskHint {
  return { intent: 'overview', prompt: `what is happening with ${ticker} right now` }
}

function copy(
  kind: AlertKind,
  ticker: string,
  title: string,
  body: string,
  raw: Record<string, unknown>,
  reask: ReaskHint
): NotificationCopy {
  return { title, body, payload: { kind, ticker, raw, reask } }
}

export function formatPriceMove(ticker: string, pct: number): NotificationCopy {
  const rounded = Number(pct.toFixed(1))
  return copy(
    'price_move',
    ticker,
    `${ticker} ${signed(rounded)}% in last 24h`,
    `Price on ${ticker} moved ${signed(rounded)}% over the last 24 hours.`,
    { pct: rounded },
    overviewReask(ticker)
  )
}

export function formatWhaleFlow(ticker: string, netUsd: number): NotificationCopy {
  return copy(
    'whale_flow',
    ticker,
    `${ticker} whale net flow ${formatUsd(netUsd)} last 24h`,
    `Net whale USD flow on ${ticker} over the last 24 hours was ${formatUsd(netUsd)}.`,
    { netUsd },
    overviewReask(ticker)
  )
}

export function formatSignalFlip(
  ticker: string,
  from: string,
  to: string,
  confidence: number
): NotificationCopy {
  const conf = Math.round(confidence)
  // Direction labels stay OUT of the rendered text (compliance). They are
  // preserved in payload.raw for the inbox to re-render later if needed.
  return copy(
    'signal_flip',
    ticker,
    `${ticker} composite signal changed at confidence ${conf}`,
    `Sonar's composite signal for ${ticker} changed state. The composite signal is informational, not advice.`,
    { from, to, confidence: conf },
    overviewReask(ticker)
  )
}

export function formatNewsImpact(
  ticker: string,
  headline: string,
  sentiment: number,
  url: string
): NotificationCopy {
  const s = Number(sentiment.toFixed(2))
  const reask: ReaskHint = {
    intent: 'article_explain',
    prompt: `explain this headline: ${headline}`,
    url,
  }
  return copy(
    'news_high_impact',
    ticker,
    `${ticker} headline: ${headline}`,
    `Sentiment ${signed(s)}; opens the article in Sonar.`,
    { headline, sentiment: s, url },
    reask
  )
}

/** Shorten an on-chain address for display: 0x1234…abcd. */
export function shortAddress(addr: string): string {
  const a = String(addr || '').trim()
  if (a.length <= 12) return a
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export function formatWalletActivity(
  address: string,
  chain: string | null,
  txCount: number,
  totalUsd: number,
  topToken: string | null
): NotificationCopy {
  const label = shortAddress(address)
  const chainPart = chain ? ` on ${chain}` : ''
  const tokenPart = topToken ? ` (${topToken})` : ''
  const txWord = txCount === 1 ? 'transaction' : 'transactions'
  const usd = formatUsd(totalUsd).replace(/^\+/, '')
  const reask: ReaskHint = {
    intent: 'wallet_explain',
    prompt: `what did wallet ${address} just do`,
  }
  return copy(
    'wallet_activity',
    label,
    `Wallet ${label} active${chainPart}`,
    `${txCount} ${txWord}${tokenPart} totalling ${usd} in the last hour.`,
    { address, chain, txCount, totalUsd, topToken },
    reask
  )
}

export function formatNewsAny(
  ticker: string,
  headline: string,
  url: string
): NotificationCopy {
  const reask: ReaskHint = {
    intent: 'article_explain',
    prompt: `explain this headline: ${headline}`,
    url,
  }
  return copy(
    'news_any',
    ticker,
    `${ticker} headline: ${headline}`,
    `New article mentioning ${ticker}; opens in Sonar.`,
    { headline, url },
    reask
  )
}

export function formatSocialPost(
  ticker: string,
  author: string,
  snippet: string,
  url: string,
  interactions: number
): NotificationCopy {
  const who = author ? `@${author}` : 'a tracked account'
  const clean = String(snippet || '').replace(/\s+/g, ' ').trim().slice(0, 140)
  const reask: ReaskHint = {
    intent: 'article_explain',
    prompt: `summarise the latest social chatter on ${ticker}`,
    url,
  }
  return copy(
    'social_post',
    ticker,
    `${ticker} mentioned by ${who}`,
    clean ? `"${clean}"` : `New post mentioning ${ticker} in the last hour.`,
    { author, snippet: clean, url, interactions },
    reask
  )
}
