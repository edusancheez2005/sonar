/**
 * PHASE 2 - ORCA AI: Main Chat Endpoint
 * Handles user questions and returns intelligent responses
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { extractTicker, getTickerNotFoundMessage } from '@/lib/orca/ticker-extractor'
import { checkRateLimit, incrementQuota } from '@/lib/orca/rate-limiter'
import { buildOrcaContext, buildGPTContext } from '@/lib/orca/context-builder'

export const dynamic = 'force-dynamic'

// Use Grok (xAI) as primary AI, fallback to OpenAI if no xAI key
// v2 — force cache invalidation
const getAIClient = () => {
  const xaiKey = process.env.XAI_API_KEY
  console.log(`🤖 AI Provider: ${xaiKey ? 'Grok (xAI)' : 'OpenAI (fallback)'}`)
  if (xaiKey) {
    return {
      client: new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' }),
      model: 'grok-4-1-reasoning',
      miniModel: 'grok-4-1-fast-non-reasoning',
      provider: 'grok'
    }
  }
  return {
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    model: 'gpt-4o',
    miniModel: 'gpt-4o',
    provider: 'openai'
  }
}

/**
 * Dynamically determine if whale data exists for a token
 * This checks the actual fetched data instead of relying on a hardcoded list
 */
function hasWhaleData(context: any): boolean {
  // A token has whale data if it has transactions in our database
  return context?.whales?.transaction_count > 0 || 
         context?.whales?.net_flow_24h !== 0
}

