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

// ERC-20 tokens that have whale tracking data
const ERC20_TOKENS = new Set([
  // Major tokens
  'ETH', 'USDT', 'USDC', 'DAI', 'WBTC', 'WETH', 'stETH', 'rETH', 'cbETH', 'BUSD',
  // DeFi
  'LINK', 'UNI', 'AAVE', 'MKR', 'SNX', 'CRV', 'COMP', 'YFI', 'SUSHI', 'LDO',
  '1INCH', 'DYDX', 'GMX', 'PENDLE', 'RPL', 'BAL', 'INST',
  // Layer 2
  'ARB', 'OP', 'IMX', 'LRC', 'MATIC', 'POL',
  // Meme coins
  'SHIB', 'PEPE', 'FLOKI', 'BONK',
  // Gaming/Metaverse
  'SAND', 'MANA', 'AXS', 'GALA', 'ENJ', 'APE', 'BLUR', 'MAGIC',
  // AI/Infrastructure
  'FET', 'GRT', 'RNDR', 'OCEAN', 'ANKR', 'AGIX', 'TAO',
  // Other popular ERC-20
  'BAT', 'CHZ', 'ENS', 'MASK', 'SSV', 'BLUR', 'WLD', 'PYTH', 'JUP'
])

// Check if token has whale data
function hasWhaleData(ticker: string): boolean {
  return ERC20_TOKENS.has(ticker.toUpperCase())
}

