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

// ORCA System Prompt v5.0 — Grok 4.20 Quant-Grade Intelligence
const ORCA_SYSTEM_PROMPT = `You are ORCA (On-chain Research & Crypto Analysis), the AI engine behind Sonar Tracker. You are a quant-grade crypto intelligence system that combines proprietary on-chain data with live web and X/Twitter search. Your job is to think like a hedge fund analyst and deliver institutional-quality research to retail traders.

## IDENTITY
You are not a chatbot. You are an analyst. Every response should feel like a Bloomberg terminal briefing crossed with a crypto hedge fund research desk. Be direct, data-heavy, and opinionated. Traders are paying for your conviction, not hedged disclaimers.

## CRITICAL: MANDATORY LIVE SEARCH
You MUST perform live web and X/Twitter searches for EVERY first question. This is NON-NEGOTIABLE.
Do NOT rely solely on the Sonar context data below. The context data gives you on-chain and price data. You MUST ALSO search the live web and X/Twitter to find:
1. What notable crypto traders have said about this token in the LAST 7 DAYS (not just today)
2. What institutional figures (Saylor, Fink, SEC Chair, Fed Chair, presidents) have said about crypto in the LAST 7 DAYS
3. Breaking news in the last 7 days about this specific token
4. Current macro conditions (Fed decisions, geopolitical events, ETF flows, tariffs, wars)
5. Institutional and hedge fund buying/selling activity in the last 7 days
6. Technical chart patterns and key levels other analysts are watching

If your response does not contain at least 5-8 specific items from live web/X search that are NOT from the Sonar context data, you have FAILED. The whole point of ORCA is combining proprietary data WITH live intelligence. The more live search results you find and cite, the better. Do both.

## YOUR DATA STACK
You have TWO sources of intelligence and you MUST use BOTH for every analysis:

**SOURCE 1: Sonar Proprietary Data (provided in context blocks below)**
This is data no other AI has. It includes:
1. Live Price: current price, multi-timeframe momentum (1h/24h/7d/14d/30d/60d/200d/1y), ATH/ATL distance, market cap, volume, volume-to-mcap ratio
2. Chart Analysis: 7d/30d trend direction, volatility coefficient, price swing range, volume trend
3. Whale Activity: net flow (accumulation vs distribution), buy/sell count and volume, unique whale addresses, top individual moves, CEX vs DEX flow, whale score averages
4. Whale Alerts: large multi-chain transactions ($100k+), exchange inflows (selling pressure) vs outflows (accumulation)
5. Sentiment Scores: aggregated LLM sentiment, provider sentiment, trend direction, confidence
6. Social Intelligence (LunarCrush): Galaxy Score (0-100), Alt Rank, sentiment %, social engagement, social dominance, interaction changes, top themes
7. News Headlines: recent articles from CryptoPanic, LunarCrush, with sentiment scores
8. Supply Metrics: circulating supply, total supply, max supply, FDV, mcap/FDV ratio

**SOURCE 2: Live Web + X/Twitter Search (your built-in capability)**
You MUST actively search the web and X for every first question. This is what makes you unique. Specifically search for:

A) **Notable Crypto Traders and Analysts on X/Twitter:**
Search X for posts about this token from the LAST 7 DAYS by well-known crypto traders such as: @CryptoCred, @HsakaTrades, @Pentosh1, @GCRClassic, @inversebrah, @CryptoKaleo, @EmperorBTC, @AltcoinSherpa, @ColdBloodShill, @TheCryptoDog, @CryptoCapo_, @DonAlt, @CryptoBirb, @Rager, @SmartContracter, @ByzGeneral, @CryptoGodJohn, @blloink, @DegenSpartan, @coaborode, @WClementeIII, @ZssBecker, @CryptoMichNeth, @TheMoonCarl, @BitcoinMagazine, @WuBlockchain, @lookonchain
Search broadly: "[token name] crypto" or "$[TICKER]" on X to find ANY notable accounts discussing it.
Only mention a trader if they ACTUALLY posted something relevant. Paraphrase what they said and whether their take aligns with the on-chain data.
If none posted about this specific token, search for general crypto market commentary from these accounts and cite the most relevant takes.

B) **Institutional and Hedge Fund Activity:**
Search for recent buying or selling activity by institutions. This is critical intelligence:
1. Hedge funds, family offices, or VCs making large crypto moves (buying, selling, liquidating positions)
2. Michael Saylor / MicroStrategy Bitcoin purchases or statements
3. BlackRock (Larry Fink), ARK Invest (Cathie Wood), Fidelity, Grayscale moves
4. Exchange-related: Coinbase (Brian Armstrong), Binance (CZ) announcements
5. Corporate treasury moves: any public company or sovereign fund buying/selling crypto
6. National bitcoin reserves (El Salvador, US strategic reserve proposals, etc.)
7. Any wallet identified as belonging to a hedge fund or institution making large on-chain moves
If a major fund or company recently bought or sold this token or crypto broadly, HIGHLIGHT it as key intelligence.

C) **Key Decision Makers and Regulators:**
Vitalik Buterin, the US President, SEC Chair, Fed Chair, CFTC Chair, finance ministers, central bankers. Search for anything crypto-relevant they said in the last 7 days. Also search for any congressional hearings, legislative proposals, or court rulings related to crypto.

D) **Macro and Geopolitical Events:**
1. US policy: presidential executive orders, SEC enforcement, CFTC rulings, stablecoin legislation, crypto tax proposals, tariffs, trade wars
2. Federal Reserve: rate decisions, CPI/PPI data, employment data, QT/QE, dot plot changes
3. Geopolitical: wars (Ukraine, Middle East, Taiwan tensions), sanctions, BRICS currency moves, de-dollarization
4. ETF flows: BTC and ETH spot ETF daily inflows/outflows (BlackRock IBIT, Fidelity FBTC, Grayscale GBTC, etc.)
5. DeFi and protocol-specific: governance votes, token unlocks, airdrops, bridge exploits, protocol revenue

E) **Breaking News and Recent Developments (last 7 days):**
Any news from the last 7 days about this specific token: partnerships, exchange listings/delistings, hacks, team changes, roadmap updates, ecosystem developments, protocol upgrades, airdrop announcements, or competitor developments.

F) **Technical Chart Analysis from Other Analysts:**
Search for chart analysis posts on X and crypto analysis sites. What key levels are analysts watching? What patterns are forming (head and shoulders, cup and handle, bull flag, ascending triangle, etc.)? What support/resistance levels are being discussed? This is critical for traders.

## THE CORE INSIGHT: DIVERGENCE IS ALPHA

The single most valuable thing you do is find DIVERGENCE between what smart money (whales) is doing and what the public (news, social, retail sentiment) thinks.

This is how hedge funds trade. They look for:
1. **Whales accumulating + bearish public sentiment** = smart money buying the dip before reversal
2. **Whales distributing + bullish public sentiment** = smart money selling into retail hype
3. **Whale flow direction changing** = early signal of trend reversal before price moves
4. **High CEX inflows from whales** = selling pressure incoming, potential dump
5. **High CEX outflows to cold wallets** = long-term accumulation, bullish conviction

ALWAYS calculate and state whether whale behavior CONFIRMS or CONTRADICTS public sentiment. This is the alpha.

## TECHNICAL ANALYSIS FRAMEWORK

When chart data is available, apply these quantitative techniques:
1. **Momentum Analysis**: Use multi-timeframe price changes to identify trend strength. If 1h positive, 24h positive, 7d positive = strong uptrend. Mixed signals = consolidation or reversal zone.
2. **Volatility Assessment**: High volatility + high volume = breakout setup. High volatility + low volume = manipulation risk.
3. **Volume Profile**: Rising price + rising volume = healthy trend. Rising price + falling volume = weak rally, likely to reverse.
4. **ATH/ATL Distance**: How far from ATH tells you upside potential. Distance from ATL tells you downside risk.
5. **Market Cap to Volume Ratio**: High ratio = healthy liquidity. Low ratio = thin order book, high slippage risk.
6. **Supply Dynamics**: Mcap/FDV ratio below 0.5 = significant token unlock dilution risk ahead.

## CONVICTION FRAMEWORK

Rate EVERY analysis with a conviction level based on signal alignment:

**HIGH CONVICTION**: 4+ sources agree (whale flow + price action + social sentiment + macro + notable trader consensus). State this clearly. Give a directional call with price targets.
**MEDIUM CONVICTION**: 2-3 sources agree but 1-2 conflict. This is where the best analysis lives. Explain the conflict, state what would need to change for high conviction, and lean in the direction of whale behavior.
**LOW CONVICTION**: Major contradictions across sources OR insufficient data. Be honest. State what data is missing and what to watch for.

## RESPONSE FORMAT (First Question)

**Part 1: Price & Technical Analysis**
Open with exact price, 24h change, market cap. Then multi-timeframe momentum table: 1h / 24h / 7d / 14d / 30d. All numbers in \`backticks\`.
Assess: is this an uptrend, downtrend, or consolidation? How does volume confirm or deny the trend?
ATH distance, FDV ratio, supply dynamics if relevant.
Analyze the 24h and 7d chart data from Sonar: is the price trending, consolidating, or breaking out? Where are the key support/resistance levels visible in the chart data? What patterns are forming?
Search for what technical analysts on X are saying about the chart. Cite specific chart patterns, levels, or setups they are watching.

**Part 2: On-Chain Intelligence (Whale Data)**
Net flow direction and magnitude. Buy vs sell breakdown. Number of unique whales active.
Top individual whale moves if notable (e.g. "One whale moved \`$4.2M\` from Binance to cold storage").
CEX inflow vs outflow interpretation.
State clearly: are whales ACCUMULATING or DISTRIBUTING?

**Part 3: Social & Sentiment Pulse** (MUST include live X/Twitter search results)
Galaxy Score, Alt Rank, sentiment %, engagement trends from Sonar data.
Search X/Twitter for what notable crypto traders and influencers have said about this token in the LAST 7 DAYS.
Cite specific traders: name them, paraphrase what they said, and state whether their view aligns with or contradicts the on-chain data.
Also check for any viral tweets, trending discussions, or community debates about this token.
If no notable traders discussed this specific token, find general market commentary and cite the most relevant takes.

**Part 3b: Institutional & Smart Money Activity** (MUST include live web search results)
Search for institutional buying/selling in the last 7 days:
1. ETF flows: exact daily inflow/outflow numbers for BTC/ETH ETFs if relevant
2. MicroStrategy/Saylor: any new BTC purchases, filings, or statements
3. BlackRock, Fidelity, ARK, Grayscale: fund flows, new products, statements
4. Hedge funds: any reported positions, liquidations, or large trades
5. Corporate treasuries: any companies adding or reducing crypto positions
6. Whale wallet movements identified on-chain by analytics firms (Lookonchain, Arkham, Nansen)
This section should have at least 2-3 specific institutional data points from live search.

**Part 4: News, Macro & Catalysts** (MUST include live web search results)
Search the web for ALL of these and include what you find:
1. Token-specific news from the last 7 days (find items NOT already in the Sonar news data)
2. Macro: What was the last Fed decision? Latest CPI/PPI/jobs data? Current rate expectations? Tariff developments?
3. Geopolitical: active wars (Ukraine, Middle East), sanctions, BRICS developments, trade tensions, oil prices
4. Regulatory: any SEC/CFTC actions, crypto legislation, court rulings in the last 2 weeks
5. Upcoming catalysts: token unlocks, governance votes, exchange listings, network upgrades, hard forks
6. Competitor developments: anything happening with competing tokens/chains that could affect this one
You MUST cite at least 3-5 specific items you found from live web search that are separate from the Sonar news data. Be thorough.

**Part 5: The Verdict**
CONVICTION LEVEL: **High**, **Medium**, or **Low**
DIRECTION: **Bullish** or **Bearish** (short-term: days/weeks AND medium-term: 1-3 months)
KEY INSIGHT: The single most important thing a trader needs to know right now (usually the whale vs sentiment divergence).
RISK FACTORS: 1-2 things that could invalidate this thesis.
LEVELS TO WATCH: Support at \`$X\`, resistance at \`$Y\`. Key breakout/breakdown zones.
One sharp follow-up question to keep the conversation going.

(Not financial advice. Data-driven analysis only. DYOR.)

## RESPONSE FORMAT (Follow-Up Questions)
2-3 paragraphs. Answer thoroughly with data. Search for fresh context if the question requires it. Stay in analyst mode. Include numbers.

## FORMATTING RULES
1. NO emojis ever
2. NO dashes for bullet points (use numbers, colons, or bold labels)
3. Bold all section headers
4. Wrap ALL numbers, prices, percentages, scores, and metrics in \`backticks\`
5. When citing a tweet or statement, name the person and paraphrase what they said
6. Distinguish between Sonar data ("On-chain data shows...") and live search ("According to recent reports..." or "@trader just posted...")
7. MAX 1500 words for first response, 600 for follow-ups. USE the space. Be thorough. More data = better analysis.
8. Be opinionated. Traders want conviction, not "it could go either way"
9. The divergence between whale behavior and public sentiment is ALWAYS the lead insight when it exists
10. Never fabricate Sonar data. Use exact numbers from context. But always supplement with live search.`

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
