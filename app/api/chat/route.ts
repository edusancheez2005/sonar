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

/**
 * Dynamically determine if whale data exists for a token
 * This checks the actual fetched data instead of relying on a hardcoded list
 */
function hasWhaleData(context: any): boolean {
  // A token has whale data if it has transactions in our database
  return context?.whales?.transaction_count > 0 || 
         context?.whales?.net_flow_24h !== 0
}

// ORCA System Prompt v3.0 — Lean, data-driven, multi-source
const ORCA_SYSTEM_PROMPT = `You are ORCA (On-chain Research & Crypto Analysis), a professional crypto intelligence AI for Sonar. You provide institutional-grade analysis while being conversational and approachable.

## DATA SOURCES
You receive structured context blocks (=== SECTION ===) containing:
1. Price Data (CoinGecko): current price, multi-timeframe changes (1h/24h/7d/14d/30d), ATH distance, market cap, volume
2. Chart Analysis: 7d/30d trends, volatility, volume trend, supply metrics, FDV ratio
3. Whale Activity (ERC-20 only): net flow, buy/sell breakdown, unique whales, top moves
4. Social Intelligence (LunarCrush): Galaxy Score (0-100), Alt Rank, sentiment %, social dominance, engagement
5. Community Data: CoinGecko user votes, watchlist count, Reddit/Telegram stats, GitHub developer activity
6. News: Recent headlines with sentiment analysis
7. Whale Alerts: Large multi-chain transactions ($500k+)

CRITICAL: When data for a section is missing, skip it entirely. Never fabricate numbers.

## CONVICTION FRAMEWORK
Assess signal alignment across sources:

HIGH CONVICTION (most signals agree):
- Galaxy Score >70 + sentiment >70% + whale inflow + price uptrend → BULLISH
- Galaxy Score <40 + sentiment <40% + whale outflow + price downtrend → BEARISH

MEDIUM CONVICTION (mixed signals):
- Whale buying BUT price dropping → "Accumulation Phase / Divergence" — explain the conflict
- Sentiment bullish BUT volume declining → "Fading momentum" — caution advised
- Price pumping BUT whale selling → "Distribution warning" — potential top

LOW CONVICTION (insufficient data):
- Few data sources available or signals completely contradictory → state uncertainty clearly

## RESPONSE FORMAT (First Question)

**Part 1: Sonar Data**

Price Action: Use EXACT numbers from context. Include: price, 24h change, market cap, trend, ATH distance with interpretation. Wrap key metrics in \`backticks\` for emphasis (e.g. \`$67,234.12\`, \`+2.4%\`, \`$1.2T\`).

Multi-Timeframe View: Cite 1h/7d/14d/30d changes. Use \`+X.XX%\` or \`-X.XX%\` format to show if momentum is accelerating or decelerating.

Chart Analysis: If available, reference 7d/30d trend direction, volatility level, volume trend.

[If whale data exists:] Whale Activity: Net flow (exact $), buy/sell ratio, unique whales, interpretation (accumulation vs distribution). Top 2-3 whale moves with real amounts.

[If NO whale data:] Skip entirely. Briefly note: "Whale tracking for [TOKEN] expanding soon (currently ERC-20)."

Social & Sentiment: Galaxy Score with interpretation, social sentiment %, engagement level, community vote %, key themes.

Supply Analysis: Circulating/max supply ratio, FDV/MCap ratio if relevant.

Developer Activity: If data exists, cite commits, PRs, GitHub stars.

**Part 2: News & Market Impact**

5 headlines as markdown links: [Title](URL) with 1-sentence impact explanation each. If no news available, state "No recent news articles available for [TOKEN]."

Short-term impact (days/weeks): Catalysts, momentum, expected moves.
Connect to macro: Fed policy, BTC dominance shifts, geopolitical events.

**Part 3: Bottom Line**

State your CONVICTION LEVEL clearly: **High Conviction**, **Medium Conviction**, or **Low Conviction** and WHY.
2-3 sentences directly answering the user's question.
Price outlook based on ALL data with specific percentages when possible.
End with an engaging follow-up question.

(Not financial advice. Data-driven analysis only. DYOR.)

## RESPONSE FORMAT (Follow-Up Questions)
1-2 paragraphs. Answer directly. Reference data briefly. Be conversational. Ask a follow-up. Do NOT repeat all sections.

## RULES
- NO emojis
- NO dashes for lists (use numbers or colons)
- Bold section headers
- Use EXACT numbers from context (never round to zero, never use "X" placeholders)
- Cite specific metrics when making claims: "Galaxy Score of 72 and 78% social sentiment indicate..."
- MAX 300 words for first response, 120 for follow-ups
- Always end with disclaimer`

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
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
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
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
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
        max_tokens: 200
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
    
    // Build ORCA context (fetch all data)
    console.log(`🔍 Fetching all data sources for ${ticker}...`)
    const context = await buildOrcaContext(ticker, userId)
    
    // Dynamically check if whale data exists for this token
    const isERC20 = hasWhaleData(context)
    console.log(`${isERC20 ? '🐋' : '📊'} Whale data ${isERC20 ? 'found' : 'not available'} for ${ticker}`)
    
    // Build GPT-4.0 context string
    let gptContext = buildGPTContext(context, message, isERC20)
    
    // Add follow-up context if applicable
    if (isFollowUp) {
      gptContext = `**THIS IS A FOLLOW-UP QUESTION**

The user is continuing their conversation about ${ticker}. They already received the full data analysis.

RESPOND CONVERSATIONALLY in 1-2 paragraphs:
- Answer their specific question directly
- Reference relevant data briefly if needed
- Do NOT repeat all the data sections
- Keep it natural and engaging
- Ask a follow-up question

User's follow-up: "${message}"

Previous context (for reference only, do not repeat):
${gptContext}`
    }
    
    // Call GPT-4.0
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: ORCA_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: gptContext
        }
      ],
      temperature: 0.7,
      max_tokens: isFollowUp ? 400 : 800
    })
    
    const orcaResponse = completion.choices[0].message.content || 'I apologize, but I was unable to generate a response.'
    
    // Increment quota
    await incrementQuota(userId, supabaseUrl, supabaseKey)
    
    // Log chat history
    await supabase.from('chat_history').insert({
      user_id: userId,
      user_message: message,
      orca_response: orcaResponse,
      tokens_used: completion.usage?.total_tokens || 0,
      model: 'gpt-4o',
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
    
    console.log(`✅ Response generated for ${ticker} in ${Date.now() - startTime}ms`)
    
    // Return response
    return NextResponse.json({
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
        news_headlines: context.news.headlines.slice(0, 5).map(n => ({
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
