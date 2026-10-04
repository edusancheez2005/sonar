// Email utility for Sonar Tracker
// Transactional sends go through Brevo (same account as the weekly
// campaign crons). Without BREVO_API_KEY these degrade to console.log,
// and they never throw — callers treat email as fire-and-forget.
//
// Style contract: emails match the dark "Sonar · Whale Pulse" campaign
// template (see app/api/cron/weekly-top-wallets/route.ts) — dark card,
// cyan accents, no emojis, compact compliance footer.

async function sendTransactionalEmail({ to, subject, html, headers = null }) {
  const brevoKey = process.env.BREVO_API_KEY
  if (!brevoKey) {
    console.log(`📧 [email disabled — no BREVO_API_KEY] Would send "${subject}" to: ${to}`)
    return false
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'Sonar',
          email: process.env.BREVO_SENDER_EMAIL || 'eduardo@sonartracker.io',
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        ...(headers && typeof headers === 'object' ? { headers } : {}),
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`Brevo transactional send failed (${res.status}): ${errText.slice(0, 300)}`)
      return false
    }
    return true
  } catch (err) {
    console.error('Brevo transactional send error:', err?.message || err)
    return false
  }
}

// Live hook for the welcome email: how much the tracked whales moved in the
// last 24h. Real number from our own tape — never fabricated. Any failure
// (or slow query) falls back to evergreen copy.
async function fetch24hWhaleStats() {
  try {
    const { supabaseAdminFresh } = await import('@/app/lib/supabaseAdmin')
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data } = await Promise.race([
      supabaseAdminFresh
        .from('all_whale_transactions')
        .select('usd_value')
        .gte('timestamp', since)
        .order('usd_value', { ascending: false })
        .limit(5000),
      new Promise((resolve) => setTimeout(() => resolve({ data: null }), 2500)),
    ])
    if (!Array.isArray(data) || data.length === 0) return null
    let total = 0
    for (const t of data) total += Number(t.usd_value) || 0
    if (!(total > 0)) return null
    return { totalUsd: total }
  } catch {
    return null
  }
}

function fmtUsdCompact(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${Math.round(n / 1e6)}M`
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`
  return `$${Math.round(n).toLocaleString()}`
}

export async function sendWelcomeEmail(email, name = '') {
  const stats = await fetch24hWhaleStats()
  return sendTransactionalEmail({
    to: email,
    subject: 'Welcome to Sonar — the whales are already moving',
    html: getWelcomeEmailHTML(email, name, stats),
  })
}

export async function sendWaitlistConfirmation(email) {
  return sendTransactionalEmail({
    to: email,
    subject: "You're in — we'll ping you at early access",
    html: getWaitlistEmailHTML(email),
  })
}

