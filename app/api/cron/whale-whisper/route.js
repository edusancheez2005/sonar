/**
 * CRON: Whale Whisper — AI Market Narrative Generator
 * Schedule: Every 4 hours
 * 
 * Aggregates whale activity, derivatives positioning, and price data
 * across top tokens. Feeds data to Grok to generate a concise,
 * insightful market narrative. Stores in whale_whispers table.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TOP_TOKENS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'PEPE']

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch latest signals for top tokens
    const { data: signals } = await supabaseAdmin
      .from('token_signals')
      .select('token, signal, score, confidence, price_at_signal, tier1_score, tier2_score, tier3_score, computed_at')
      .in('token', TOP_TOKENS)
      .order('computed_at', { ascending: false })
      .limit(50)

    // Deduplicate to latest per token
    const latestSignals = {}
    for (const s of (signals || [])) {
      if (!latestSignals[s.token]) latestSignals[s.token] = s
    }

    // 2. Fetch whale transactions (last 4 hours)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    const { data: whaleTxs } = await supabaseAdmin
      .from('all_whale_transactions')
      .select('token_symbol, classification, usd_value, blockchain')
      .gte('timestamp', fourHoursAgo)
      .not('usd_value', 'is', null)
      .order('usd_value', { ascending: false })
      .limit(500)

    // Aggregate whale data per token
    const whaleAgg = {}
    for (const tx of (whaleTxs || [])) {
      const sym = tx.token_symbol
      if (!whaleAgg[sym]) whaleAgg[sym] = { buys: 0, sells: 0, buyVol: 0, sellVol: 0, total: 0 }
      const val = Number(tx.usd_value) || 0
      whaleAgg[sym].total += val
      if (tx.classification === 'BUY') { whaleAgg[sym].buys++; whaleAgg[sym].buyVol += val }
      else if (tx.classification === 'SELL') { whaleAgg[sym].sells++; whaleAgg[sym].sellVol += val }
    }

    // 3. Fetch derivatives data for BTC and ETH (most telling)
    const derivData = {}
    for (const token of ['BTC', 'ETH', 'SOL']) {
      const symbol = `${token}USDT`
      try {
        const [fundingRes, lsRes, topRes, takerRes] = await Promise.all([
          fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`, { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=4h&limit=1`, { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=4h&limit=1`, { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${symbol}&period=4h&limit=1`, { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : []).catch(() => []),
        ])

        derivData[token] = {
          fundingRate: fundingRes[0] ? (parseFloat(fundingRes[0].fundingRate) * 100).toFixed(4) + '%' : 'N/A',
          retailLongPct: lsRes[0] ? (parseFloat(lsRes[0].longAccount) * 100).toFixed(1) + '%' : 'N/A',
          topTraderLongPct: topRes[0] ? (parseFloat(topRes[0].longAccount) * 100).toFixed(1) + '%' : 'N/A',
          takerBuySellRatio: takerRes[0] ? parseFloat(takerRes[0].buySellRatio).toFixed(3) : 'N/A',
        }
      } catch { derivData[token] = null }
    }

    // 4. Fetch 24h price changes
    const priceData = {}
    try {
      const res = await fetch('https://data-api.binance.vision/api/v3/ticker/24hr', { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const tickers = await res.json()
        for (const t of tickers) {
          if (t.symbol.endsWith('USDT')) {
            const sym = t.symbol.replace('USDT', '')
            if (TOP_TOKENS.includes(sym)) {
              priceData[sym] = {
                price: parseFloat(t.lastPrice),
                change24h: parseFloat(t.priceChangePercent).toFixed(2) + '%',
                volume: '$' + formatCompact(parseFloat(t.quoteVolume)),
              }
            }
          }
        }
      }
    } catch {}

    // 5. Build context for Grok
    const dataContext = buildDataContext(latestSignals, whaleAgg, derivData, priceData)

    // 6. Generate narrative with Grok
    const xaiKey = process.env.XAI_API_KEY
    if (!xaiKey) {
      return NextResponse.json({ error: 'XAI_API_KEY not configured' }, { status: 500 })
    }

    const ai = new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' })

    const completion = await ai.chat.completions.create({
      model: 'grok-4.20-0309-reasoning',
      messages: [
        {
          role: 'system',
          content: `You are Sonar's market intelligence analyst. Write a concise, data-driven market narrative (2-3 paragraphs, ~150-200 words). 

Rules:
- Lead with the most important signal or divergence
- Reference specific numbers: dollar volumes, percentages, ratios
- Identify patterns: "The last 3 times this pattern occurred, X happened"
- End with a clear bias statement (bullish/bearish/neutral) with conviction level
- Tone: professional, direct, no hype. Like a Bloomberg terminal analyst
- No emojis. No disclaimers about financial advice
- Use terminal-style formatting: ALL CAPS for emphasis on key terms

Also provide:
1. A one-line summary (max 80 chars)
2. Market bias: "bullish", "bearish", or "neutral"
3. Confidence: 0-100`
        },
        {
          role: 'user',
          content: `Generate a Whale Whisper market narrative from this data (last 4 hours):\n\n${dataContext}\n\nRespond in JSON format:\n{"narrative": "...", "summary": "...", "market_bias": "bullish|bearish|neutral", "confidence": 0-100}`
        }
      ],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    })

    let result
    try {
      result = JSON.parse(completion.choices[0].message.content)
    } catch {
      result = {
        narrative: completion.choices[0].message.content,
        summary: 'Market update generated',
        market_bias: 'neutral',
        confidence: 50,
      }
    }

    // 7. Store in Supabase
    const keyTokens = Object.keys(latestSignals).filter(t => 
      whaleAgg[t]?.total > 100000 || ['BTC', 'ETH', 'SOL'].includes(t)
    )

    const { error: insertErr } = await supabaseAdmin
      .from('whale_whispers')
      .insert({
        narrative: result.narrative,
        summary: result.summary,
        market_bias: result.market_bias,
        confidence: result.confidence,
        key_tokens: keyTokens,
        data_snapshot: { signals: latestSignals, whales: whaleAgg, derivatives: derivData, prices: priceData },
      })

    if (insertErr) {
      console.error('[WhaleWhisper] Insert error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      narrative: result.narrative,
      summary: result.summary,
      bias: result.market_bias,
      confidence: result.confidence,
      tokens_analyzed: Object.keys(latestSignals).length,
      whale_txs: (whaleTxs || []).length,
    })
  } catch (err) {
    console.error('[WhaleWhisper] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function buildDataContext(signals, whaleAgg, derivData, priceData) {
  let ctx = '=== SIGNAL SUMMARY ===\n'
  for (const [token, s] of Object.entries(signals)) {
    const p = priceData[token]
    ctx += `${token}: ${s.signal} (score ${s.score}/100, conf ${s.confidence}%) | `
    ctx += p ? `$${p.price} (${p.change24h} 24h) vol ${p.volume}` : 'no price data'
    ctx += '\n'
  }

  ctx += '\n=== WHALE ACTIVITY (4H) ===\n'
  const sorted = Object.entries(whaleAgg).sort((a, b) => b[1].total - a[1].total).slice(0, 10)
  for (const [token, w] of sorted) {
    ctx += `${token}: ${w.buys} buys ($${formatCompact(w.buyVol)}) / ${w.sells} sells ($${formatCompact(w.sellVol)}) | Net: $${formatCompact(w.buyVol - w.sellVol)}\n`
  }

  ctx += '\n=== DERIVATIVES (Binance Futures) ===\n'
  for (const [token, d] of Object.entries(derivData)) {
    if (d) {
      ctx += `${token}: Funding ${d.fundingRate} | Retail ${d.retailLongPct} long | Top traders ${d.topTraderLongPct} long | Taker ratio ${d.takerBuySellRatio}\n`

      // Flag divergences
      const retailLong = parseFloat(d.retailLongPct)
      const topLong = parseFloat(d.topTraderLongPct)
      if (!isNaN(retailLong) && !isNaN(topLong) && Math.abs(retailLong - topLong) > 8) {
        ctx += `  >> DIVERGENCE: Retail ${retailLong > topLong ? 'MORE' : 'LESS'} bullish than smart money by ${Math.abs(retailLong - topLong).toFixed(1)}pp\n`
      }
    }
  }

  return ctx
}

function formatCompact(n) {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return `${Math.round(n)}`
}
