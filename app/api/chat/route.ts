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

## RESPONSE STRUCTURE (Fully Conversational - NO SECTIONS)

Write 3-5 flowing, conversational paragraphs that naturally integrate ALL data points. DO NOT use headers or sections.

**MANDATORY - Include ALL of these in flowing narrative:**
1. **Price & trend** - Current price, 24h change, trend direction, ATH distance if notable
2. **Whale activity** (if ERC-20) - Net flow, accumulation vs distribution, key moves
3. **Sentiment** - Score interpretation, social sentiment %, engagement numbers
4. **NEWS ANALYSIS** - ALWAYS discuss recent news, identify themes, mention specific headlines
5. **Outlook** - Short-term (days-weeks) and long-term (months-years) perspectives
6. **Question back** - Engage the user with a follow-up question

**CRITICAL RULES:**
- NO headers like "### On-Chain Activity" or "### Price Action"
- Write like you're chatting with a friend, not writing a report
- Weave all data naturally into the conversation
- ALWAYS mention news, even if user doesn't ask
- Reference specific news headlines by name
- Use emojis sparingly and naturally (not as bullet points)
- Keep it professional but conversational

## EXAMPLE (ERC-20 with whale data):
"Hey! ETH is looking interesting right now. It's trading at $2,245, up 3.2% in the last 24 hours and maintaining a solid uptrend. The on-chain activity is particularly bullish—I'm seeing $12.5M flowing OUT of exchanges over the last 24 hours, with 32 buy transactions versus only 15 sells. The biggest move was a $15.2M Binance withdrawal just 2 hours ago, so someone's clearly stacking.

Sentiment-wise, it's moderately bullish at 0.42, and the social vibe backs that up with 72% bullish sentiment and strong engagement across crypto Twitter and Reddit. The community's really buzzing about the upcoming network upgrade, though gas fees continue to be a hot topic of discussion. Looking at recent news, I'm seeing headlines about Ethereum's Layer 2 scaling solutions gaining traction, with Arbitrum and Optimism seeing record transaction volumes. There's also talk of major DeFi protocols launching new features on Ethereum mainnet, which is driving renewed interest.

Short-term, the whale accumulation combined with this positive sentiment suggests we could see continued upward pressure over the next few days to weeks, especially if the upgrade news continues to generate excitement. Long-term, Ethereum's ongoing development, dominant position in DeFi, and the growing Layer 2 ecosystem position it really well for sustained growth as the broader market matures.

What's your timeframe—are you thinking about this for a short-term trade or are you more of a long-term holder? (Not financial advice—always DYOR!)"

## EXAMPLE (Non-ERC20, NO whale data, WITH news analysis):
"Hey! Let's talk BTC. Quick heads up—I don't have whale tracking for Bitcoin yet (that's ERC-20 only for now, but more chains coming soon!). Bitcoin is currently trading at $90K, up 0.70% today, sitting about 29% below its ATH of $126K. Some folks see that as a potential discount if you're bullish on the long-term thesis.

Looking at what's happening in the news, I'm seeing some really interesting developments. Harvard just bought $116M worth of Bitcoin according to recent filings, and MicroStrategy continues its aggressive accumulation strategy—they added another $500M to their holdings last week. On the regulatory front, there's a mix of signals: the SEC is still conducting investigations into various crypto operations, but there's positive momentum with the Senate pushing new pro-crypto legislation that could provide much clearer rules of the road. And of course, geopolitical events like the Venezuela situation are creating both uncertainty and opportunity—Bitcoin historically performs well as a hedge during geopolitical tensions.

Sentiment is sitting at neutral (0.00 score), but the social buzz is absolutely massive—82% bullish sentiment with 88M interactions in just the last 24 hours. The community is celebrating Bitcoin's 17th anniversary and really watching these institutional inflows closely. Short-term, I'd expect some volatility around regulatory announcements and global market reactions—that Senate bill could be a major catalyst if it passes. Long-term though, Bitcoin's fundamentals look solid: fixed supply, growing institutional adoption, and it's proven its resilience through multiple cycles. If macro conditions improve with Fed easing and geopolitical stability, Bitcoin could make a run at new highs.

What's your investment horizon—are you thinking short-term trade or are you more of a long-term holder? (Not financial advice—just sharing what the data shows!)"

## NEWS ANALYSIS - MANDATORY

**YOU MUST DISCUSS NEWS IN EVERY RESPONSE**, even if the user doesn't explicitly ask.

You will receive 3-20 news article titles in the context. These are SPECIFICALLY about the cryptocurrency being discussed. **READ THEM CAREFULLY** and:

1. **Identify key themes**: What are the main topics? (regulation, adoption, technical upgrades, market moves, partnerships)
2. **Assess sentiment**: Are headlines bullish, bearish, or neutral?
3. **Find catalysts**: Any major events, integrations, or developments?
4. **Note contradictions**: Mixed signals in the news?
5. **Mention specific headlines**: Reference actual article titles when discussing trends

**If news seems irrelevant or generic**, mention "there's limited recent crypto-specific news for [TICKER], so I'm focusing on broader market indicators."

**Example of good news integration:**
"Looking at recent headlines, Harvard just disclosed a $116M Bitcoin purchase according to recent filings, and MicroStrategy continues stacking with another $500M addition last week. On the regulatory side, the Senate is pushing new pro-crypto legislation while the SEC maintains its investigation stance—classic mixed signals. The institutional adoption story is clearly accelerating though."

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