// Personal daily digest: the user's FOLLOWED wallets' trades in the last 24h.
// Only called when there is at least one move (no empty digests).
// moves: [{ address, display_name, classification, token, usd_value, timestamp }]
export async function sendPersonalDigest(email, { moves = [], totalCount = 0 }, { unsubscribeUrl } = {}) {
  const top = moves.slice(0, 5)
  const rows = top.map((m) => {
    const verb = String(m.classification || '').toUpperCase() === 'BUY' ? 'bought' : 'sold'
    const when = timeAgo(m.timestamp)
    return linkRow(
      `https://www.sonartracker.io/wallet-tracker/${m.address}`,
      `${escapeHtml(m.display_name)} ${verb} ${fmtUsdCompact(Number(m.usd_value) || 0)} of ${escapeHtml(m.token || '?')}`,
      `${when} — open the wallet to see the full move`
    )
  }).join('')

  const more = totalCount > top.length
    ? `<p style="margin:10px 0 0;color:#9ca3af;font-size:13px;">+ ${totalCount - top.length} more trades from your whales in the last 24 hours.</p>`
    : ''

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#d1d5db;font-size:14px;line-height:1.7;">
      The wallets you follow made ${totalCount} trade${totalCount === 1 ? '' : 's'} in the
      last 24 hours. The biggest moves:
    </p>
    ${rows}
    ${more}
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 8px;">
      <tr><td style="border-radius:8px;background:#22d3ee;">
        <a href="https://www.sonartracker.io/dashboard" style="display:inline-block;padding:11px 24px;color:#0a1621;font-weight:700;font-size:14px;text-decoration:none;">See all their moves &rarr;</a>
      </td></tr>
    </table>`

  const unsub = typeof unsubscribeUrl === 'string' && unsubscribeUrl ? unsubscribeUrl : null
  return sendTransactionalEmail({
    to: email,
    subject: `Your whales moved — ${totalCount} trade${totalCount === 1 ? '' : 's'} in the last 24h`,
    html: renderEmailShell({
      title: 'Your whales moved',
      subtitle: 'Daily briefing on the wallets you follow',
      bodyHtml,
      footerNote: `You're receiving this because you follow these wallets on Sonar. `
        + (unsub ? `<a href="${escapeHtml(unsub)}" style="color:#9ca3af;">Turn off Sonar emails</a> with one click, or ` : '')
        + `set your notification style to Quiet under <a href="${ALERTS_SETTINGS_URL}" style="color:#9ca3af;">Dashboard → Personal → Alerts</a>. Market data is informational only and not investment advice.`,
    }),
    headers: unsub ? { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : null,
  })
}

// Wallet sign-ins get a placeholder address (<0x…>@wallet.sonartracker.io)
// that no mailbox receives; never send to it.
export function isDeliverableEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) && !/@wallet\.sonartracker\.io$/i.test(e.trim())
}

// Alert email: the user's ORCA notifications since their last alert email
// (cadence and daily cap live in lib/orca/alerts/emailNotifications.ts). Each
// row deep-links to what moved — the wallet page for wallet alerts, the
// article for news, the token page otherwise.
function alertHref(n) {
  const raw = (n && n.payload && n.payload.raw) || {}
  if (n.kind === 'wallet_activity' && typeof raw.address === 'string' && raw.address) {
    return `https://www.sonartracker.io/wallet-tracker/${encodeURIComponent(raw.address)}`
  }
  if (typeof raw.url === 'string') {
    try {
      const u = new URL(raw.url)
      if (u.protocol === 'https:' || u.protocol === 'http:') return u.href // normalised: quotes/brackets percent-encoded
    } catch { /* fall through */ }
  }
  const t = String(n.ticker || '').trim()
  if (t && t !== '_ALL_' && /^[A-Za-z0-9]{1,15}$/.test(t)) return `https://www.sonartracker.io/token/${encodeURIComponent(t.toLowerCase())}`
  return 'https://www.sonartracker.io/dashboard'
}

const ALERTS_SETTINGS_URL = 'https://www.sonartracker.io/dashboard/personal?tab=alerts'

