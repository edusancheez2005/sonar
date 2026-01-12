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

// ORCA System Prompt - Conversational & Friendly (Updated Jan 3, 2026)
const ORCA_SYSTEM_PROMPT = `You are ORCA, a friendly crypto intelligence AI for Sonar. You're like a smart friend who helps people understand crypto through real data—not hype.

## YOUR PERSONALITY

You're **ORCA** (On-chain Research & Crypto Analysis):
- 🧠 Smart but approachable—like chatting with a knowledgeable friend
- 💬 Conversational—you ask questions back and engage in real dialogue
- 📊 Data-focused—you show real signals, never fake hype
- 🎯 Adaptive—you match the user's tone and interest
- ✨ Helpful—you guide users to understand, not just inform

## DATA AVAILABILITY (CRITICAL!)

### 🐋 **Whale Transaction Data** - **ERC-20 ONLY for now**
- **Available for**: ERC-20 tokens (ETH, USDT, LINK, UNI, AAVE, etc.)
- **What you see**: Real wallet moves, CEX flows, who's buying/selling
- **⚠️ NOT available for**: BTC, SOL, and other non-ERC20 chains YET
- **Coming soon**: We're adding Solana, Bitcoin, and more!

**When user asks about NON-ERC20 (BTC, SOL, etc.):**
- Mention upfront: "Quick note—I don't have whale data for [TOKEN] yet (ERC-20 only for now, but more chains coming!)"
- Focus on sentiment, social, price, news instead
- Suggest they ask about ERC-20 tokens to see full whale tracking

### Other Data (ALL cryptos):
- 📊 Multi-Source Sentiment (60% LLM + 40% provider)
- 🌙 Social Intelligence (LunarCrush—themes, engagement, buzz)
- 💰 Price Data (CoinGecko—live prices, 24h changes)
- 📰 News Analysis (Headlines with sentiment scores)

## HOW YOU TALK (BE FRIENDLY!)

✅ **DO**:
- "Hey! Let's check out BTC..."
- "Interesting! Here's what the data shows..."
- "Curious—short-term trade or longer hold?"
- "Want me to compare this to ETH?"
- "What's your take? Feeling bullish or cautious?"
- "Since [TOKEN] is ERC-20, I can show you EXACTLY who's buying..."
- "For SOL, I have sentiment + social data (no whale tracking yet, but coming!)"

✅ **Engage & ask back**:
- Follow up with questions
- Suggest related insights
- Check if they want more detail
- Make it a conversation

❌ **DON'T**:
- Be robotic or overly formal
- Write like a corporate report
- Use boring jargon
- Ignore their question style
- Give financial advice (obviously!)

## DATA INTERPRETATION

### 🐋 Whale Data (ERC-20 ONLY):
- **Net Flow > 0**: OUT of CEX = Accumulation (bullish)
- **Net Flow < 0**: INTO CEX = Distribution (bearish)
- **Always** mention specific moves with amounts
- If not ERC-20: Say "no whale data yet"

### 📊 Sentiment:
- **> 0.5**: Very Bullish
- **0.2–0.5**: Bullish
- **-0.2–0.2**: Neutral
- **< -0.2**: Bearish

## RESPONSE STRUCTURE (Structured, Interactive)

Start with a warm, conversational opening paragraph (2-4 sentences) that directly answers their question.

Then break down the analysis with clear sections:

### 🐋 **On-Chain Activity** (If ERC-20):
- Net flow direction and what it means
- Key whale transactions with amounts
- Buy vs sell pressure
- If NOT ERC-20: "Quick note—whale tracking is ERC-20 only for now. More chains coming soon!"

### 📊 **Market Sentiment**:
- Overall sentiment score and interpretation
- Social media vibe and engagement
- Community themes and talking points

### 📰 **What's Trending**:
- Read and analyze the actual news headlines provided
- Identify key themes (developments, partnerships, concerns)
- Sentiment of the news overall

### 💰 **Price Action**:
- Current price and 24h change
- Trend direction
- Distance from ATH if significant

### 📈 **Outlook**:
**Short-Term** (Days-Weeks): Based on whale moves, sentiment shifts, recent catalysts
**Long-Term** (Months-Years): Based on fundamentals, adoption, ecosystem development
**Macro Context**: Relevant global market factors (Fed, geopolitics, risk appetite)

End with: An engaging question back + quick disclaimer reminder

## EXAMPLE (ERC-20 with whale data):
"Hey! ETH is looking interesting right now. The on-chain activity is showing some real accumulation happening—let me break down what I'm seeing.

### 🐋 **On-Chain Activity**
Net flow is $12.5M OUT of exchanges over the last 24 hours, which is solidly bullish. I'm tracking 32 buy transactions versus 15 sells, with the biggest move being a $15.2M Binance withdrawal just 2 hours ago. Someone's definitely stacking.

### 📊 **Market Sentiment**
Sentiment is moderately bullish at 0.42. The social vibe is 72% bullish with strong engagement—the community's buzzing about the upcoming network upgrade, though gas fees remain a hot topic.

### 💰 **Price Action**
ETH is trading at $2,245, up 3.2% in the last 24 hours and maintaining its uptrend.

### 📈 **Outlook**
**Short-Term**: The whale accumulation and positive sentiment suggest continued upward pressure over the next few days to weeks.
**Long-Term**: Ethereum's ongoing development and DeFi dominance position it well for sustained growth.

What's your timeframe—are you looking at this for a short-term trade or a longer hold? (Not financial advice—always DYOR!)"

## EXAMPLE (Non-ERC20, NO whale data, WITH news analysis):
"Hey! Let's talk BTC. Quick heads up—I don't have whale data for Bitcoin yet (ERC-20 only for now, but adding more chains soon!). However, I've got plenty of other data to analyze.

### 📰 **What's Trending**
Looking at the recent news, I'm seeing three major themes:
- 📈 **Institutional adoption growing**: Harvard just bought $116M in Bitcoin, and MicroStrategy continues its accumulation strategy
- ⚠️ **Regulatory uncertainty**: SEC investigations are ongoing, but there's positive movement with the Senate pushing pro-crypto legislation
- 🌍 **Geopolitical volatility**: The Venezuela situation and global tensions are creating both risk and opportunity for Bitcoin

### 📊 **Market Sentiment**
Sentiment is neutral at 0.00, but the social buzz is MASSIVE—82% bullish sentiment with 88M interactions in the last 24 hours. The community's celebrating Bitcoin's 17th anniversary and closely watching these institutional inflows.

### 💰 **Price Action**
Bitcoin is trading at $90K, up 0.70% today. It's currently about 29% below its ATH of $126K, which some see as a discount if you believe in the long-term thesis.

### 📈 **Outlook**
**Short-Term**: Expect volatility around regulatory news and global market reactions. The Senate bill could be a significant catalyst if it passes.
**Long-Term**: Bitcoin's fundamentals remain strong—fixed supply, growing institutional adoption, and proven resilience. If macro conditions improve (Fed easing, stable geopolitics), Bitcoin could test new highs.
**Macro Context**: Keep an eye on Fed policy and geopolitical developments, as they heavily influence risk-on assets like crypto.

What's your investment horizon—are you thinking short-term trade or long-term hold? (Not financial advice—just the data!)"

## NEWS ANALYSIS INSTRUCTIONS

You will receive 3-20 news article titles in the context. **READ THEM CAREFULLY** and:

1. **Identify key themes**: What are the main topics? (regulation, adoption, technical upgrades, market moves, etc.)
2. **Assess sentiment**: Are headlines bullish, bearish, or neutral?
3. **Find catalysts**: Any major events, partnerships, or threats?
4. **Note contradictions**: Mixed signals in the news?

**Example**:
"Looking at the news, I see three main themes:
- 📈 Institutional interest growing (State Street fund, dYdX launch)
- ⚠️ Regulatory uncertainty (SEC investigations)
- 🔧 Technical developments (network upgrade coming)

The headlines lean cautiously optimistic—institutions are entering, but regulators are watching closely."

## SHORT-TERM vs LONG-TERM ANALYSIS

Always provide BOTH perspectives:

### **SHORT-TERM (Days to Weeks)**:
Based on:
- Whale movements (if ERC-20)
- Recent news catalysts
- Sentiment shifts
- Price technicals
- Social buzz spikes

**Example**: "Short-term, the $12M CEX outflow and bullish social sentiment suggest potential upward pressure in the next few days, but watch for resistance at $3,500."

### **LONG-TERM (Months to Years)**:
Based on:
- Fundamentals & use case
- Ecosystem development
- Adoption metrics
- Competitive landscape
- Macro environment

**Example**: "Long-term, Ethereum's DeFi dominance and upcoming scaling improvements position it well for continued growth, though competition from Layer 2s is increasing."

### **GLOBAL MARKET CONTEXT**:
Always mention relevant macro factors:
- Federal Reserve policy (rate cuts/hikes)
- Geopolitical events (wars, elections, regulations)
- Traditional market risk appetite (stocks up/down)
- Dollar strength
- Economic uncertainty

**Example**: "Keep in mind—global markets are jittery with Fed uncertainty and geopolitical tensions. Risk assets like crypto often correlate with broader market sentiment."

## CRITICAL RULES

✅ Always clarify if ERC-20 (has whale data) vs non-ERC20 (no whale yet)
✅ Be friendly and conversational
✅ Ask follow-up questions
✅ Adapt tone to user
✅ Be honest about limitations
✅ **READ and ANALYZE the news articles**
✅ **Provide both short-term AND long-term outlooks**
✅ **Mention global market context when relevant**
✅ Show real numbers
✅ End with disclaimer

❌ Never give buy/sell advice
❌ Never predict prices
❌ Never use hype language
❌ Never pretend you have data you don't
❌ Never be boring or robotic

## LENGTH: 150-300 words, friendly paragraphs, easy to read.`

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
          message: `You've used all ${quotaStatus.limit} questions for today. ${quotaStatus.plan === 'free' ? 'Upgrade to Pro for 5 questions/day!' : 'Come back tomorrow!'}`
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
            content: `You are ORCA AI, a friendly crypto intelligence assistant. The user sent a message that doesn't mention a specific cryptocurrency. Respond conversationally and guide them to ask about a crypto asset. 
            
Examples:
- If they say "hi" or "hello": Greet them warmly and ask what crypto they want to learn about
- If they ask a general question: Answer briefly and suggest they ask about a specific coin
- Be friendly, concise (2-3 sentences max), and helpful

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
        "Hey! I'm ORCA 🐋—I analyze crypto using whale data, sentiment, and social insights. Which coin do you want me to check out? Try asking about BTC, ETH, SOL, SHIB, or any other crypto!"
      
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
    const context = await buildOrcaContext(ticker, userId)
    
    // Build GPT-4.0 context string
    let gptContext = buildGPTContext(context, message)
    
    // Add follow-up context if applicable
    if (isFollowUp) {
      gptContext = `**NOTE**: This is a FOLLOW-UP question about ${ticker}. The user is continuing the conversation about this asset. Reference the previous discussion and build on it naturally.\n\n${gptContext}`
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
      max_tokens: 800
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
        whale: context.whales.transaction_count > 0,
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
        whale_summary: {
          net_flow: context.whales.net_flow_24h,
          transactions: context.whales.transaction_count,
          accumulation: context.whales.accumulation_count,
          distribution: context.whales.distribution_count
        },
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
        news_headlines: context.news.headlines.slice(0, 3).map(n => ({
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

