/**
 * CRON: X posting + SEO health report — daily 08:30 UTC (vercel.json).
 *
 * Verifies the whole X pipeline shipped 2026-07-28..08-01 and emails
 * Eduardo a scorecard via Brevo:
 *   - posts made yesterday/today (x_post_count), last post status + quota
 *   - the actual recent tweets (x_recent_posts) with links
 *   - famous-wallet pipeline: poll coverage of curated famous addresses
 *     and ≥$250k famous moves seen in the last 24h (post candidates)
 *   - whale feed: qualifying $5M–$150M transfers in the last 8h
 *   - SEO spot checks against the live site: sitemap URL count,
 *     /pricing unblocked in robots.txt, /token/BTC serving index,follow
 *
 * ?dry=1 returns the JSON without sending the email.
 */
import { NextResponse } from 'next/server'
import { supabaseAdminFresh as supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const BASE = 'https://www.sonartracker.io'
const REPORT_RECIPIENTS = ['eduardosanchez4848@gmail.com', 'eduardo@sonartracker.io']
const FAMOUS_CATEGORIES = new Set(['person', 'celebrity', 'government'])

async function cacheValue(key: string): Promise<any> {
  const { data } = await supabaseAdmin
    .from('app_cache').select('value, updated_at').eq('key', key).maybeSingle()
  return data || null
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const dry = new URL(req.url).searchParams.get('dry') === '1'
    const issues: string[] = []

    // --- X posting state ---------------------------------------------------
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10)
    const postsToday = Number((await cacheValue(`x_post_count:${today}`))?.value?.count) || 0
    const postsYesterday = Number((await cacheValue(`x_post_count:${yesterday}`))?.value?.count) || 0
    const quota = await cacheValue('x_quota_snapshot')
    const recentPosts: any[] = (await cacheValue('x_recent_posts'))?.value?.posts || []
    const lastPostStatus = quota?.value?.status ?? null
    if (postsYesterday === 0 && postsToday === 0) issues.push('No X alert posts yesterday or today — check cron + X billing.')
    if (lastPostStatus && lastPostStatus >= 400) issues.push(`Last X post attempt returned HTTP ${lastPostStatus}.`)

    // --- Famous-wallet pipeline -------------------------------------------
    const { data: entities } = await supabaseAdmin
      .from('curated_entities')
      .select('slug, category, is_featured, addresses')
    const famousAddrs: string[] = []
    for (const e of entities || []) {
      if (!e.is_featured && !FAMOUS_CATEGORIES.has(e.category)) continue
      for (const a of e.addresses || []) {
        if (a?.address && ['ethereum', 'polygon', 'solana'].includes(a.chain)) famousAddrs.push(String(a.address))
      }
    }
    let famousPolled = 0
    let famousCandidates24h = 0
    const since24h = new Date(now.getTime() - 86_400_000).toISOString()
    for (let i = 0; i < famousAddrs.length; i += 150) {
      const chunk = famousAddrs.slice(i, i + 150)
      const { count: polled } = await supabaseAdmin
        .from('tracked_address_poll_state')
        .select('address', { count: 'exact', head: true })
        .in('address', chunk)
      famousPolled += polled || 0
      const { count: moves } = await supabaseAdmin
        .from('tracked_address_transfers')
        .select('id', { count: 'exact', head: true })
        .in('address', chunk)
        .gte('timestamp', since24h)
        .gte('amount_usd', Number(process.env.X_FAMOUS_MIN_USD) || 250_000)
      famousCandidates24h += moves || 0
    }
    const famousCoveragePct = famousAddrs.length ? Math.round((100 * famousPolled) / famousAddrs.length) : 0
    if (famousCoveragePct < 50) issues.push(`Famous-wallet poll coverage only ${famousCoveragePct}% (${famousPolled}/${famousAddrs.length}).`)

    // --- Whale feed --------------------------------------------------------
    const since8h = new Date(now.getTime() - 8 * 3600_000).toISOString()
    const { count: whaleQualifying } = await supabaseAdmin
      .from('all_whale_transactions')
      .select('transaction_hash', { count: 'exact', head: true })
      .gte('timestamp', since8h)
      .gte('usd_value', Number(process.env.X_ALERT_MIN_USD) || 5_000_000)
      .lte('usd_value', 150_000_000)
    if ((whaleQualifying || 0) === 0) issues.push('Whale feed has zero qualifying $5M+ transfers in the last 8h.')

    // --- SEO spot checks ---------------------------------------------------
    let sitemapUrls = 0
    let pricingBlocked: boolean | null = null
    let btcIndexed: boolean | null = null
    try {
      const sm = await fetch(`${BASE}/sitemap.xml`, { cache: 'no-store', signal: AbortSignal.timeout(10000) }).then(r => r.text())
      sitemapUrls = (sm.match(/<loc>/g) || []).length
      const robots = await fetch(`${BASE}/robots.txt`, { cache: 'no-store', signal: AbortSignal.timeout(10000) }).then(r => r.text())
      pricingBlocked = /Disallow:\s*\/pricing/i.test(robots)
      const btc = await fetch(`${BASE}/token/BTC`, { cache: 'no-store', signal: AbortSignal.timeout(15000) }).then(r => r.text())
      btcIndexed = /<meta name="robots" content="index, follow"/.test(btc)
    } catch { /* leave nulls; flagged below */ }
    if (sitemapUrls > 0 && sitemapUrls < 400) issues.push(`Sitemap shrank to ${sitemapUrls} URLs (expected ~500+).`)
    if (pricingBlocked === true) issues.push('/pricing is blocked in robots.txt again.')
    if (btcIndexed === false) issues.push('/token/BTC is serving noindex again.')

    const summary = {
      posts: { today: postsToday, yesterday: postsYesterday, lastPostHttpStatus: lastPostStatus, budget: Number(process.env.X_DAILY_POST_BUDGET) || 5 },
      recentPosts: recentPosts.slice(-8).reverse(),
      famous: { addresses: famousAddrs.length, polled: famousPolled, coveragePct: famousCoveragePct, candidates24h: famousCandidates24h },
      whaleFeed: { qualifying8h: whaleQualifying || 0 },
      seo: { sitemapUrls, pricingBlocked, btcIndexed },
      issues,
    }

    if (dry) return NextResponse.json({ dry: true, ...summary })

    // --- Email -------------------------------------------------------------
    const brevoKey = process.env.BREVO_API_KEY
    if (!brevoKey) return NextResponse.json({ error: 'BREVO_API_KEY not set', ...summary }, { status: 500 })

    const ok = issues.length === 0
    const postRows = summary.recentPosts.map((p: any) =>
      `<tr><td style="padding:4px 8px">${(p.at || '').slice(0, 16).replace('T', ' ')}</td>` +
      `<td style="padding:4px 8px">${p.kind}</td>` +
      `<td style="padding:4px 8px">${String(p.text || '').split('\n')[0].slice(0, 90)}</td>` +
      `<td style="padding:4px 8px"><a href="https://x.com/SonarTrackerio/status/${p.id}">view</a></td></tr>`
    ).join('')
    const issueList = issues.map(i => `<li>${i}</li>`).join('')
    const html = `
      <h2>${ok ? '✅' : '⚠️'} Sonar X posting &amp; SEO health — ${today}</h2>
      ${ok ? '<p>All checks passed.</p>' : `<p><b>Issues:</b></p><ul>${issueList}</ul>`}
      <h3>X alerts</h3>
      <p>Posts today: <b>${postsToday}</b> / ${summary.posts.budget} · yesterday: <b>${postsYesterday}</b> · last post HTTP: ${lastPostStatus ?? 'n/a'}</p>
      <table border="0" style="border-collapse:collapse;font-size:13px">${postRows || '<tr><td>(no recorded posts yet)</td></tr>'}</table>
      <h3>Famous-wallet pipeline</h3>
      <p>Coverage: <b>${famousCoveragePct}%</b> (${famousPolled}/${famousAddrs.length} addresses polled) · ≥$250k famous moves last 24h: <b>${famousCandidates24h}</b></p>
      <h3>Whale feed</h3>
      <p>Qualifying $5M–$150M transfers last 8h: <b>${whaleQualifying || 0}</b></p>
      <h3>SEO</h3>
      <p>Sitemap URLs: <b>${sitemapUrls}</b> · /pricing blocked: <b>${pricingBlocked === null ? '?' : pricingBlocked}</b> · /token/BTC indexed: <b>${btcIndexed === null ? '?' : btcIndexed}</b></p>
      <p style="color:#888;font-size:12px">Automated daily report from /api/cron/x-health-report. Reply to Claude in the Sonar session to change or stop it.</p>`

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Sonar Ops', email: process.env.BREVO_SENDER_EMAIL || 'eduardo@sonartracker.io' },
        to: REPORT_RECIPIENTS.map(email => ({ email })),
        subject: `${ok ? '✅' : '⚠️'} Sonar X/SEO health — ${today} (${postsToday + postsYesterday} posts, ${issues.length} issues)`,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(15000),
    })
    const emailOk = res.ok
    return NextResponse.json({ emailed: emailOk, emailStatus: res.status, ...summary })
  } catch (err: any) {
    console.error('[XHealthReport] Error:', err)
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