export async function sendAlertEmail(email, items = [], { total, unsubscribeUrl } = {}) {
  const list = Array.isArray(items) ? items.filter(Boolean) : []
  if (list.length === 0 || !isDeliverableEmail(email)) return false
  const count = Math.max(Number(total) || 0, list.length)
  const rows = list
    .map((n) => linkRow(alertHref(n), escapeHtml(n.title || 'Alert'), `${escapeHtml(n.body || '')} <span style="color:#6b7280;">· ${timeAgo(n.created_at)}</span>`))
    .join('')
  const more = count > list.length
    ? linkRow('https://www.sonartracker.io/dashboard', `+${count - list.length} more`, 'Open your ORCA inbox to see the rest')
    : ''
  const bodyHtml = `
    <p style="margin:0 0 16px;color:#d1d5db;font-size:14px;line-height:1.7;">
      ${count === 1 ? 'One of your alerts fired.' : `${count} of your alerts fired since your last alert email.`}
      Here is what moved:
    </p>
    ${rows}
    ${more}
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 8px;">
      <tr><td style="border-radius:8px;background:#22d3ee;">
        <a href="https://www.sonartracker.io/dashboard" style="display:inline-block;padding:11px 24px;color:#0a1621;font-weight:700;font-size:14px;text-decoration:none;">Open Sonar →</a>
      </td></tr>
    </table>`
  const unsub = typeof unsubscribeUrl === 'string' && unsubscribeUrl ? unsubscribeUrl : null
  const footerNote = `You're receiving this because you switched on alert emails for your Sonar account. `
    + (unsub ? `<a href="${escapeHtml(unsub)}" style="color:#9ca3af;">Turn off alert emails</a> with one click, or ` : 'Turn them off ')
    + `under <a href="${ALERTS_SETTINGS_URL}" style="color:#9ca3af;">Dashboard → Personal → Alerts</a>. Market data is informational only and not investment advice.`
  return sendTransactionalEmail({
    to: email,
    subject: count === 1 ? `Sonar alert: ${String(list[0].title || '').slice(0, 80)}` : `Sonar: ${count} alerts fired`,
    html: renderEmailShell({
      title: count === 1 ? 'Your alert fired' : `${count} alerts fired`,
      subtitle: 'Live from the wallets and tokens you asked Sonar to watch',
      bodyHtml,
      footerNote,
    }),
    headers: unsub ? { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : null,
  })
}

// Double opt-in for alert emails (lib/notifications/emailConsent.ts): sent
// once when someone whose address is not provider-verified switches alert
// emails on. Nothing else is emailed until they confirm.
export async function sendAlertEmailConfirmation(email, confirmUrl) {
  if (!isDeliverableEmail(email) || typeof confirmUrl !== 'string' || !confirmUrl) return false
  const bodyHtml = `
    <p style="margin:0 0 16px;color:#d1d5db;font-size:14px;line-height:1.7;">
      Someone (hopefully you) asked Sonar to email this address when the wallets and
      tokens they follow move. Confirm and we will start sending alert emails.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:18px 0 8px;">
      <tr><td style="border-radius:8px;background:#22d3ee;">
        <a href="${escapeHtml(confirmUrl)}" style="display:inline-block;padding:11px 24px;color:#0a1621;font-weight:700;font-size:14px;text-decoration:none;">Confirm alert emails</a>
      </td></tr>
    </table>
    <p style="margin:14px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">
      Didn't ask for this? Ignore this email and nothing else will be sent. The link expires in 7 days.
    </p>`
  return sendTransactionalEmail({
    to: email,
    subject: 'Confirm your Sonar alert emails',
    html: renderEmailShell({
      title: 'Confirm alert emails',
      subtitle: 'One click and Sonar will email you when your wallets move',
      bodyHtml,
      footerNote: `This is a one-time confirmation for ${escapeHtml(email)}. Alerts always show in your Sonar inbox either way.`,
    }),
  })
}

function timeAgo(ts) {
  const ms = Date.now() - new Date(ts).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'just now'
  const h = Math.floor(ms / 3600000)
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60000))}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// Shared dark shell — same skin as the weekly campaign emails.
function renderEmailShell({ title, subtitle, bodyHtml, footerNote }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#060c14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e5e7eb;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060c14;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#0b1422;border:1px solid #1f2937;border-radius:12px;">
        <tr><td style="padding:24px 28px 8px;">
          <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#22d3ee;font-weight:700;"><span style="font-size:14px;">&#9673;</span>&nbsp; Sonar Tracker</div>
          <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:800;">${title}</h1>
          ${subtitle ? `<div style="margin:6px 0 0;color:#9ca3af;font-size:13px;">${subtitle}</div>` : ''}
        </td></tr>
        <tr><td style="padding:12px 28px 8px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px 24px;color:#6b7280;font-size:11px;line-height:1.6;border-top:1px solid #1f2937;">
          ${footerNote}
          <br/>Questions? <a href="mailto:eduardo@sonartracker.io" style="color:#22d3ee;">eduardo@sonartracker.io</a>
          &nbsp;·&nbsp; © 2026 Sonar Tracker
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function linkRow(href, label, description) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #1f2937;">
          <a href="${escapeHtml(href)}" style="color:#22d3ee;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>
          <div style="color:#9ca3af;font-size:13px;margin-top:2px;">${description}</div>
        </td>
      </tr>
    </table>`
}

function getWelcomeEmailHTML(email, name = '', stats = null) {
  const displayName = name || email.split('@')[0]

  const hook = stats?.totalUsd
    ? `Hi ${escapeHtml(displayName)} — in the last 24 hours, the whales Sonar tracks moved
       <strong style="color:#ffffff;">${fmtUsdCompact(stats.totalUsd)}+</strong> on-chain.
       Most people find out what they did days later. You get to watch it live.`
    : `Hi ${escapeHtml(displayName)} — whales move markets long before the headlines catch up.
       Your account is live: from now on you can watch every big on-chain move as it happens.`

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#d1d5db;font-size:14px;line-height:1.7;">
      ${hook}
    </p>
    <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;font-weight:700;margin:0 0 2px;">Start here</div>
    ${linkRow('https://www.sonartracker.io/wallet-tracker', 'Open the Whale Terminal', 'Pick any wallet and crack it open — live holdings, every entry and exit, and a backtest of what mirroring it would have looked like.')}
    ${linkRow('https://www.sonartracker.io/trending', 'See what they’re buying', 'Tokens whales are rotating into right now — ranked by real net flow, not social-media noise.')}
    ${linkRow('https://www.sonartracker.io/news', 'Read the tape, not the takes', 'Real-time headlines scored by market sentiment, next to what the big wallets actually did.')}
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 8px;">
      <tr><td style="border-radius:8px;background:#22d3ee;">
        <a href="https://www.sonartracker.io/dashboard" style="display:inline-block;padding:11px 24px;color:#0a1621;font-weight:700;font-size:14px;text-decoration:none;">See what whales are doing right now &rarr;</a>
      </td></tr>
    </table>`

  return renderEmailShell({
    title: 'Welcome to Sonar Tracker',
    subtitle: 'You can see what the biggest wallets on-chain are doing. They can’t see you.',
    bodyHtml,
    footerNote: `You're receiving this because an account was created on Sonar Tracker with ${escapeHtml(email)}. If this wasn't you, you can ignore this email. Market data is informational only — not investment advice.`,
  })
}

