/**
 * CRON: Weekly Top-5 Wallets Email
 * Schedule: Every Sunday at 15:00 UTC (vercel.json).
 *
 * Sends a short, plain-language email digest highlighting the five
 * curated figures with the highest 7d backtested return. Reuses the
 * exact same Brevo emailCampaigns + sendNow flow as
 * /api/cron/weekly-insights so we hit the same audience (List #3) and
 * the same sender identity. Body is plain inline HTML — no AI calls,
 * no template ID, no merge variables — so this cron is dependency-free
 * and cheap.
 *
 * Source data: figure_backtests (populated nightly by
 * /api/cron/backtest-figures). If the table is empty (cron has never
 * run, fresh DB, etc.) we skip sending instead of mailing an empty
 * digest.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60
// Next's Data Cache pins Supabase GETs made inside GET route handlers — the
// email must always read this week's numbers, never a cached fetch.
export const fetchCache = 'force-no-store'

type Performer = {
  slug: string
  display_name: string
  category: string | null
  twitter_handle: string | null
  return_pct_7d: number
}

type AnonWhale = {
  address: string
  chain: string
  return_pct_7d: number
  trades: number
}

// Written nightly by /api/cron/backtest-whales.
const ANON_WHALES_CACHE_KEY = 'anon_whale_backtests_7d'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth?.replace('Bearer ', '') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const brevoKey = process.env.BREVO_API_KEY
  if (!brevoKey) return NextResponse.json({ error: 'BREVO_API_KEY not set' }, { status: 500 })

  const sb = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  const { data: rows, error } = await sb
    .from('figure_backtests')
    .select(
      'slug, return_pct_7d, curated_entities!inner(slug, display_name, category, twitter_handle, addresses, submission_status)',
    )
    .gt('return_pct_7d', 0)
    .order('return_pct_7d', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const performers: Performer[] = (rows || [])
    .map((row: any) => {
      const ent = row.curated_entities
      if (!ent || ent.submission_status !== 'approved') return null
      if (!Array.isArray(ent.addresses) || ent.addresses.length === 0) return null
      return {
        slug: ent.slug,
        display_name: ent.display_name,
        category: ent.category,
        twitter_handle: ent.twitter_handle,
        return_pct_7d: Number(row.return_pct_7d),
      } as Performer
    })
    .filter((x: Performer | null): x is Performer => Boolean(x))
    .slice(0, 5)

  // Anonymous smart-money whales — the wallets actually trading. Computed
  // nightly by /api/cron/backtest-whales into app_cache. Require real fills
  // so a wallet with one lucky trade doesn't headline the email.
  let whales: AnonWhale[] = []
  try {
    const { data: cacheRow } = await sb
      .from('app_cache')
      .select('value, updated_at')
      .eq('key', ANON_WHALES_CACHE_KEY)
      .maybeSingle()
    const ageMs = cacheRow ? Date.now() - new Date(cacheRow.updated_at).getTime() : Infinity
    const rows: any[] = Array.isArray(cacheRow?.value?.rows) ? cacheRow.value.rows : []
    if (ageMs < 8 * 24 * 60 * 60 * 1000) {
      whales = rows
        .filter((r) => Number.isFinite(r?.return_pct_7d) && r.return_pct_7d > 0 && Number(r?.trades) >= 3)
        .slice(0, 5)
        .map((r) => ({
          address: String(r.address),
          chain: String(r.chain || 'ethereum'),
          return_pct_7d: Number(r.return_pct_7d),
          trades: Number(r.trades),
        }))
    }
  } catch { /* section simply omitted */ }

  // An email with one or two rows reads as broken. Skip the week unless at
  // least one section has three-plus positive performers.
  if (performers.length < 3 && whales.length < 3) {
    return NextResponse.json({ ok: true, sent: false, reason: 'not_enough_performers', performers_count: performers.length, whales_count: whales.length })
  }

  const weekEnd = new Date()
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  // Cron retries and manual re-runs must not email the list twice.
  if (await alreadySentThisWeek(brevoKey, weekLabel)) {
    return NextResponse.json({ ok: true, sent: false, reason: 'already_sent_this_week' })
  }

  const subject = `Top wallets this week (${weekLabel})`
  const html = renderHtml(performers, whales, weekLabel)

  const sendResult = await sendBrevoCampaign(brevoKey, subject, html, weekLabel)
  return NextResponse.json({ ok: true, performers_count: performers.length, whales_count: whales.length, ...sendResult })
}