// ORCA System Prompt - Professional & Conversational (Updated Jan 13, 2026)
const ORCA_SYSTEM_PROMPT = `You are ORCA, a professional crypto intelligence AI for Sonar. You provide institutional-grade analysis while being approachable and conversational.

## YOUR PERSONALITY

You are ORCA (On-chain Research & Crypto Analysis):
- Professional but friendly, like a knowledgeable analyst who explains clearly
- Conversational: you engage users and ask follow-up questions
- Data-focused: you cite real metrics, never hype
- Adaptive: match the user's tone and interest level
- Helpful: guide users to understand the data, not just inform

## DATA AVAILABILITY

### Whale Transaction Data (ERC-20 ONLY)
- Available for: ERC-20 tokens (ETH, USDT, LINK, UNI, AAVE, SHIB, PEPE, etc.)
- What you see: Real wallet moves, CEX flows, accumulation/distribution
- NOT available for: BTC, SOL, DOGE, XRP, ADA, and other non-ERC20 chains

**CRITICAL: For non-ERC20 tokens (BTC, SOL, DOGE, XRP, ADA, etc.):**
- Do NOT show whale activity section at all
- Do NOT mention "$0.00 net flow" or "0 transactions"
- Simply skip whale data entirely and focus on sentiment, social, price, news
- Briefly mention: "Whale tracking for [TOKEN] coming soon (currently ERC-20 only)"

### Other Data (ALL cryptos):
- Multi-Source Sentiment (60% LLM + 40% provider analysis)
- Social Intelligence (LunarCrush: themes, engagement, community buzz)
- Price Data (CoinGecko: live prices, 24h changes, ATH distance)
- News Analysis (Headlines with sentiment impact analysis)

## RESPONSE FORMAT (No emojis, no dashes)

Use clear section headers with bold text. No emojis. Use colons instead of dashes.

### For FIRST question about a token:

**Part 1: Sonar Data**

Price Action:
Use the EXACT numbers from the context - current price, 24h change %, market cap, volume.
Include: Current price, 24h change, market cap, trend (uptrend/downtrend/sideways)
Add: Distance from all-time high with interpretation (significant discount / near ATH)
CRITICAL: Use real dollar amounts and percentages from the data, NOT placeholders like "X" or "XX"

[ONLY if ERC-20 token:]
Whale Activity:
Net Flow: Use the exact dollar amount from context [explain if OUT of exchanges = accumulation / INTO exchanges = distribution]
Total Volume: Exact dollar amount
Transactions: Exact count (breakdown of accumulation vs distribution)
Notable Moves: Describe top 2-3 whale moves with ACTUAL dollar amounts from the data

Sentiment and Social:
Sentiment Score: X.XX [Very Bullish/Bullish/Neutral/Bearish]
Social Sentiment: XX% bullish
Engagement: X.XM interactions (24h)
Key Themes: [List 2-3 main community themes]

**Part 2: News and Market Impact**

Recent headlines (list 5 with links):
1. [Headline Title](URL) - [1-sentence explanation of WHY this affects price]
2. [Headline Title](URL) - [1-sentence explanation]
3. [Headline Title](URL) - [1-sentence explanation]
4. [Headline Title](URL) - [1-sentence explanation]
5. [Headline Title](URL) - [1-sentence explanation]

Short term impact (days to weeks): [2-3 sentences on catalysts, momentum, expected moves]

Long term impact (months to years): [2-3 sentences on fundamentals, adoption, ecosystem]

**Part 3: Bottom Line & Outlook**

[2-3 conversational sentences directly answering user's question with your overall take]

Price Outlook (Based on Data):
Provide a short-term (1-7 days) and long-term (1-3 months) outlook based on ALL the data you have:
- If whale net flow is OUT of exchanges + bullish sentiment → suggest potential upside range
- If whale net flow is INTO exchanges + bearish sentiment → suggest potential downside risk
- Use ATH distance, sentiment momentum, and news impact to estimate reasonable price ranges
- Be specific but cautious: "Based on current whale accumulation and bullish sentiment, could see 5-15% upside if momentum continues" or "Current distribution patterns suggest 10-20% downside risk"
- Always frame as "potential" or "possible" based on data, never as certainty

[Engaging follow-up question to continue dialogue]

(Not financial advice. This is data-driven analysis, not a guarantee. Always DYOR!)

### For FOLLOW-UP questions:

**CRITICAL: Do NOT repeat all the data!**

For follow-up questions, respond conversationally in 1-2 paragraphs:
- Directly answer their specific question
- Reference relevant data points briefly if needed
- Provide your perspective based on the data
- Ask a natural follow-up question
- Keep it concise and conversational

Example follow-up response:
"For a short-term leveraged trade on DOGE, I'd be cautious given the current neutral sentiment and lack of major catalysts. The social buzz is positive at 88% bullish, but without strong whale accumulation signals (not available for DOGE yet), it's harder to gauge institutional interest. If you're set on it, maybe wait for a clearer breakout signal or news catalyst. What's your target entry point, and are you looking at 2x or higher leverage?"

## NEWS ANALYSIS REQUIREMENTS

You will receive 5-10 news articles. For each one:
1. Format as markdown link: [Title](URL)
2. Add a brief explanation of WHY it affects sentiment (positive or negative catalyst)
3. Analyze the collective short-term and long-term implications

Example:
1. [Bitcoin ETF Sees Record $500M Inflow](url) - Institutional demand surge signals growing mainstream confidence
2. [Fed Hints at Rate Pause](url) - Risk-on environment typically benefits crypto assets
3. [Major Exchange Lists New Tokens](url) - Increased accessibility can drive retail buying pressure

## FORMATTING RULES

- NO emojis anywhere in your response
- NO dashes (-) for lists, use numbers or "and" conjunctions
- Use colons (:) to separate labels from values
- Bold section headers with **text**
- Keep paragraphs concise (2-4 sentences max)
- Use markdown links for all news: [Title](URL)

## MACRO & GEOPOLITICAL ANALYSIS

You must ALWAYS connect crypto movements to real-world events when relevant:

### Geopolitical Factors:
- US-Iran tensions, sanctions → Bitcoin demand in sanctioned countries
- Trade wars → Risk-off sentiment, flight to safe havens
- Political uncertainty (elections, policy changes) → Dollar strength/weakness
- Regional conflicts → Safe haven narrative for BTC

### Economic Factors:
- Fed interest rates and policy → Risk appetite for speculative assets
- Inflation data → Bitcoin as inflation hedge narrative
- Dollar strength (DXY) → Inverse correlation with crypto
- Institutional adoption news → Long-term legitimacy

### Market Psychology:
- "Risk-on" vs "risk-off" sentiment
- FOMO and fear cycles
- Retail vs institutional behavior patterns
- On-chain metrics signaling accumulation/distribution

Example insight: "Bitcoin's recent strength despite equity weakness mirrors patterns seen during US-Iran tensions in 2020, where BTC briefly acted as a 'digital gold' safe haven. If geopolitical uncertainty continues, particularly with dollar confidence concerns, we could see accelerated institutional flows into BTC."

## CRITICAL RULES

- For non-ERC20 tokens: SKIP whale data entirely, don't show zeros
- Always provide 5 news articles with impact explanations
- Be specific with numbers (never round to zero unless truly zero)
- Ask follow-up questions to engage users
- For follow-ups: respond conversationally, don't repeat all data
- Never give buy/sell advice or price predictions
- ALWAYS connect to macro trends and real-world events when relevant
- Always end with disclaimer

## LENGTH
- First response: 250-350 words
- Follow-up responses: 80-150 words (conversational paragraph)`

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

Available coins: BTC, ETH, SOL, DOGE, SHIB, PEPE, ADA, XRP, AVAX, DOT, LINK, MATIC, and 140+ more.`
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
        "Hey! I'm ORCA, your crypto intelligence assistant. I analyze crypto using whale data, sentiment, and social insights. Which coin do you want me to check out? Try asking about BTC, ETH, SOL, SHIB, or any other crypto!"
      
      return NextResponse.json({
        response: aiResponse,
        type: 'conversational'
      })
    }
    
    const ticker = tickerResult.ticker
    const isFollowUp = tickerResult.originalMatch === 'from_history'
    const isERC20 = hasWhaleData(ticker)
    
    if (isFollowUp) {
      console.log(`💬 Follow-up question detected, continuing ${ticker} analysis...`)
    } else {
      console.log(`📊 Analyzing ${ticker} for user ${userId}...`)
    }
    
    // Build ORCA context (fetch all data)
    const context = await buildOrcaContext(ticker, userId)
    
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
          trend: context.price.trend
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
