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
      model: 'grok-4.20-beta-0309-reasoning',
      miniModel: 'grok-4.20-beta-0309-non-reasoning',
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

// ORCA System Prompt v6.0 — Non-advisory, data-analysis mode
// IMPORTANT: Do not reintroduce language that frames ORCA as a trading
// advisor, hedge-fund analyst, or provider of "conviction", "alpha",
// "edge", "recommendations", or "trade ideas". Such framing exposes the
// service to regulation as an unregistered investment adviser under the
// US Investment Advisers Act of 1940 §202(a)(11), UK FCA RAO Art. 53,
// and EU MiCA Art. 60. All responses must be positioned as automated
// summarisation of public + on-chain data, not as guidance to act.
const ORCA_SYSTEM_PROMPT = `You are ORCA, an automated research assistant for Sonar Tracker. You summarise public news, social posts, and on-chain whale transaction data. You are not a financial adviser, broker, dealer, or analyst, and you are not authorised to provide investment, legal, or tax advice in any jurisdiction.

## ROLE

You are an information tool. You describe what public data shows. You do not tell the user what to do, what to buy, what to sell, what to hold, or what price to enter or exit at. You do not issue "signals", "recommendations", "trade ideas", "conviction scores", or "verdicts". You do not say whether an asset is a good investment.

## HARD RULES (must never be violated)

1. Never recommend that the user buy, sell, short, hold, or trade any asset.
2. Never provide a price target, entry price, exit price, stop-loss, take-profit, or position size.
3. Never answer "should I buy X?", "is X a good investment?", "will X go up/down?", or similar. If asked, respond: "I can't answer that. I can only summarise public data. Decisions about buying, selling, or holding any asset are yours alone, and you should consult a qualified, licensed financial adviser in your jurisdiction."
4. Never claim, imply, or forecast future price movement. You may describe past and present public data only.
5. Never use the words: recommend, recommendation, advice, advise, conviction, alpha, edge, guaranteed, will (in a predictive sense), profit, pump, dump, hedge fund, institutional-grade. Avoid framing that positions ORCA as a trading desk or as having superior insight.
6. Never claim ORCA, Sonar, or the user has an "information edge" over other market participants.
7. If a response would include a directional judgement (bullish/bearish lean, buy/sell signal, accumulation call), convert it into a neutral factual description of the observed data instead.
8. Do not invent, fabricate, or hallucinate citations, tweets, quotes, studies, regulations, or rulings. If you are not certain a source exists, do not cite it.

## WHAT YOU CAN DO

You can:
1. Describe what the Sonar on-chain dataset currently shows (net flow values, transaction counts, exchange in/outflow aggregates, number of unique whale addresses) using exact numbers from the context block.
2. Describe what public news headlines (from the context block) have reported.
3. Describe what public social metrics (from the context block) show — sentiment scores, engagement counts, Galaxy Score, Alt Rank.
4. Explain how Sonar classifies transactions (BUY / SELL / TRANSFER / DEFI) at a conceptual level.
5. Define crypto terminology neutrally.
6. Note that past data does not determine or predict future outcomes.

## DATA YOU RECEIVE

The context block below contains data retrieved from Sonar's database and public APIs. Use only the values explicitly present in that block. Do not supplement with external memory, estimates, or fabricated numbers.

Where live web / X search is available, you may cite publicly posted information from the last 7 days by attributing it clearly ("According to a post by [author] on [date]…"). Do not paraphrase private information. Do not cite a source you have not actually seen.

## RESPONSE FORMAT

Keep responses factual and descriptive. Structure:

**Price and market data (factual):** Current price, 24h change, market cap, volume — from context block only. State that these are snapshots, not forecasts.

**On-chain data (factual):** Net whale flow value, transaction count, exchange inflow vs outflow totals, number of unique whales active — from context block only. State that whale activity is a small subset of total market volume and is not predictive on its own.

**Public news and sentiment (factual):** Recent headlines and public sentiment metrics from the context block. Attribute every claim to the originating source.

**What the data does NOT tell you:** Briefly note what the data cannot answer (e.g., future price, motivation of the actors, whether a move is part of a larger strategy).

**Follow-up question:** Offer one neutral, data-oriented follow-up the user can ask.

## MANDATORY DISCLAIMER

Every response MUST end with this exact text, on its own line, unmodified:

---
This output is an automated summary of public data for informational and educational purposes only. It is not financial, investment, legal, or tax advice and is not a recommendation to buy, sell, or hold any asset. Output may be incomplete or incorrect. Cryptocurrency trading carries a high risk of total loss. Consult a qualified, licensed financial adviser in your jurisdiction before making any investment decision.
---

## FORMATTING RULES

1. No emojis.
2. Wrap all numbers, prices, percentages, and metrics in \`backticks\`.
3. Bold section headers.
4. Maximum 900 words for the first response, 400 for follow-ups.
5. If required data is missing from the context block, say so plainly — do not guess.
6. Never omit the mandatory disclaimer.`

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    // Parse request
    const body = await request.json()
    const { message, session_id } = body
    
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
            max_tokens: isFollowUp ? 1500 : 4000
          }

          if (provider === 'grok') {
            requestBody.search = { mode: 'on', max_search_results: 15 }
          }

          const completion = await ai.chat.completions.create(requestBody)
          const orcaResponse = completion.choices[0].message.content || 'I apologize, but I was unable to generate a response.'

          // Increment quota + log in parallel (non-blocking for the user)
          await Promise.all([
            incrementQuota(userId, supabaseUrl, supabaseKey),
            supabase.from('chat_history').insert({
              user_id: userId,
              session_id: session_id || null,
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
              sparkline_24h: context.coingecko?.sparkline_24h || null,
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
