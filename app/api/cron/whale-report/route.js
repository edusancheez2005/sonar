/**
 * CRON: Auto Whale Report - AI-Generated Blog Post
 * Schedule: Every 3 days at 10am UTC
 * 
 * Pulls real whale data, signals, and market narrative from existing tables.
 * Uses Grok (xAI) to generate an SEO-optimized blog post with real data.
 * Stores in blog_posts table for dynamic rendering.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Gather real data from existing tables
    const now = new Date()
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString()

    // Latest signals
    const { data: signals } = await supabaseAdmin
      .from('token_signals')
      .select('token, signal, score, confidence, price_at_signal, computed_at')
      .gte('computed_at', threeDaysAgo)
      .order('computed_at', { ascending: false })
      .limit(30)

    // Latest whale whisper (AI narrative)
    const { data: whispers } = await supabaseAdmin
      .from('whale_whispers')
      .select('narrative, tokens_covered, created_at')
      .order('created_at', { ascending: false })
      .limit(1)

    // Top whale transactions — fetch more for accurate volume stats
    const { data: whaleTxs } = await supabaseAdmin
      .from('all_whale_transactions')
      .select('token_symbol, usd_value, transaction_type, blockchain, timestamp')
      .gte('timestamp', threeDaysAgo)
      .order('usd_value', { ascending: false })
      .limit(2000)

    // Sentiment scores
    const { data: sentiment } = await supabaseAdmin
      .from('sentiment_scores')
      .select('ticker, score, label, source_count, window_start')
      .order('window_start', { ascending: false })
      .limit(20)

    // Deduplicate signals by token
    const latestSignals = {}
    for (const s of (signals || [])) {
      if (!latestSignals[s.token]) latestSignals[s.token] = s
    }

    // Calculate stats
    const totalWhaleTxs = (whaleTxs || []).length
    const totalVolume = (whaleTxs || []).reduce((sum, t) => sum + (Number(t.usd_value) || 0), 0)
    const buyTxs = (whaleTxs || []).filter(t => t.transaction_type === 'buy')
    const sellTxs = (whaleTxs || []).filter(t => t.transaction_type === 'sell')
    const buyRatio = totalWhaleTxs > 0 ? ((buyTxs.length / totalWhaleTxs) * 100).toFixed(1) : '50'

    const fmtVol = totalVolume >= 1e9 ? `$${(totalVolume / 1e9).toFixed(2)}B` :
                   totalVolume >= 1e6 ? `$${(totalVolume / 1e6).toFixed(1)}M` : `$${(totalVolume / 1e3).toFixed(0)}K`

    // Format date range
    const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const dateStart = new Date(threeDaysAgo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const dateEnd = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    // 2. Build data context for AI
    const dataContext = `
WHALE ACTIVITY REPORT (${dateStart} - ${dateEnd}):

Total whale transactions: ${totalWhaleTxs}
Total volume: ${fmtVol}
Buy/Sell ratio: ${buyRatio}% buys
Top buy tokens: ${buyTxs.slice(0, 5).map(t => `${t.token_symbol} ($${(Number(t.usd_value)/1e6).toFixed(1)}M)`).join(', ')}
Top sell tokens: ${sellTxs.slice(0, 5).map(t => `${t.token_symbol} ($${(Number(t.usd_value)/1e6).toFixed(1)}M)`).join(', ')}

ACTIVE SIGNALS:
${Object.values(latestSignals).map(s => `${s.token}: ${s.signal} (confidence: ${s.confidence}%, price: $${s.price_at_signal})`).join('\n')}

MARKET SENTIMENT:
${(sentiment || []).slice(0, 10).map(s => `${s.ticker}: ${s.label} (score: ${s.score})`).join('\n')}

LATEST AI NARRATIVE:
${whispers?.[0]?.narrative || 'No narrative available'}
`

    // 3. Generate blog post with AI
    const slug = `whale-report-${now.toISOString().slice(0, 10)}`

    // Check if post already exists — if so, update it
    const { data: existing } = await supabaseAdmin
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      // Update existing post with fresh data
      const { error: updateError } = await supabaseAdmin
        .from('blog_posts')
        .update({ title, description, content, updated_at: new Date().toISOString() })
        .eq('slug', slug)

      if (updateError) {
        return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, slug, title, updated: true, stats: { totalWhaleTxs, totalVolume: fmtVol, buyRatio } })
    }

    // Initialize AI client inside handler (not module scope)
    const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || ''
    const xai = new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' })

    const completion = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        {
          role: 'system',
          content: `You are a crypto market analyst writing for Sonar Tracker's blog. Write SEO-optimized, data-driven articles about whale activity. Use real data provided. Write in a professional but accessible tone. Format in clean HTML with <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags. No markdown. Include specific numbers and percentages from the data. Target keywords: "crypto whale tracker", "whale activity", "whale movements", "crypto signals". Article should be 800-1200 words.`
        },
        {
          role: 'user',
          content: `Write a blog post titled "Whale Activity Report: ${dateStart} - ${dateEnd}" using this real data:\n\n${dataContext}\n\nStructure:\n1. Opening paragraph summarizing the period\n2. "Key Whale Movements" section with top transactions\n3. "Signal Analysis" section with current buy/sell signals\n4. "Market Sentiment" section\n5. "What This Means for Traders" actionable insights\n6. Brief closing paragraph\n\nReturn ONLY the HTML content (no title, no wrapper divs). Start with the first <p> tag.`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    })

    const content = completion.choices?.[0]?.message?.content || ''

    if (!content || content.length < 200) {
      return NextResponse.json({ ok: false, error: 'AI generated insufficient content' }, { status: 500 })
    }

    const title = `Whale Activity Report: ${dateStart} - ${dateEnd} | ${fmtVol} Volume, ${buyRatio}% Buy Ratio`
    const description = `Real-time whale tracking report for ${dateStart}-${dateEnd}. ${totalWhaleTxs} whale transactions totaling ${fmtVol}. ${buyRatio}% buy ratio. AI-powered signal analysis and market sentiment breakdown.`

    // 4. Store in database
    const { error: insertError } = await supabaseAdmin
      .from('blog_posts')
      .insert({
        slug,
        title,
        description,
        content,
        category: 'whale-report',
        tags: ['whale-tracking', 'market-analysis', 'crypto-signals', 'whale-movements'],
      })

    if (insertError) {
      console.error('Failed to insert blog post:', insertError)
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      slug,
      title,
      stats: { totalWhaleTxs, totalVolume: fmtVol, buyRatio },
    })

  } catch (err) {
    console.error('Whale report cron error:', err)
    return NextResponse.json({ ok: false, error: err.message || 'Internal error' }, { status: 500 })
  }
}
