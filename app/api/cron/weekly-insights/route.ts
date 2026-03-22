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
  const secret = searchParams.get('secret') || authHeader?.replace('Bearer ', '')
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

  // Check if already generated this week
  const { data: existing } = await sb
    .from('weekly_insights')
    .select('id')
    .eq('week_start', weekStartStr)
    .single()
  if (existing) {
    return NextResponse.json({ message: 'Already generated for this week', id: existing.id })
  }

  // ─── STEP 1: Gather raw data (max context for Claude) ─────────

  // ALL news articles from the week
  const { data: newsItems } = await sb
    .from('news_items')
    .select('title, source, sentiment_llm, tokens_mentioned, published_at')
    .gte('published_at', weekStart.toISOString())
    .order('published_at', { ascending: false })
    .limit(500)

  // Whale transactions summary (aggregate from all chains, $1M+)
  const chains = ['ethereum', 'bitcoin', 'solana', 'polygon']
  const whaleData: any[] = []
  for (const chain of chains) {
    const { data } = await sb
      .from(`${chain}_transactions`)
      .select('symbol, transaction_type, value_usd, from_label, to_label, timestamp')
      .gte('timestamp', weekStart.toISOString())
      .gte('value_usd', 1000000)
      .order('value_usd', { ascending: false })
      .limit(50)
    if (data) whaleData.push(...data.map(d => ({ ...d, chain })))
  }

  // ALL sentiment scores for the week
  const { data: sentimentData } = await sb
    .from('news_items')
    .select('sentiment_llm, tokens_mentioned, published_at')
    .gte('published_at', weekStart.toISOString())
    .not('sentiment_llm', 'is', null)

  // Top social posts by engagement
  const { data: topSocial } = await sb
    .from('social_posts')
    .select('creator_name, creator_screen_name, body, interactions, published_at')
    .gte('published_at', weekStart.toISOString())
    .order('interactions', { ascending: false })
    .limit(50)

  // ─── STEP 2: AI Analysis (Claude primary, Grok fallback) ───────

  // Feed ALL the data — Claude Opus has huge context
  const newsDigest = (newsItems || []).map(n =>
    `[sent:${n.sentiment_llm?.toFixed(2) || '?'}] ${n.title} | ${n.source} | tokens: ${(n.tokens_mentioned || []).join(',')} | ${n.published_at}`
  ).join('\n')

  const whaleDigest = whaleData.map(w =>
    `${w.chain} | ${w.symbol || '?'} | ${w.transaction_type || 'transfer'} | $${(w.value_usd / 1e6).toFixed(1)}M | from: ${w.from_label || '?'} → to: ${w.to_label || '?'} | ${w.timestamp}`
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

  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const systemPrompt = `You are a senior crypto market analyst writing the "Whale Pulse" weekly insights email for Sonar Tracker, a crypto whale intelligence platform.

Today is Friday. You have access to a FULL WEEK of real data from our platform: every news article, every whale transaction over $1M, sentiment scores, and top social posts.

Analyze ALL of this data carefully and produce a comprehensive, data-driven weekly summary.

Return ONLY valid JSON with this exact structure:
{
  "subject": "Whale Pulse: [catchy 5-8 word summary of the week's biggest story]",
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
- Include 5-6 whale_moves (biggest and most significant)
- Include 5-6 price_movers (top gainers AND losers)
- Include 4-5 key_voices (most influential statements)
- Use REAL data from the inputs — never fabricate numbers or events
- Cross-reference: if whale accumulation happened before a price move, connect them
- Be specific: use exact dollar amounts, percentages, dates
- Write for sophisticated crypto traders who want alpha, not fluff
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
TOP SOCIAL POSTS BY ENGAGEMENT (${(topSocial || []).length} total):
═══════════════════════════════════════════
${socialDigest || 'No social data available'}

Analyze ALL of this data and generate the comprehensive weekly insights JSON. Cross-reference whale moves with news events. Identify patterns.`

  let raw = ''

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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [
            { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
          ],
        }),
        signal: AbortSignal.timeout(90000),
      })
      if (claudeRes.ok) {
        const claudeData = await claudeRes.json()
        raw = claudeData.content?.[0]?.text || ''
      }
    } catch (e: any) {
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

  // ─── STEP 3: Generate Email HTML ──────────────────────────────

  const htmlBody = generateEmailHTML(insights, weekLabel)

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

  // ─── STEP 5: Send via Brevo Campaign (List #3) ───────────────

  let emailsSent = 0
  try {
    const subject = insights.subject || `Whale Pulse: Week of ${weekLabel}`

    // Create campaign targeting List #3
    const campaignRes = await fetch('https://api.brevo.com/v3/emailCampaigns', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Whale Pulse ${weekLabel}`,
        subject,
        sender: { name: 'Sonar Tracker', email: 'sonartracker@gmail.com' },
        htmlContent: htmlBody,
        recipients: { listIds: [3] },
        inlineImageActivation: false,
      })
    })

    if (campaignRes.ok) {
      const campaign = await campaignRes.json()
      // Send immediately
      const sendRes = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaign.id}/sendNow`, {
        method: 'POST',
        headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
      })
      if (sendRes.ok) {
        emailsSent = 1
        console.log(`[Whale Pulse] Campaign ${campaign.id} sent to List #3`)
      } else {
        console.error(`[Whale Pulse] Send failed:`, await sendRes.text())
      }
    } else {
      console.error(`[Whale Pulse] Campaign creation failed:`, await campaignRes.text())
    }

    if (inserted?.id) {
      await sb.from('weekly_insights').update({ emails_sent: emailsSent }).eq('id', inserted.id)
    }
  } catch (e: any) {
    console.error('Brevo campaign error:', e.message)
  }

  return NextResponse.json({
    success: true,
    id: inserted?.id,
    week: weekLabel,
    subject: insights.subject,
    emails_sent: emailsSent,
  })
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

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#060c14;font-family:Inter,Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" width="100%" style="background:#060c14;">
<tr><td align="center" style="padding:20px;">
<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#080f18;border-radius:8px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="padding:30px;text-align:center;border-bottom:1px solid #1a2d3d;">
    <img src="https://sonartracker.io/assets/logo2.png" alt="Sonar" width="140" style="display:block;margin:0 auto 12px;">
    <div style="font-family:monospace;font-size:11px;color:#36a6ba;letter-spacing:2px;text-transform:uppercase;">WHALE PULSE // WEEKLY INSIGHTS</div>
    <div style="font-size:12px;color:#6a7a8a;margin-top:6px;">${escapeHtml(weekLabel)}</div>
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

  <!-- Top News -->
  <tr><td style="padding:0 30px 20px;">
    <div style="font-family:monospace;font-size:11px;color:#36a6ba;letter-spacing:1.5px;margin-bottom:10px;">TOP NEWS</div>
    <table cellpadding="0" cellspacing="0" width="100%">${topNewsHTML}</table>
  </td></tr>

  <!-- Whale Moves -->
  <tr><td style="padding:0 30px 20px;">
    <div style="font-family:monospace;font-size:11px;color:#36a6ba;letter-spacing:1.5px;margin-bottom:10px;">🐋 BIGGEST WHALE MOVES</div>
    <table cellpadding="0" cellspacing="0" width="100%">${whaleMoveHTML}</table>
  </td></tr>

  <!-- Price Movers -->
  <tr><td style="padding:0 30px 20px;">
    <div style="font-family:monospace;font-size:11px;color:#36a6ba;letter-spacing:1.5px;margin-bottom:10px;">📊 PRICE MOVERS</div>
    <table cellpadding="0" cellspacing="0" width="100%">${priceMoverHTML}</table>
  </td></tr>

  <!-- Key Voices -->
  <tr><td style="padding:0 30px 20px;">
    <div style="font-family:monospace;font-size:11px;color:#36a6ba;letter-spacing:1.5px;margin-bottom:10px;">🎙 KEY VOICES</div>
    <table cellpadding="0" cellspacing="0" width="100%">${voicesHTML}</table>
  </td></tr>

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
