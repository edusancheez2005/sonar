/**
 * HTML body of the weekly "Whale Pulse" blog post, built from the same
 * insights object the Saturday email uses (app/api/cron/weekly-insights).
 * One builder for the real run and the dry run, so the dry run shows exactly
 * what will be published. Covers are added later by the SEO cron's self-heal
 * step (or passed in as coverUrl).
 */
import { withCover } from './cover'

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function pulseTitle(insights: any, weekLabel: string): string {
  return String(insights?.subject || `Whale Pulse: ${weekLabel}`)
}

export function buildPulseBlogHtml(insights: any, weekLabel: string, coverUrl?: string | null): string {
  const title = pulseTitle(insights, weekLabel)
  const topNews = (insights?.top_news || [])
    .map((n: any) => `<li><strong>${esc(n.title)}</strong> (${esc(n.source)}): ${esc(n.impact)}</li>`)
    .join('')
  const whaleMoves = (insights?.whale_moves || [])
    .map((w: any) => `<li><strong>${esc(w.token)}</strong>: ${esc(w.direction)}, $${(Number(w.volume_usd || 0) / 1e6).toFixed(1)}M. ${esc(w.narrative)}</li>`)
    .join('')
  const priceMovers = (insights?.price_movers || [])
    .map((p: any) => `<li><strong>${esc(p.token)}</strong> ${Number(p.change_pct) >= 0 ? '+' : ''}${esc(p.change_pct)}%: ${esc(p.narrative)}</li>`)
    .join('')
  const shift = insights?.sentiment_shift || {}
  const overall = String(shift.overall || 'neutral')

  const body = `<h1>${esc(title)}</h1>
<p>${esc(insights?.summary || '')}</p>

<h2>Market sentiment: ${esc(overall.charAt(0).toUpperCase() + overall.slice(1))}</h2>
<p>${esc(shift.narrative || 'No sentiment data available for this period.')}</p>

<h2>Top news this week</h2>
<ul>${topNews || '<li>No major news this period.</li>'}</ul>

<h2>Biggest whale movements</h2>
<ul>${whaleMoves || '<li>No significant whale movements detected.</li>'}</ul>

<h2>Price movers</h2>
<ul>${priceMovers || '<li>No significant price movements.</li>'}</ul>

<h2>What to watch next week</h2>
<p>Live whale flows, alerts and ORCA analysis at <a href="https://www.sonartracker.io/dashboard">sonartracker.io/dashboard</a>.</p>

<p><em>Week of ${esc(weekLabel)}. For information only; not financial advice.</em></p>`

  return coverUrl ? withCover(body, coverUrl, title) : body
}