// ORCA System Prompt v4.0 — Grok-powered with live search
const ORCA_SYSTEM_PROMPT = `You are ORCA (On-chain Research & Crypto Analysis), a professional crypto intelligence AI for Sonar Tracker. You combine Sonar's proprietary whale data with LIVE web search to provide the most current, actionable crypto analysis available.

## YOUR CAPABILITIES
1. You receive Sonar's PROPRIETARY DATA (whale flows, on-chain metrics) via context blocks (=== SECTION ===)
2. You can SEARCH THE WEB AND X/TWITTER in real-time for breaking news, market sentiment, and current events
3. You COMBINE both sources to give analysis no other tool can match

## HOW TO USE BOTH SOURCES

**ALWAYS do this for every first question:**
1. Read the Sonar context data (whale flows, prices, sentiment, social) provided below
2. ALSO search the web for the LATEST news and X/Twitter posts about this token in the last 24-48 hours
3. Cross-reference: Do whale movements align with or diverge from public news/sentiment?
4. If whales are buying but news is bearish → that's alpha (smart money accumulation)
5. If whales are selling but news is bullish → that's a warning (distribution into hype)

The DIVERGENCE between whale behavior and public sentiment is where the real alpha lives. Always highlight it.

## SONAR DATA SOURCES (provided in context)
1. Price Data (CoinGecko): current price, multi-timeframe changes (1h/24h/7d/14d/30d), ATH distance, market cap, volume
2. Chart Analysis: 7d/30d trends, volatility, volume trend, supply metrics
3. Whale Activity (ERC-20): net flow, buy/sell breakdown, unique whales, top moves
4. Social Intelligence (LunarCrush): Galaxy Score (0-100), Alt Rank, sentiment %, engagement
5. Community Data: CoinGecko user votes, watchlist count, Reddit/Telegram stats
6. News from DB: Recent headlines with sentiment analysis
7. Whale Alerts: Large multi-chain transactions ($100k+)

CRITICAL: Use EXACT numbers from context. Never fabricate Sonar data. But DO supplement with fresh web search results.

## CONVICTION FRAMEWORK
Assess signal alignment across ALL sources (Sonar data + live web search):

HIGH CONVICTION: Whale data + live news + social sentiment + price action all agree
MEDIUM CONVICTION: Mixed signals — explain the conflict (this is where the best insights are)
LOW CONVICTION: Insufficient data or completely contradictory signals

## RESPONSE FORMAT (First Question)

**Part 1: Sonar Intelligence**
Price Action: EXACT numbers from context. Price, 24h change, market cap, ATH distance. Wrap ALL key numbers in \`backticks\` for visual emphasis (e.g. \`$67,234.12\`, \`+2.4%\`, \`$1.2T\`, \`Galaxy Score 72\`).
Multi-Timeframe: 1h/7d/14d/30d changes showing momentum direction. Format as \`+X.XX%\` or \`-X.XX%\`.
Whale Activity: Net flow, buy/sell ratio, unique whales. Interpretation (accumulation vs distribution). If no whale data, note it briefly.
Social Metrics: Galaxy Score, sentiment %, engagement. All in \`backticks\`.

**Part 2: Live Market Context** (from your web search)
What's happening RIGHT NOW with this token? Breaking news, X/Twitter buzz, upcoming catalysts, regulatory developments, exchange listings, partnerships.
Include 3-5 specific recent items you found with brief impact analysis.
If whales are doing something that contradicts the news → HIGHLIGHT THIS as key insight.

**Part 3: Macro & Geopolitical Context**
ALWAYS search for and include current macro factors affecting crypto right now:
1. US policy: Trump administration crypto stance, SEC/regulatory actions, tariffs, trade wars
2. Federal Reserve: rate decisions, inflation data, quantitative tightening
3. Geopolitical: wars (Ukraine, Middle East), sanctions, BRICS developments
4. Institutional: ETF flows (BTC/ETH), BlackRock/Fidelity moves, corporate treasury buys
5. Market structure: BTC dominance shifts, total market cap trends, DeFi TVL

Connect these macro forces to how they specifically affect the token being analyzed. Example: "Trump's proposed crypto executive order could benefit [TOKEN] because..."

**Part 4: Bottom Line — Bullish or Bearish?**
State CONVICTION LEVEL: **High**, **Medium**, or **Low** and WHY.
Give a CLEAR directional call: is this token looking **bullish** or **bearish** in the short-term (days/weeks) AND long-term (months)?
2-3 sentences connecting whale data + live news + macro context into a coherent outlook.
Price targets or ranges when possible (e.g. "support at \`$X\`, resistance at \`$Y\`").
One engaging follow-up question.

(Not financial advice. Data-driven analysis only. DYOR.)

## RESPONSE FORMAT (Follow-Up Questions)
2-3 paragraphs. Answer directly and thoroughly. Search the web if needed for current context. Be conversational but still data-rich. Include relevant numbers.

## RULES
- NO emojis
- NO dashes for lists (use numbers or colons)
- Bold section headers
- Wrap ALL numbers, prices, percentages, scores in \`backticks\` for visual emphasis
- Cite specific live search results when referencing news
- MAX 800 words for first response, 400 for follow-ups
- Always distinguish "Sonar data shows..." from "Current news indicates..."
- The best insight is always: what whales are doing vs what the market thinks
- Always give a directional opinion (bullish/bearish) — do not sit on the fence unless signals are truly 50/50`

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    // Parse request
    const body = await request.json()
    const { message } = body
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }
    
    // Get user from Supabase Auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get auth token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }
    
    // Verify token and get user
    const token = authHeader.replace('Bearer ', '')
    
    console.log('🔑 Verifying auth token...')
    
    // Add timeout to prevent hanging
    const authPromise = supabase.auth.getUser(token)
    const timeoutPromise = new Promise<{data: {user: null}, error: any}>((_, reject) => 
      setTimeout(() => reject(new Error('Auth verification timed out after 10s')), 10000)
    )
    
    let authResult
    try {
      authResult = await Promise.race([authPromise, timeoutPromise])
    } catch (error) {
      console.error('❌ Auth timeout:', error)
      return NextResponse.json(
        { error: 'Authentication timeout - please refresh and try again' },
        { status: 500 }
      )
    }
    
    const { data: { user }, error: authError } = authResult
    
    if (authError) {
      console.error('❌ Auth error:', authError.message)
      return NextResponse.json(
        { error: 'Unauthorized - invalid token', details: authError.message },
        { status: 401 }
      )
    }
    
    if (!user) {
      console.error('❌ No user found')
      return NextResponse.json(
        { error: 'Unauthorized - user not found' },
        { status: 401 }
      )
    }
    
    console.log(`✅ Authenticated user: ${user.id}`)
    const userId = user.id
    
    // Check rate limit
    const quotaStatus = await checkRateLimit(userId, supabaseUrl, supabaseKey)
    
    if (!quotaStatus.canAsk) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          quota: quotaStatus,
          isRateLimited: true,
          message: quotaStatus.plan === 'free' 
            ? `You've used your ${quotaStatus.limit} free ORCA conversations for today. Upgrade to Pro for 5 questions/day and unlock ORCA's full potential!`
            : `You've used all ${quotaStatus.limit} ORCA conversations for today. Your limit resets at midnight UTC.`
        },
        { status: 429 }
      )
    }
    
    // Extract ticker from message
    let tickerResult = extractTicker(message)
    
    // If no ticker found, try to get last ticker from chat history (for follow-up questions)
    if (!tickerResult.ticker) {
      console.log('📝 No ticker found, checking chat history for context...')
      
      try {
        const { data: lastChat } = await supabase
          .from('chat_history')
          .select('tickers_mentioned')
          .eq('user_id', userId)
          .not('tickers_mentioned', 'is', null)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single()
        
        if (lastChat?.tickers_mentioned && lastChat.tickers_mentioned.length > 0) {
          const lastTicker = lastChat.tickers_mentioned[0]
          console.log(`✅ Using last discussed ticker: ${lastTicker}`)
          
          tickerResult = {
            ticker: lastTicker,
            confidence: 0.6,
            normalized: lastTicker,
            originalMatch: 'from_history'
          }
        }
      } catch (historyError) {
        console.error('Error fetching chat history:', historyError)
      }
    }
    
    if (!tickerResult.ticker) {
      // Handle non-crypto queries with a conversational response
      const { client: ai, miniModel } = getAIClient()
      
      const completion = await ai.chat.completions.create({
        model: miniModel,
        messages: [
          {
            role: 'system',
            content: `You are ORCA AI, a professional crypto intelligence assistant. The user sent a message that doesn't mention a specific cryptocurrency. Respond conversationally and guide them to ask about a crypto asset. 
            
Examples:
- If they say "hi" or "hello": Greet them warmly and ask what crypto they want to learn about
- If they ask a general question: Answer briefly and suggest they ask about a specific coin
- Be friendly, concise (2-3 sentences max), and helpful. No emojis.

Available coins: BTC, ETH, SOL, DOGE, SHIB, PEPE, STRK, LINK, UNI, AAVE, ARB, OP, ADA, XRP, AVAX, DOT, MATIC, and 200+ more tokens.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.8,
        max_tokens: 300
      })
      
      const aiResponse = completion.choices[0]?.message?.content || 
        "Hey! I'm ORCA, your crypto intelligence assistant. I analyze crypto using whale data, sentiment, social insights, and price trends. Which coin do you want me to check out? Try asking about BTC, ETH, SOL, STRK, SHIB, PEPE, LINK, UNI, or any other crypto!"
      
      return NextResponse.json({
        response: aiResponse,
        type: 'conversational'
      })
    }
    
    const ticker = tickerResult.ticker
    const isFollowUp = tickerResult.originalMatch === 'from_history'
    
    if (isFollowUp) {
      console.log(`💬 Follow-up question detected, continuing ${ticker} analysis...`)
    } else {
      console.log(`📊 Analyzing ${ticker} for user ${userId}...`)
    }
    
    // Step labels shown to the user during SSE streaming
    const stepLabels: Record<string, string> = {
      whale_data: 'Scanning whale transactions',
      sentiment: 'Loading sentiment scores',
      news: 'Fetching news from 3 sources',
      price: 'Pulling live price data',
      social: 'Gathering social intelligence',
      whale_alerts: 'Checking large whale alerts',
      lunarcrush: 'Querying LunarCrush metrics',
      charts: 'Loading chart data',
    }

    // SSE streaming response — sends real-time progress as each data source loads
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: Record<string, any>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        }

        try {
          send({ type: 'status', step: 'start', message: `Analyzing ${ticker}...` })

          // Build ORCA context with progress reporting
          const context = await buildOrcaContext(ticker, userId, (step, detail) => {
            send({ type: 'status', step, message: stepLabels[step] || step, detail: detail || '' })
          })

          // Dynamically check if whale data exists for this token
          const isERC20 = hasWhaleData(context)

          // Build GPT context string
          let gptContext = buildGPTContext(context, message, isERC20)

          if (isFollowUp) {
            gptContext = `**THIS IS A FOLLOW-UP QUESTION**\n\nThe user is continuing their conversation about ${ticker}. They already received the full data analysis.\n\nRESPOND CONVERSATIONALLY in 1-2 paragraphs:\n- Answer their specific question directly\n- Reference relevant data briefly if needed\n- Do NOT repeat all the data sections\n- Keep it natural and engaging\n- Ask a follow-up question\n\nUser's follow-up: "${message}"\n\nPrevious context (for reference only, do not repeat):\n${gptContext}`
          }

          // Send AI thinking status
          send({ type: 'status', step: 'ai_thinking', message: 'ORCA analyzing all signals...' })

          // Call Grok/GPT AI
          const { client: ai, model: aiModel, provider } = getAIClient()

          const requestBody: any = {
            model: aiModel,
            messages: [
              { role: 'system', content: ORCA_SYSTEM_PROMPT },
              { role: 'user', content: gptContext }
            ],
            temperature: 0.7,
            max_tokens: isFollowUp ? 1000 : 2400
          }

          if (provider === 'grok') {
            requestBody.search = { mode: 'auto', max_search_results: 8 }
          }

          const completion = await ai.chat.completions.create(requestBody)
          const orcaResponse = completion.choices[0].message.content || 'I apologize, but I was unable to generate a response.'

          // Increment quota + log in parallel (non-blocking for the user)
          await Promise.all([
            incrementQuota(userId, supabaseUrl, supabaseKey),
            supabase.from('chat_history').insert({
              user_id: userId,
              user_message: message,
              orca_response: orcaResponse,
              tokens_used: completion.usage?.total_tokens || 0,
              model: aiModel,
              tickers_mentioned: [ticker],
              data_sources_used: {
                whale: isERC20 && context.whales.transaction_count > 0,
                sentiment: context.sentiment.current !== 0,
                news: context.news.total_count > 0,
                social: context.social.sentiment_pct !== null,
                price: context.price.current > 0
              },
              response_time_ms: Date.now() - startTime
            })
          ])

          console.log(`✅ Response generated for ${ticker} in ${Date.now() - startTime}ms`)

          // Send complete response with all data
          send({
            type: 'complete',
            success: true,
            response: orcaResponse,
            ticker,
            data: {
              price: {
                current: context.price.current,
                change_24h: context.price.change_24h,
                trend: context.price.trend,
                market_cap: context.price.market_cap,
                volume_24h: context.price.volume_24h,
                ath: context.price.ath,
                ath_distance: context.price.ath_distance,
              },
              whale_summary: isERC20 ? {
                net_flow: context.whales.net_flow_24h,
                transactions: context.whales.transaction_count,
                buy_count: context.whales.buy_count,
                sell_count: context.whales.sell_count,
                buy_volume: context.whales.buy_volume,
                sell_volume: context.whales.sell_volume,
                unique_whales: context.whales.unique_whales,
                buy_sell_ratio: context.whales.buy_sell_ratio
              } : null,
              sentiment: {
                score: context.sentiment.current,
                trend: context.sentiment.trend,
                news_count: context.sentiment.news_count
              },
              social: {
                sentiment_pct: context.social.sentiment_pct,
                engagement: context.social.engagement,
                supportive_themes: context.social.supportive_themes.slice(0, 2),
                critical_themes: context.social.critical_themes.slice(0, 2)
              },
              lunarcrush: context.lunarcrush ? {
                galaxy_score: context.lunarcrush.galaxy_score,
                alt_rank: context.lunarcrush.alt_rank,
              } : null,
              sparkline_7d: context.coingecko?.sparkline_7d || null,
              news_headlines: context.news.headlines.slice(0, 5).map((n: any) => ({
                title: n.title || 'Untitled Article',
                url: n.url || '',
                source: n.source || 'unknown',
                sentiment: n.sentiment_llm || 0
              }))
            },
            quota: {
              used: quotaStatus.used + 1,
              limit: quotaStatus.limit,
              remaining: quotaStatus.remaining - 1,
              plan: quotaStatus.plan
            },
            metadata: {
              response_time_ms: Date.now() - startTime,
              tokens_used: completion.usage?.total_tokens || 0
            }
          })

        } catch (err) {
          console.error('Error during SSE stream:', err)
          send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
        }

        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
    
  } catch (error) {
    console.error('Error in chat endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/chat',
    message: 'ORCA AI Chat Endpoint - POST your questions here'
  })
}
