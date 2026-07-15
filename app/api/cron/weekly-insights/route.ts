/**
 * CRON: Weekly Whale Pulse — Saturday Insights + Email Send
 * Schedule: Every Saturday at 14:00 UTC
 * 
 * 1. Pulls last 7 days: news, whale moves, sentiment, prices, key voices
 * 2. Claude analyzes with full context (fallback: Grok)
 * 3. Generates branded email HTML
 * 4. Stores in weekly_insights table in Supabase
 * 5. Sends email campaign via Brevo API to List #3
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const { searchParams } = new URL(request.url)
  const secret = authHeader?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const brevoKey = process.env.BREVO_API_KEY
  if (!brevoKey) return NextResponse.json({ error: 'BREVO_API_KEY not set' }, { status: 500 })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const xaiKey = process.env.XAI_API_KEY
  if (!anthropicKey && !xaiKey) return NextResponse.json({ error: 'No AI provider configured (need ANTHROPIC_API_KEY or XAI_API_KEY)' }, { status: 500 })

  const sb = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setHours(0, 0, 0, 0)
  const weekStart = new Date(weekEnd)
  weekStart.setDate(weekStart.getDate() - 7)

  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr = weekEnd.toISOString().split('T')[0]
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  // dry_run=1: run the full pipeline (data gathering + AI + HTML) but skip the
  // DB insert, blog post, and Brevo send. Bypasses the already-sent dedup so
  // the pipeline can be verified mid-week without emailing the list.
  const dryRun = searchParams.get('dry_run') === '1'

  if (!dryRun) {
    // Check if already generated this week
    const { data: existing } = await sb
      .from('weekly_insights')
      .select('id, emails_sent, html_body, subject')
      .eq('week_start', weekStartStr)
      .single()

    // If already generated AND already sent, skip
    if (existing && existing.emails_sent > 0) {
      return NextResponse.json({ message: 'Already generated and sent for this week', id: existing.id })
    }

    // If generated but NOT sent, retry just the Brevo send
    if (existing && existing.emails_sent === 0 && existing.html_body) {
      const retryResult = await sendBrevoEmail(brevoKey, sanitizeSubject(existing.subject, weekLabel), existing.html_body, weekLabel)
      if (retryResult.sent) {
        await sb.from('weekly_insights').update({ emails_sent: 1 }).eq('id', existing.id)
      }
      return NextResponse.json({ message: 'Retried Brevo send for existing row', id: existing.id, ...retryResult })
    }
  }

  // ─── STEP 1: Gather raw data (max context for Claude) ─────────

  // ALL news articles from the week
  const { data: newsItems } = await sb
    .from('news_items')
    // NB: selecting a non-existent column (the old tokens_mentioned) makes
    // PostgREST fail the whole query and return null — news_in was 0 on every
    // run since launch because of it. Only select columns that exist.
    .select('title, source, sentiment_llm, ticker, published_at')
    .gte('published_at', weekStart.toISOString())
    .order('published_at', { ascending: false })
    .limit(500)

  // Whale transactions summary from unified view ($1M+)
  const whaleData: any[] = []
  const { data: whaleTxs } = await sb
    .from('all_whale_transactions')
    .select('token_symbol, classification, usd_value, from_label, to_label, blockchain, timestamp')
    .gte('timestamp', weekStart.toISOString())
    .gte('usd_value', 1000000)
    .order('usd_value', { ascending: false })
    .limit(200)
  
  if (whaleTxs) {
    whaleData.push(...whaleTxs.map(d => ({
      symbol: d.token_symbol,
      transaction_type: d.classification?.toLowerCase() || 'transfer',
      value_usd: d.usd_value,
      from_label: d.from_label,
      to_label: d.to_label,
      chain: d.blockchain,
      timestamp: d.timestamp,
    })))
  }

  // ALL sentiment scores for the week
  const { data: sentimentData } = await sb
    .from('news_items')
    .select('sentiment_llm, published_at')
    .gte('published_at', weekStart.toISOString())
    .not('sentiment_llm', 'is', null)

  // Top social posts by engagement
  const { data: topSocial } = await sb
    .from('social_posts')
    .select('creator_name, creator_screen_name, body, interactions, published_at')
    .gte('published_at', weekStart.toISOString())
    .order('interactions', { ascending: false })
    .limit(50)

  // 7-day price changes from price_snapshots (majors + tokens whales touched).
  // Without this the model has no price data at all, and the never-fabricate
  // rule makes it correctly return an empty price_movers array — which is why
  // the PRICE MOVERS section came out blank.
  const priceTickers = [...new Set([
    'BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE', 'ADA', 'LINK', 'AVAX', 'TRX',
    ...whaleData.map(w => (w.symbol || '').toUpperCase()).filter(Boolean),
  ])].slice(0, 40)

  let priceDigest = ''
  try {
    const [{ data: earlyRows }, { data: lateRows }] = await Promise.all([
      sb.from('price_snapshots')
        .select('ticker, price_usd, timestamp')
        .in('ticker', priceTickers)
        .gte('timestamp', weekStart.toISOString())
        .order('timestamp', { ascending: true })
        .limit(priceTickers.length * 5),
      sb.from('price_snapshots')
        .select('ticker, price_usd, timestamp')
        .in('ticker', priceTickers)
        .order('timestamp', { ascending: false })
        .limit(priceTickers.length * 5),
    ])
    // Keep the first row seen per ticker (rows are already sorted).
    const firstPerTicker = (rows: any[] | null) => {
      const out: Record<string, { price: number; ts: string }> = {}
      for (const r of rows || []) {
        const t = (r.ticker || '').toUpperCase()
        const p = Number(r.price_usd)
        if (!t || !p || t in out) continue
        out[t] = { price: p, ts: r.timestamp }
      }
      return out
    }
    const early = firstPerTicker(earlyRows)
    const late = firstPerTicker(lateRows)
    priceDigest = Object.keys(late)
      .filter(t => early[t] && early[t].ts !== late[t].ts)
      .map(t => {
        const pct = ((late[t].price - early[t].price) / early[t].price) * 100
        return `${t}: $${early[t].price} (${early[t].ts.slice(0, 10)}) → $${late[t].price} (${late[t].ts.slice(0, 10)}) | ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
      })
      .join('\n')
  } catch (e: any) {
    console.error('Price digest failed (non-fatal):', e.message)
  }

  // ─── STEP 2: AI Analysis (Claude primary, Grok fallback) ───────

  // Feed ALL the data — Claude Opus has huge context
  const newsDigest = (newsItems || [])
    .filter(n => n.title && n.title.length > 10 && !n.title.toLowerCase().startsWith('untitled'))
    .map(n =>
    `[sent:${n.sentiment_llm?.toFixed(2) || '?'}] ${n.title} | ${n.source} | ticker: ${n.ticker || 'general'} | ${n.published_at}`
  ).join('\n')

  // Collapse repeated transfers along the same route into one line. One entity
  // shuffling funds can produce dozens of near-identical rows — the Jul 11
  // email headlined ~50 same-route WBTC transfers as 50 separate accumulation
  // events. Aggregating gives the model the honest picture: one flow, N txs.
  const flows = new Map<string, { count: number; total: number; sample: any }>()
  for (const w of whaleData) {
    const key = `${w.chain}|${w.symbol}|${w.transaction_type}|${w.from_label || '?'}|${w.to_label || '?'}`
    const f = flows.get(key)
    if (f) { f.count++; f.total += w.value_usd }
    else flows.set(key, { count: 1, total: w.value_usd, sample: w })
  }
  const whaleDigest = [...flows.values()]
    .sort((a, b) => b.total - a.total)
    .map(({ count, total, sample: w }) =>
      `${w.chain} | ${w.symbol || '?'} | ${w.transaction_type || 'transfer'} | ${count === 1 ? `$${(total / 1e6).toFixed(1)}M | ${w.timestamp}` : `${count} txs totaling $${(total / 1e6).toFixed(1)}M across the week`} | from: ${w.from_label || '?'} → to: ${w.to_label || '?'}`
    ).join('\n')

  const sentStats = (() => {
    if (!sentimentData || sentimentData.length === 0) return 'No sentiment data'
    const avg = sentimentData.reduce((s, n) => s + (n.sentiment_llm || 0), 0) / sentimentData.length
    const bullish = sentimentData.filter(n => (n.sentiment_llm || 0) > 0.15).length
    const bearish = sentimentData.filter(n => (n.sentiment_llm || 0) < -0.15).length
    const neutral = sentimentData.length - bullish - bearish
    return `Total: ${sentimentData.length} articles | Avg score: ${avg.toFixed(3)} | Bullish: ${bullish} | Bearish: ${bearish} | Neutral: ${neutral}`
  })()

  const socialDigest = (topSocial || []).map(p =>
    `@${p.creator_screen_name} (${p.interactions} interactions): "${(p.body || '').slice(0, 200)}" | ${p.published_at}`
  ).join('\n')

  const systemPrompt = `You are a senior crypto market analyst writing the "Whale Pulse" weekly insights email for Sonar Tracker, a crypto whale intelligence platform.

Today is Friday. You have access to a FULL WEEK of real data from our platform: every news article, every whale transaction over $1M, sentiment scores, and top social posts.

Analyze ALL of this data carefully and produce a comprehensive, data-driven weekly summary.

Return ONLY valid JSON with this exact structure:
{
  "subject": "Whale Pulse: [clear, specific 5-8 word summary of the week's biggest story — describe, don't dramatize. Banned in subjects: massive, huge, insane, shocking, explosive, unprecedented, dominates, soars, skyrockets]",
  "summary": "3-4 sentence overview tying together the week's biggest themes. Reference specific numbers, tokens, and events.",
  "top_news": [
    {"title": "Full headline", "source": "source name", "impact": "2-3 sentences on WHY this matters for crypto markets and what it signals", "sentiment": "bullish/bearish/neutral"}
  ],
  "whale_moves": [
    {"token": "BTC", "direction": "accumulation/distribution/transfer", "volume_usd": 50000000, "narrative": "2 sentences: what happened and what it likely signals"}
  ],
  "sentiment_shift": {
    "overall": "bullish/bearish/neutral",
    "score": 0.35,
    "trend": "improving/declining/stable",
    "btc": "bullish/neutral/bearish",
    "eth": "bullish/neutral/bearish",
    "narrative": "3-4 sentences on what drove sentiment this week, citing specific events and data points"
  },
  "price_movers": [
    {"token": "TOKEN", "change_pct": 15.2, "narrative": "2 sentences: what caused the move and what to watch next"}
  ],
  "key_voices": [
    {"name": "Full Name", "quote": "Their actual or paraphrased statement", "sentiment": "bullish/bearish/neutral"}
  ]
}

RULES:
- Include 5-7 top_news (the most market-moving stories)
- Include 5-6 whale_moves (biggest and most significant) — ONLY if whale data is provided. If no whale data, return an empty array []
- Whale data lines marked "N txs totaling $X" are repeated transfers along the SAME route (same from/to) — that is ONE entity's flow. Report it as a single move, never as N separate events, and be skeptical: same-owner shuffling, custody rotation, or wrapping is NOT market accumulation unless the counterparties suggest otherwise
- Include 5-6 price_movers (top gainers AND losers) — ONLY from the PRICE DATA section provided. If no price data, return an empty array []
- Include 4-5 key_voices (most influential statements)
- Use REAL data from the inputs — NEVER fabricate numbers, volumes, or events
- If a section has no data, use an empty array — do NOT invent placeholder entries
- Cross-reference: if whale accumulation happened before a price move, connect them
- Be specific: use exact dollar amounts, percentages, dates
- Write for sophisticated crypto traders who want alpha, not fluff
- TONE: clean, sleek, professional. NO emojis anywhere — not in the subject, summary, titles, or narratives. No exclamation marks, no hype words ("massive", "insane", "moon"). Plain, confident, factual.
Return ONLY valid JSON. No markdown, no code blocks.`

  const userPrompt = `WEEK: ${weekLabel}

═══════════════════════════════════════════
NEWS ARTICLES (${(newsItems || []).length} total, with sentiment scores -1 to +1):
═══════════════════════════════════════════
${newsDigest || 'No news data available'}

═══════════════════════════════════════════
WHALE TRANSACTIONS >$1M (${whaleData.length} total):
═══════════════════════════════════════════
${whaleDigest || 'No whale data available'}

═══════════════════════════════════════════
SENTIMENT ANALYSIS:
═══════════════════════════════════════════
${sentStats}

═══════════════════════════════════════════
PRICE DATA (7-day change from platform price snapshots):
═══════════════════════════════════════════
${priceDigest || 'No price data available'}

═══════════════════════════════════════════
TOP SOCIAL POSTS BY ENGAGEMENT (${(topSocial || []).length} total):
═══════════════════════════════════════════
${socialDigest || 'No social data available'}

Analyze ALL of this data and generate the comprehensive weekly insights JSON. Cross-reference whale moves with news events. Identify patterns.`

  let raw = ''
  let aiProvider = ''
  let claudeError = ''

  // Try Claude first (better for large context analysis)
  if (anthropicKey) {
    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          // claude-sonnet-4-20250514 retired 2026-06-15 and started 404ing,
          // which silently pushed every send onto the Grok fallback.
          model: 'claude-sonnet-5',
          max_tokens: 8000,
          messages: [
            { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
          ],
        }),
        signal: AbortSignal.timeout(90000),
      })
      if (claudeRes.ok) {
        const claudeData = await claudeRes.json()
        // Sonnet 5 runs adaptive thinking by default, so content[0] can be a
        // thinking block — take the text block, not the first block.
        raw = claudeData.content?.find((b: any) => b.type === 'text')?.text || ''
        if (raw) aiProvider = 'claude'
      } else {
        claudeError = `${claudeRes.status}: ${(await claudeRes.text()).slice(0, 300)}`
        console.error('Claude API error, falling back to Grok:', claudeError)
      }
    } catch (e: any) {
      claudeError = e.message
      console.error('Claude failed, falling back to Grok:', e.message)
    }
  }

  // Fallback to Grok if Claude failed or unavailable
  if (!raw && xaiKey) {
    const OpenAI = (await import('openai')).default
    const ai = new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' })
    const completion = await ai.chat.completions.create({
      model: 'grok-3-fast',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 3000,
      // @ts-ignore
      search: { mode: 'on', max_search_results: 10 }
    })
    raw = completion.choices[0]?.message?.content || ''
    if (raw) aiProvider = 'grok'
  }

  if (!raw) {
    return NextResponse.json({ error: 'Both AI providers failed' }, { status: 500 })
  }
  let insights: any
  try {
    insights = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: raw.slice(0, 500) }, { status: 500 })
  }

  // Belt-and-suspenders: strip any emoji the model slipped in, so the email
  // stays clean/professional even if the prompt is ignored. Founder rule:
  // scheduled emails carry no emojis.
  insights = stripEmojis(insights)

  // Same story for hype words: the prompt bans them, yet 6 of the last 8
  // subjects said "Massive". Enforce in code — the sanitized subject is what
  // gets stored, blogged, and sent.
  insights.subject = sanitizeSubject(insights.subject, weekLabel)

  // ─── STEP 3: Generate Email HTML ──────────────────────────────

  const htmlBody = generateEmailHTML(insights, weekLabel)

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      week: weekLabel,
      ai_provider: aiProvider,
      claude_error: claudeError || undefined,
      subject: insights.subject,
      summary: insights.summary,
      data_counts: {
        news_in: (newsItems || []).length,
        whale_txs_in: whaleData.length,
        social_in: (topSocial || []).length,
        price_tickers_in: priceDigest ? priceDigest.split('\n').length : 0,
        top_news_out: (insights.top_news || []).length,
        whale_moves_out: (insights.whale_moves || []).length,
        price_movers_out: (insights.price_movers || []).length,
        key_voices_out: (insights.key_voices || []).length,
      },
      top_news: insights.top_news || [],
      whale_moves: insights.whale_moves || [],
      price_movers: insights.price_movers || [],
      html_bytes: htmlBody.length,
    })
  }

  // ─── STEP 4: Store in Supabase ────────────────────────────────

  const { data: inserted, error: insertErr } = await sb
    .from('weekly_insights')
    .insert({
      week_start: weekStartStr,
      week_end: weekEndStr,
      subject: insights.subject || `Whale Pulse: Week of ${weekLabel}`,
      summary: insights.summary || '',
      top_news: insights.top_news || [],
      whale_moves: insights.whale_moves || [],
      sentiment_shift: insights.sentiment_shift || {},
      price_movers: insights.price_movers || [],
      key_voices: insights.key_voices || [],
      html_body: htmlBody,
    })
    .select('id')
    .single()

  if (insertErr) {
    return NextResponse.json({ error: 'DB insert failed', details: insertErr.message }, { status: 500 })
  }

  // ─── STEP 4b: Also create a blog post from the same data ─────
  try {
    const blogSlug = `whale-pulse-${weekStartStr}`
    const blogTitle = `${insights.subject || 'Whale Pulse: ' + weekLabel}`
    const blogDescription = insights.summary || `Weekly whale intelligence report for ${weekLabel}. AI-analyzed whale movements, market signals, and sentiment shifts.`

    // Build blog HTML from insights
    const topNewsHtml = (insights.top_news || []).map((n: any) =>
      `<li><strong>${escapeHtml(n.title)}</strong> (${escapeHtml(n.source)}) — ${escapeHtml(n.impact)}</li>`
    ).join('')

    const whaleMovesHtml = (insights.whale_moves || []).map((w: any) =>
      `<li><strong>${escapeHtml(w.token)}</strong> — ${escapeHtml(w.direction)}, $${(w.volume_usd / 1e6).toFixed(1)}M. ${escapeHtml(w.narrative)}</li>`
    ).join('')

    const priceMoversHtml = (insights.price_movers || []).map((p: any) =>
      `<li><strong>${escapeHtml(p.token)}</strong> ${p.change_pct >= 0 ? '+' : ''}${p.change_pct}% — ${escapeHtml(p.narrative)}</li>`
    ).join('')

    const sentShift = insights.sentiment_shift || {}

    const blogContent = `
      <p>${escapeHtml(insights.summary || '')}</p>

      <h2>Market Sentiment: ${(sentShift.overall || 'Neutral').charAt(0).toUpperCase() + (sentShift.overall || 'neutral').slice(1)}</h2>
      <p>${escapeHtml(sentShift.narrative || 'No sentiment data available for this period.')}</p>

      <h2>Top News This Week</h2>
      <ul>${topNewsHtml || '<li>No major news this period.</li>'}</ul>

      <h2>Biggest Whale Movements</h2>
      <ul>${whaleMovesHtml || '<li>No significant whale movements detected.</li>'}</ul>

      <h2>Price Movers</h2>
      <ul>${priceMoversHtml || '<li>No significant price movements.</li>'}</ul>

      <h2>What to Watch Next Week</h2>
      <p>Stay ahead of the market with real-time whale tracking on <a href="https://www.sonartracker.io/dashboard">Sonar Tracker</a>. Our AI-powered signals and whale alerts help you move before the crowd.</p>
    `

    // Delete existing blog post for this week if any, then create
    await sb.from('blog_posts').delete().eq('slug', blogSlug)
    await sb.from('blog_posts').insert({
      slug: blogSlug,
      title: blogTitle,
      description: blogDescription,
      content: blogContent,
      category: 'whale-report',
      tags: ['whale-pulse', 'weekly-report', 'market-analysis', 'whale-movements'],
    })
  } catch (blogErr: any) {
    console.error('Blog post creation failed (non-fatal):', blogErr.message)
  }

  // ─── STEP 5: Send via Brevo Campaign (List #3) ───────────────

  const brevoResult = await sendBrevoEmail(brevoKey, insights.subject || `Whale Pulse: Week of ${weekLabel}`, htmlBody, weekLabel)

  if (inserted?.id) {
    await sb.from('weekly_insights').update({ emails_sent: brevoResult.sent ? 1 : 0 }).eq('id', inserted.id)
  }

  return NextResponse.json({
    success: true,
    id: inserted?.id,
    week: weekLabel,
    subject: insights.subject,
    ai_provider: aiProvider,
    // Input/output row counts — a zero here means a data source was dry and
    // explains a missing email section without digging through the DB.
    data_counts: {
      news_in: (newsItems || []).length,
      whale_txs_in: whaleData.length,
      social_in: (topSocial || []).length,
      price_tickers_in: priceDigest ? priceDigest.split('\n').length : 0,
      top_news_out: (insights.top_news || []).length,
      whale_moves_out: (insights.whale_moves || []).length,
      price_movers_out: (insights.price_movers || []).length,
      key_voices_out: (insights.key_voices || []).length,
    },
    ...brevoResult,
  })
}

// ─── BREVO CAMPAIGN SENDER ────────────────────────────────────

async function sendBrevoEmail(brevoKey: string, subject: string, htmlBody: string, weekLabel: string) {
  try {
    // Create campaign targeting List #3
    const campaignRes = await fetch('https://api.brevo.com/v3/emailCampaigns', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Whale Pulse ${weekLabel}`,
        subject,
        sender: { name: 'Sonar', email: 'eduardo@sonartracker.io' },
        htmlContent: htmlBody,
        recipients: { listIds: [3] },
        inlineImageActivation: false,
      })
    })

    if (!campaignRes.ok) {
      const errText = await campaignRes.text()
      return { sent: false, brevo_error: `Campaign creation failed (${campaignRes.status}): ${errText}` }
    }

    const campaign = await campaignRes.json()

    // Send immediately
    const sendRes = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaign.id}/sendNow`, {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
    })

    if (!sendRes.ok) {
      const errText = await sendRes.text()
      return { sent: false, campaignId: campaign.id, brevo_error: `Send failed (${sendRes.status}): ${errText}` }
    }

    return { sent: true, campaignId: campaign.id, emails_sent: 1 }
  } catch (e: any) {
    return { sent: false, brevo_error: e.message }
  }
}

// ─── EMAIL HTML GENERATOR ─────────────────────────────────────────

function generateEmailHTML(insights: any, weekLabel: string): string {
  const sentColor = (s: string) =>
    s === 'bullish' ? '#00e676' : s === 'bearish' ? '#ff1744' : '#8a9bb5'
  const sentBg = (s: string) =>
    s === 'bullish' ? 'rgba(0,230,118,0.1)' : s === 'bearish' ? 'rgba(255,23,68,0.1)' : 'rgba(138,155,181,0.1)'

  const topNewsHTML = (insights.top_news || []).map((n: any) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1a2d3d;">
        <div style="font-size:14px;font-weight:700;color:#e0e6ed;margin-bottom:4px;">${escapeHtml(n.title)}</div>
        <div style="font-size:12px;color:#8a9bb5;">${escapeHtml(n.source)} · <span style="color:${sentColor(n.sentiment)};font-weight:600;">${(n.sentiment || 'neutral').toUpperCase()}</span></div>
        <div style="font-size:12px;color:#6a7a8a;margin-top:2px;">${escapeHtml(n.impact)}</div>
      </td>
    </tr>`).join('')

  const whaleMoveHTML = (insights.whale_moves || []).map((w: any) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #1a2d3d;">
        <div style="font-size:13px;color:#e0e6ed;">
          <span style="color:#36a6ba;font-weight:700;">${escapeHtml(w.token)}</span> — 
          ${escapeHtml(w.direction)} · $${(w.volume_usd / 1e6).toFixed(1)}M
        </div>
        <div style="font-size:12px;color:#6a7a8a;">${escapeHtml(w.narrative)}</div>
      </td>
    </tr>`).join('')

  const priceMoverHTML = (insights.price_movers || []).map((p: any) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #1a2d3d;">
        <span style="font-weight:700;color:#e0e6ed;">${escapeHtml(p.token)}</span>
        <span style="color:${p.change_pct >= 0 ? '#00e676' : '#ff1744'};font-weight:600;margin-left:8px;">
          ${p.change_pct >= 0 ? '+' : ''}${p.change_pct}%
        </span>
        <div style="font-size:12px;color:#6a7a8a;margin-top:2px;">${escapeHtml(p.narrative)}</div>
      </td>
    </tr>`).join('')

  const voicesHTML = (insights.key_voices || []).map((v: any) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #1a2d3d;">
        <div style="font-size:13px;font-weight:700;color:#e0e6ed;">${escapeHtml(v.name)}</div>
        <div style="font-size:12px;color:#8a9bb5;font-style:italic;margin-top:2px;">"${escapeHtml(v.quote)}"</div>
      </td>
    </tr>`).join('')

  const sentShift = insights.sentiment_shift || {}

  // A section with no rows renders as a bare header (like the empty TOP NEWS /
  // PRICE MOVERS in the Jul 11 send) — drop it from the email entirely instead.
  const section = (title: string, rowsHTML: string) => rowsHTML ? `
  <tr><td style="padding:0 30px 20px;">
    <div style="font-size:12px;font-weight:700;color:#36a6ba;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:10px;">${title}</div>
    <table cellpadding="0" cellspacing="0" width="100%">${rowsHTML}</table>
  </td></tr>` : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#060c14;font-family:Inter,Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" width="100%" style="background:#060c14;">
<tr><td align="center" style="padding:20px;">
<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#080f18;border-radius:8px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="padding:30px;text-align:center;border-bottom:1px solid #1a2d3d;">
    <img src="https://www.sonartracker.io/logo2.png" alt="Sonar" width="132" style="display:block;margin:0 auto 14px;">
    <div style="font-size:12px;color:#36a6ba;letter-spacing:1px;text-transform:uppercase;font-weight:700;"><span style="font-size:14px;">&#9673;</span>&nbsp; Sonar · Whale Pulse</div>
    <div style="font-size:12px;color:#6a7a8a;margin-top:6px;">Weekly insights · ${escapeHtml(weekLabel)}</div>
  </td></tr>

  <!-- Summary -->
  <tr><td style="padding:24px 30px;">
    <div style="font-size:18px;font-weight:700;color:#36a6ba;margin-bottom:10px;">This Week in Crypto</div>
    <div style="font-size:14px;color:#c5ced6;line-height:1.6;">${escapeHtml(insights.summary || '')}</div>
    <div style="margin-top:14px;padding:12px 16px;border-radius:6px;background:${sentBg(sentShift.overall || 'neutral')};">
      <span style="font-size:13px;font-weight:700;color:${sentColor(sentShift.overall || 'neutral')};">
        MARKET SENTIMENT: ${(sentShift.overall || 'neutral').toUpperCase()}
      </span>
      <span style="font-size:12px;color:#8a9bb5;margin-left:8px;">${sentShift.trend || ''} week-over-week</span>
      ${sentShift.narrative ? `<div style="font-size:12px;color:#8a9bb5;margin-top:4px;">${escapeHtml(sentShift.narrative)}</div>` : ''}
    </div>
  </td></tr>

  ${section('TOP NEWS', topNewsHTML)}

  ${section('BIGGEST WHALE MOVES', whaleMoveHTML)}

  ${section('PRICE MOVERS', priceMoverHTML)}

  ${section('KEY VOICES', voicesHTML)}

  <!-- CTA -->
  <tr><td style="padding:20px 30px;text-align:center;">
    <a href="https://sonartracker.io/dashboard" style="display:inline-block;background:#36a6ba;color:#fff;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">
      Open Your Dashboard →
    </a>
    <div style="font-size:12px;color:#6a7a8a;margin-top:12px;">See the full data behind these insights on Sonar</div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 30px;background:#060c14;border-top:1px solid #1a2d3d;">
    <div style="font-size:13px;color:#36a6ba;font-weight:700;">Sonar Tracker</div>
    <div style="font-size:12px;color:#5a6a7a;margin-top:4px;">AI-Powered Whale Intelligence · sonartracker.io</div>
    <div style="font-size:11px;color:#5a6a7a;margin-top:10px;">
      You're receiving this because you signed up at sonartracker.io.<br>
      <a href="{{ unsubscribe }}" style="color:#5a6a7a;text-decoration:underline;">Unsubscribe</a>
    </div>
    <div style="font-size:10px;color:#3a4a5a;margin-top:8px;">
      This is not financial advice. Cryptocurrency trading involves significant risk. Past performance does not guarantee future results.
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Drop hype adjectives the model keeps sneaking into subjects despite the
// prompt ban. Falls back to a neutral subject if nothing usable remains.
function sanitizeSubject(subject: string, weekLabel: string): string {
  const HYPE = /\b(massive|huge|insane|shocking|explosive|unprecedented|epic|monster|wild|crazy|parabolic)\b/gi
  const cleaned = String(subject || '')
    .replace(HYPE, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,:;.])/g, '$1')
    .trim()
  if (!cleaned || /^whale pulse:?$/i.test(cleaned)) return `Whale Pulse: Week of ${weekLabel}`
  return cleaned
}

// Recursively remove emoji / pictographs from all strings in the AI payload.
function stripEmojis<T>(value: T): T {
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}\u{20E3}]/gu
  if (typeof value === 'string') {
    return value.replace(EMOJI, '').replace(/\s{2,}/g, ' ').trim() as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((v) => stripEmojis(v)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(value as any)) out[k] = stripEmojis(v)
    return out
  }
  return value
}
