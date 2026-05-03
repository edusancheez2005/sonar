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

type Performer = {
  slug: string
  display_name: string
  category: string | null
  twitter_handle: string | null
  return_pct_7d: number
}

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

  if (performers.length === 0) {
    return NextResponse.json({ ok: true, sent: false, reason: 'no_positive_performers' })
  }

  const weekEnd = new Date()
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const subject = `Top 5 wallets this week (${weekLabel})`
  const html = renderHtml(performers, weekLabel)

  const sendResult = await sendBrevoCampaign(brevoKey, subject, html, weekLabel)
  return NextResponse.json({ ok: true, performers_count: performers.length, ...sendResult })
}

function renderHtml(performers: Performer[], weekLabel: string): string {
  const rows = performers
    .map((p, i) => {
      const url = `https://www.sonartracker.io/figure/${encodeURIComponent(p.slug)}`
      const ret = p.return_pct_7d
      const sign = ret >= 0 ? '+' : ''
      return `
        <tr>
          <td style="padding:14px 8px;border-bottom:1px solid #1f2937;width:32px;color:#6b7280;font-weight:700;">#${i + 1}</td>
          <td style="padding:14px 8px;border-bottom:1px solid #1f2937;">
            <a href="${url}" style="color:#22d3ee;text-decoration:none;font-weight:600;font-size:15px;">${escapeHtml(p.display_name)}</a>
            <div style="color:#6b7280;font-size:12px;margin-top:2px;">${escapeHtml(p.category || '')}${p.twitter_handle ? ` · @${escapeHtml(p.twitter_handle)}` : ''}</div>
          </td>
          <td style="padding:14px 8px;border-bottom:1px solid #1f2937;text-align:right;color:#2ecc71;font-weight:700;font-size:15px;white-space:nowrap;">${sign}${ret.toFixed(1)}%</td>
        </tr>`
    })
    .join('')

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#060c14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e5e7eb;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060c14;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#0b1422;border:1px solid #1f2937;border-radius:12px;">
        <tr><td style="padding:24px 28px 8px;">
          <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#22d3ee;font-weight:700;">Sonar · Whale Pulse</div>
          <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:800;">Top 5 wallets this week</h1>
          <div style="margin:6px 0 0;color:#9ca3af;font-size:13px;">${escapeHtml(weekLabel)} · backtested 7d return on $10k of paper capital</div>
        </td></tr>
        <tr><td style="padding:8px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>
        </td></tr>
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
