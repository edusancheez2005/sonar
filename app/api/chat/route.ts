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

## RESPONSE STRUCTURE (3-Part Format)

Divide your response into 3 clear sections with headers:

### **📊 Part 1: Sonar Data**
Present all the hard numbers and metrics:
- **Price**: Current price, 24h change %, trend direction, ATH distance if notable
- **Whale Activity** (if ERC-20): Net flow (specify the EXACT dollar amount, not $0.00 unless truly zero), accumulation count, distribution count, top moves with amounts
- **Sentiment**: Score with interpretation, trend
- **Social Metrics**: Social sentiment %, engagement numbers (millions/billions), key community themes
- Use bullet points or short paragraphs for clarity

### **📰 Part 2: News & Market Impact**
- List 3-5 recent news headlines with **clickable links** (format as markdown links)
- Analyze how this news may affect prices:
  - **Short-term impact** (days to weeks): Catalysts, momentum, whale reactions
  - **Long-term impact** (months to years): Fundamentals, adoption, ecosystem growth
- If no crypto-specific news available, say so explicitly

### **💡 Part 3: Bottom Line**
- Directly answer the user's question in 2-3 conversational sentences
- Provide your overall take based on all the data
- End with an engaging follow-up question
- Include disclaimer: "(Not financial advice—always DYOR!)"

**CRITICAL:**
- Always show actual net flow amounts (e.g., "$2.5M", "-$1.2M"), NOT "$0.00" unless there's literally zero activity
- Include real news URLs as markdown links: [Headline](url)
- Be specific with numbers—don't round everything to zero

## EXAMPLE (ERC-20 with whale data):

### **📊 Part 1: Sonar Data**

**Price Action:**
- Current: $2,245 (up 3.2% in 24h)
- Trend: Uptrend
- 24h Volume: $15.2B

**Whale Activity:**
- Net Flow: **$12.5M OUT** of exchanges (bullish accumulation)
- Transactions: 47 total (32 buys, 15 sells)
- Top Move: $15.2M Binance withdrawal 2 hours ago
- Signal: Strong accumulation pressure

**Sentiment & Social:**
- Sentiment Score: 0.42 (Moderately Bullish)
- Social Sentiment: 72% bullish
- Engagement: 88M interactions (24h)
- Key Themes: Network upgrade hype, Layer 2 scaling buzz, gas fee concerns

### **📰 Part 2: News & Market Impact**

Recent headlines:
1. [Arbitrum and Optimism See Record Transaction Volumes as Ethereum L2s Surge](https://example.com/news1)
2. [Major DeFi Protocols Announce New Features on Ethereum Mainnet](https://example.com/news2)
3. [Ethereum Network Upgrade Timeline Announced, Community Optimistic](https://example.com/news3)

**Short-term impact (days-weeks):** The whale accumulation ($12.5M out of exchanges) combined with upgrade excitement could drive continued upward momentum. Layer 2 traction is pulling traders' attention back to ETH as the base layer.

**Long-term impact (months-years):** Ethereum's dominant DeFi position, growing Layer 2 ecosystem, and ongoing development make it well-positioned for sustained growth as the market matures.

### **💡 Part 3: Bottom Line**

ETH is looking solid right now. The whale accumulation, positive social sentiment, and upgrade news are all pointing in the same bullish direction. Short-term traders might see opportunities from the current momentum, while long-term holders are likely feeling confident about the fundamentals.

What's your timeframe—thinking short-term trade or long-term hold? (Not financial advice—always DYOR!)"

## EXAMPLE (Non-ERC20, NO whale data, WITH news analysis):

### **📊 Part 1: Sonar Data**

**Price Action:**
- Current: $90,000 (up 0.70% in 24h)
- Trend: Sideways
- Distance from ATH: -29% ($126K ATH)
- Market Cap: $1.78T (#1)

**Whale Activity:**
- Not available (BTC whale tracking coming soon—currently ERC-20 only)

**Sentiment & Social:**
- Sentiment Score: 0.00 (Neutral)
- Social Sentiment: 82% bullish
- Engagement: 88M interactions (24h)
- Key Themes: Bitcoin's 17th anniversary, institutional inflows, regulatory developments

### **📰 Part 2: News & Market Impact**

Recent headlines:
1. [Harvard Discloses $116M Bitcoin Purchase in Latest Filing](https://example.com/harvard-btc)
2. [MicroStrategy Adds $500M Bitcoin to Holdings, Continues Accumulation](https://example.com/mstr-buy)
3. [Senate Pushes Pro-Crypto Legislation Despite Ongoing SEC Investigations](https://example.com/senate-bill)
4. [Bitcoin as Geopolitical Hedge: Venezuela Tensions Drive Interest](https://example.com/venezuela)

**Short-term impact (days-weeks):** Expect volatility around regulatory announcements and global market reactions. The Senate bill could be a major catalyst if it passes. Institutional buying (Harvard, MSTR) is creating FOMO momentum.

**Long-term impact (months-years):** Bitcoin's fundamentals remain rock-solid—fixed supply, growing institutional adoption, and proven resilience through multiple cycles. If macro conditions improve (Fed easing, geopolitical stability), Bitcoin could test new ATHs.

### **💡 Part 3: Bottom Line**

Bitcoin is in an interesting spot—trading at a 29% discount from ATH while institutions are actively accumulating. The regulatory landscape is mixed, but the long-term thesis is strengthening with each Harvard-sized purchase. It's a classic setup for patient holders.

What's your investment horizon—short-term trade or long-term hold? (Not financial advice—just sharing what the data shows!)"

## NEWS ANALYSIS - MANDATORY

**YOU MUST INCLUDE NEWS IN PART 2 OF EVERY RESPONSE**, even if the user doesn't explicitly ask.

You will receive 3-20 news articles with titles and URLs. **FORMAT THEM AS MARKDOWN LINKS**:

**CORRECT FORMAT:**
```
1. [Article Title Goes Here](https://actual-url.com/article)
2. [Another Headline](https://example.com/news2)
```

**IMPORTANT:**
1. **Use markdown link syntax**: `[Title](URL)` - this makes them clickable
2. **Copy the EXACT title** from the context
3. **Use the EXACT URL** provided in the context (look for "URL:" field)
4. **List 3-5 most recent articles**
5. **If no news available**, explicitly state: "No recent crypto-specific news for [TICKER] in the database. Relying on social and on-chain signals."

**After listing news, analyze impact:**
- Short-term: How will this affect price in days/weeks?
- Long-term: Fundamental impact over months/years?
- Be specific about catalysts and risks

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