function getWaitlistEmailHTML(email) {
  const bodyHtml = `
    <p style="margin:0 0 16px;color:#d1d5db;font-size:14px;line-height:1.7;">
      Your spot is locked in. The moment early access opens, you'll be the first to know —
      one email, no spam in between.
    </p>
    <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;font-weight:700;margin:0 0 2px;">While you wait, the whales are live</div>
    ${linkRow('https://www.sonartracker.io/wallet-tracker', 'Open the Whale Terminal', 'Pick any wallet and crack it open — live holdings, every entry and exit.')}
    ${linkRow('https://www.sonartracker.io/trending', 'See what they’re buying', 'Tokens whales are rotating into right now, ranked by real net flow.')}
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 8px;">
      <tr><td style="border-radius:8px;background:#22d3ee;">
        <a href="https://www.sonartracker.io/wallet-tracker" style="display:inline-block;padding:11px 24px;color:#0a1621;font-weight:700;font-size:14px;text-decoration:none;">Watch the whales live &rarr;</a>
      </td></tr>
    </table>`

  return renderEmailShell({
    title: "You're in",
    subtitle: 'Early access, reserved. Here’s what you can already do today.',
    bodyHtml,
    footerNote: `You're receiving this because ${escapeHtml(email)} joined a Sonar Tracker waitlist. You can unsubscribe at any time.`,
  })
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
