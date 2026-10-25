/**
 * Compliance lint for generated blog articles. The SEO cron runs it before
 * saving; an article that trips any rule is not saved and the reason is
 * recorded in app_cache `blog_last_run` (shown in the daily health email).
 *
 * The same patterns were used on 2026-10-25 to quarantine the live catalogue:
 * fabricated accuracy / win-rate figures, prices next to a competitor or next
 * to Sonar, buy/sell-signal wording, and user counts.
 */

const COMPETITORS = '(?:Nansen|Arkham|Glassnode|Whale Alert|Chainalysis|CoinGlass|DefiLlama|Santiment|Dune)'

// "$49/mo", "$1,200 per month", "$299/month", "$10 a month"
const PRICE = String.raw`\$\s?\d[\d,.]*\s?(?:\/\s?(?:mo|month|year|yr)\b|per\s+(?:month|year)|a\s+month|monthly)`

const RULES: { reason: string; re: RegExp }[] = [
  { reason: 'accuracy or win-rate claim', re: /\d{1,3}(?:\.\d+)?\s?%\s*(?:accuracy|accurate|win rate|success rate|hit rate|confidence)/i },
  { reason: 'win-rate or profit-factor claim', re: /\b(?:win rate|profit factor)\b/i },
  { reason: 'price next to a competitor', re: new RegExp(`${COMPETITORS}[^.]{0,80}${PRICE}|${PRICE}[^.]{0,80}${COMPETITORS}`, 'i') },
  { reason: 'price next to Sonar', re: new RegExp(`Sonar(?: Tracker)?[^.]{0,80}${PRICE}|${PRICE}[^.]{0,80}Sonar(?: Tracker)?`, 'i') },
  { reason: 'buy/sell signal wording', re: /\b(?:buy|sell)\s+signals?\b/i },
  { reason: 'directional advice', re: /\b(?:you should (?:buy|sell)|time to (?:buy|sell)|strong buy|strong sell)\b/i },
  { reason: 'user count', re: /\b\d{1,3}(?:,\d{3})*\+?\s+(?:active\s+)?(?:users|traders|subscribers|customers)\b/i },
  { reason: 'comparison or alternative angle', re: new RegExp(`\\b${COMPETITORS}\\s+(?:alternative|vs\\.?|versus)\\b|\\bvs\\.?\\s+${COMPETITORS}`, 'i') },
]

function toText(html: string): string {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#36;|&dollar;/g, '$')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export function wordCount(html: string): number {
  const t = toText(html)
  return t ? t.split(' ').length : 0
}

export function lintArticle(html: string, opts: { minWords?: number } = {}): { ok: boolean; reasons: string[] } {
  const text = toText(html)
  const reasons: string[] = []
  for (const r of RULES) {
    const m = text.match(r.re)
    if (m) reasons.push(`${r.reason}: "${m[0].slice(0, 80)}"`)
  }
  const min = opts.minWords ?? 0
  if (min > 0) {
    const n = wordCount(html)
    if (n < min) reasons.push(`too short: ${n} words (minimum ${min})`)
  }
  return { ok: reasons.length === 0, reasons }
}