function renderHtml(performers: Performer[], whales: AnonWhale[], weekLabel: string): string {
  const shorten = (a: string) => (a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-4)}` : a)
  const pctCell = (ret: number) =>
    `<td style="padding:14px 8px;border-bottom:1px solid #1f2937;text-align:right;color:#2ecc71;font-weight:700;font-size:15px;white-space:nowrap;">${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%</td>`

  const figureRows = performers
    .map((p, i) => {
      const url = `https://www.sonartracker.io/figure/${encodeURIComponent(p.slug)}`
      return `
        <tr>
          <td style="padding:14px 8px;border-bottom:1px solid #1f2937;width:32px;color:#6b7280;font-weight:700;">#${i + 1}</td>
          <td style="padding:14px 8px;border-bottom:1px solid #1f2937;">
            <a href="${url}" style="color:#22d3ee;text-decoration:none;font-weight:600;font-size:15px;">${escapeHtml(p.display_name)}</a>
            <div style="color:#6b7280;font-size:12px;margin-top:2px;">${escapeHtml(p.category || '')}${p.twitter_handle ? ` · @${escapeHtml(p.twitter_handle)}` : ''}</div>
          </td>
          ${pctCell(p.return_pct_7d)}
        </tr>`
    })
    .join('')

  const whaleRows = whales
    .map((w, i) => {
      const url = `https://www.sonartracker.io/wallet-tracker/${encodeURIComponent(w.address)}`
      return `
        <tr>
          <td style="padding:14px 8px;border-bottom:1px solid #1f2937;width:32px;color:#6b7280;font-weight:700;">#${i + 1}</td>
          <td style="padding:14px 8px;border-bottom:1px solid #1f2937;">
            <a href="${url}" style="color:#22d3ee;text-decoration:none;font-weight:600;font-size:15px;font-family:ui-monospace,Menlo,monospace;">${escapeHtml(shorten(w.address))}</a>
            <div style="color:#6b7280;font-size:12px;margin-top:2px;">${escapeHtml(w.chain)} · ${w.trades} trades</div>
          </td>
          ${pctCell(w.return_pct_7d)}
        </tr>`
    })
    .join('')

  // Render a section only when it has enough rows to look intentional.
  const figureSection = performers.length >= 3
    ? `<tr><td style="padding:8px 18px;">
          <div style="padding:10px 10px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9ca3af;font-weight:700;">Famous wallets</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${figureRows}</table>
        </td></tr>`
    : ''
  const whaleSection = whales.length >= 3
    ? `<tr><td style="padding:8px 18px;">
          <div style="padding:10px 10px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9ca3af;font-weight:700;">Anonymous smart-money whales</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${whaleRows}</table>
        </td></tr>`
    : ''

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#060c14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e5e7eb;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060c14;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#0b1422;border:1px solid #1f2937;border-radius:12px;">
        <tr><td style="padding:24px 28px 8px;">
          <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#22d3ee;font-weight:700;"><span style="font-size:14px;">&#9673;</span>&nbsp; Sonar · Whale Pulse</div>
          <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:800;">Top wallets this week</h1>
          <div style="margin:6px 0 0;color:#9ca3af;font-size:13px;">${escapeHtml(weekLabel)} · backtested 7d return on $10k of paper capital</div>
        </td></tr>
        ${whaleSection}
        ${figureSection}
        <tr><td style="padding:18px 28px 24px;color:#6b7280;font-size:11px;line-height:1.6;">
          Past performance is not indicative of future results. Backtests assume $10k of capital deployed at the start of the window with a 30bps round-trip fee per fill and zero-mark for tokens with no on-chain price feed. Not investment advice.
          <br/><br/>
          You're receiving this because you subscribed to the Sonar Whale Pulse. <a href="https://www.sonartracker.io/profile" style="color:#22d3ee;">Manage subscription</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// True if a campaign for this week already went out (or is mid-send). A
// campaign that exists but failed before sendNow doesn't count, so a retry
// can still pick it up.
async function alreadySentThisWeek(brevoKey: string, weekLabel: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.brevo.com/v3/emailCampaigns?limit=25&sort=desc', {
      headers: { 'api-key': brevoKey },
    })
    if (!res.ok) return false
    const data = await res.json()
    return (data.campaigns || []).some(
      (c: any) => c.name === `Top Wallets ${weekLabel}` && ['sent', 'in_process', 'queued'].includes(c.status),
    )
  } catch {
    return false
  }
}

async function sendBrevoCampaign(brevoKey: string, subject: string, htmlBody: string, weekLabel: string) {
  try {
    const campaignRes = await fetch('https://api.brevo.com/v3/emailCampaigns', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Top Wallets ${weekLabel}`,
        subject,
        sender: { name: 'Sonar', email: 'eduardo@sonartracker.io' },
        htmlContent: htmlBody,
        recipients: { listIds: [3] },
        inlineImageActivation: false,
      }),
    })
    if (!campaignRes.ok) {
      const errText = await campaignRes.text()
      return { sent: false, brevo_error: `Campaign creation failed (${campaignRes.status}): ${errText.slice(0, 500)}` }
    }
    const campaign = await campaignRes.json()

    const sendRes = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaign.id}/sendNow`, {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
    })
    if (!sendRes.ok) {
      const errText = await sendRes.text()
      return { sent: false, campaignId: campaign.id, brevo_error: `Send failed (${sendRes.status}): ${errText.slice(0, 500)}` }
    }
    return { sent: true, campaignId: campaign.id }
  } catch (e: any) {
    return { sent: false, brevo_error: String(e?.message || e) }
  }
}
