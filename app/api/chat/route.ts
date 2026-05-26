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
import { ORCA_SYSTEM_PROMPT } from '@/lib/orca/system-prompt'
import { runOrchestrator } from '@/lib/orca/orchestrator/runOrchestrator'
import { routeMessage } from '@/lib/orca/orchestrator/router'
import { COMPLIANCE_DECLINE_RESPONSE } from '@/lib/orca/orchestrator/guardrails'
import type { ChatTurn, ToolCall, UserProfileSnapshot } from '@/lib/orca/orchestrator/types'

export const dynamic = 'force-dynamic'
// Vercel function timeout. The legacy v1 path fans out to multiple upstream
// APIs (Binance + CG + LunarCrush + news + whale alerts) and Grok-4-fast can
// take 20-40s for a 1,500-word note. The default 10s cap was surfacing to the
// browser as "Network error talking to ORCA" in PersonalCopilotPanel. Set to
// 60s — supported on Vercel Pro. If you are on Hobby, lower to 60 here AND in
// the Vercel dashboard (Hobby maxes at 60s on Node runtime as of 2026-05).
export const maxDuration = 60

// Use Grok (xAI) as primary AI, fallback to OpenAI if no xAI key.
// Model selection prioritises the largest context window available so the
// full ORCA context block (price + chart + whale + sentiment + 10 news
// articles + LunarCrush + dev/community data) survives without truncation.
//   - Grok primary:  grok-4-fast-reasoning   (2,000,000 token context, reasoning)
//   - Grok mini:     grok-4-fast-non-reasoning (2,000,000 ctx, lower latency)
//   - OpenAI fallback: gpt-4.1 (1,000,000 token context)
const getAIClient = () => {
  const xaiKey = process.env.XAI_API_KEY
  console.log(`🤖 AI Provider: ${xaiKey ? 'Grok (xAI)' : 'OpenAI (fallback)'}`)
  if (xaiKey) {
    return {
      client: new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' }),
      model: 'grok-4-fast-reasoning',
      miniModel: 'grok-4-fast-non-reasoning',
      provider: 'grok'
    }
  }
  return {
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    model: 'gpt-4.1',
    miniModel: 'gpt-4.1-mini',
    provider: 'openai'
  }
}

/**
 * Dynamically determine if any on-chain whale data exists for a token.
 * Two independent sources can satisfy this:
 *   1. ERC-20 `whale_transactions` table (Etherscan ingest, ETH-chain ERC-20s)
 *   2. Multi-chain `whale_alerts` table (Whale Alert API, $500k+ tx, covers
 *      BTC, ETH native, TRX, XRP, SOL, BSC, etc.)
 * Previously this only checked source #1, so BTC/XRP/TRX/SOL responses
 * incorrectly told users "on-chain whale data is not available".
 */
function hasWhaleData(context: any): boolean {
  const erc20 = (context?.whales?.transaction_count || 0) > 0 ||
                (context?.whales?.net_flow_24h || 0) !== 0
  const multichain = (context?.whaleAlerts?.recent_alerts?.length || 0) > 0
  return erc20 || multichain
}

// ORCA System Prompt moved to lib/orca/system-prompt.ts (single source of truth
// shared with the v2 multi-agent synthesiser). Imported above. The legacy
// inline string is kept below as a comment block ONLY for git-blame readability;
// the active prompt lives in lib/orca/system-prompt.ts.
/* LEGACY (pre-2026-05-04 inline copy — DO NOT EDIT, edit lib/orca/system-prompt.ts):
You are ORCA, an automated research assistant for Sonar Tracker. You summarise public news, social posts, and on-chain whale transaction data. You are not a financial adviser, broker, dealer, or analyst, and you are not authorised to provide investment, legal, or tax advice in any jurisdiction.

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

You are writing a long-form, in-depth research note. Aim for substance and density. Every claim must trace back to a specific number in the context block. Required structure:

**Data**
Open with a one-sentence positioning of the asset (sector, current cycle context inferred from the supplied multi-timeframe % changes — 1h / 24h / 7d / 30d). Then walk through:
- Price action across all available timeframes, calling out where the 7d and 30d changes diverge from the 24h move and what that asymmetry mechanically implies (compression, expansion, consolidation, breakout, mean-reversion attempt).
- Volatility regime (use the 7d volatility figure and label it explicitly: high / moderate / low) and what that implies for spot vs. derivatives liquidity behaviour.
- Volume / market-cap ratio and what it indicates about turnover.
- FDV / mcap ratio and what it implies about future supply dilution risk.
- Distance from ATH and market-cap rank as positioning context.
- On-chain whale data — render whichever source is populated:
  - If the ERC-20 whale_transactions block is supplied: report exact net flow, buy/sell tx counts, buy/sell ratio, CEX vs DEX split, the divergence flag (if any), and whales' share of total 24h volume.
  - If the multi-chain WHALE ALERT API block is supplied (BTC, XRP, TRX, SOL, native ETH, etc.): report total tracked $500k+ flow, accumulation vs distribution counts, and render the largest named exchange↔wallet movements as a markdown bulleted list (one bullet per movement, prefixed with **ACCUMULATION** or **DISTRIBUTION** in bold) — quote them verbatim from the block. Frame these as descriptive observations of what the public Whale Alert feed reported, not as forecasts.
  - When listing "recent largest transactions", also use a markdown bulleted list (one bullet per transaction) rather than a comma-separated paragraph.
  - If neither is supplied: state "On-chain whale data not available for this asset in the current dataset" — do not fabricate.
- Sentiment composite (combined score, provider score, LLM score, news count behind it) and Galaxy Score / Alt Rank with their natural-language interpretation already supplied.
- Social: % bullish, raw interaction count, mention count, supportive vs critical themes.

## HANDLING MISSING / N/A DATA (strict)

If a metric in the context block is missing, null, undefined, "N/A", "unavailable", or otherwise has no real value, you MUST OMIT IT ENTIRELY from the response. Do not write sentences such as "engagement at N/A interactions, mentions at N/A, and active creators at N/A" or "the volume-to-market-cap ratio is unavailable". Skip the field silently. If an entire data section (e.g. LunarCrush social, developer data, community data) has no usable values at all, omit that section entirely instead of writing a sentence describing the absence of every field. The only acceptable explicit "not available" message is the single fallback line for whale data described above when both whale sources are empty.

**News and Market Impact**
For EACH of the 5 most relevant supplied articles produce a paragraph that contains, in this order:
1. The headline as a markdown link.
2. The supplied LLM sentiment score for that article.
3. A SHORT-TERM (hours to weeks) mechanism: name the specific transmission channel — e.g. "tightens dollar liquidity → typically pressures risk assets including high-beta crypto", "removes a regulatory overhang for US spot products → reduces uncertainty premium", "increases realised supply on exchanges → adds short-term sell-side depth". Tie the channel back to a concrete metric in the supplied data when possible (the 24h volume, the volatility figure, the net whale flow direction).
4. A LONG-TERM (months to years) consideration: is this a one-off headline or part of a structural trend (institutional adoption, regulation, monetary regime, supply schedule, network upgrade, jurisdictional fragmentation)?
5. A factor classification at the end of the paragraph in brackets: [MACRO: rates / dollar / geopolitics / liquidity] OR [MICRO: regulation / flows / protocol / supply / market structure / sentiment].

Avoid generic phrasing like "this could affect sentiment". Be specific about the mechanism.

**Bottom Line**
A 3-4 sentence synthesis that:
- Names the dominant macro factor visible in today's data for THIS asset (rates, dollar, risk appetite, regulatory cycle, etc.).
- Names the dominant micro factor (on-chain flow direction, social momentum, derivatives positioning hint, supply event, exchange listings).
- Notes any divergence between price action and on-chain flow (already flagged in the context block) without telling the user what to do about it.
- Closes with what the data does NOT tell you (motivation of the actors, off-exchange OTC, dark-pool flow, future price).

**Follow-up question:** One neutral, data-oriented follow-up the user can ask.

## MANDATORY DISCLAIMER

Every response MUST end with this exact text, on its own line, unmodified:

---
This output is an automated summary of public data for informational and educational purposes only. It is not financial, investment, legal, or tax advice and is not a recommendation to buy, sell, or hold any asset. Output may be incomplete or incorrect. Cryptocurrency trading carries a high risk of total loss. Consult a qualified, licensed financial adviser in your jurisdiction before making any investment decision.
---

## FORMATTING RULES

1. No emojis.
2. Wrap all numbers, prices, percentages, and metrics in \`backticks\`.
3. Bold section headers exactly as labelled above (**Data**, **News and Market Impact**, **Bottom Line**).
4. Target length: 1100-1600 words on the first response, 400-600 on follow-ups. Density over brevity — every paragraph must contain at least one specific number from the context block.
5. If required data is missing from the context block, OMIT the affected sentence/field entirely (per the "HANDLING MISSING / N/A DATA" rule) — do not guess, do not write "N/A", and do not write sentences whose only purpose is to enumerate missing fields.
6. Never omit the mandatory disclaimer.
7. Never recycle the same explanatory sentence across sections — each token's report must read as bespoke to that token's actual numbers.
8. Use markdown bulleted lists ("- " prefix) for any enumeration of 3+ items: notable whale movements, accumulation/distribution events, recent largest transactions, supportive/critical themes. Do not pack these into long comma-separated paragraphs.
*/

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

    // -------------------------------------------------------------------------
    // ORCA Orchestration v2 (§4.C of ORCA_COPILOT_BUILD_PROMPT.md).
    // Behind a feature flag. When false, fall through to the legacy single-
    // prompt path immediately below. When true, run the four-stage pipeline
    // (router → planner → tools → writer → guardrails) and persist the trace.
    // -------------------------------------------------------------------------
    if (process.env.ORCA_ORCHESTRATION_V2 === 'true') {
      try {
        const v2Body = body as { history?: ChatTurn[]; confirm?: { calls?: ToolCall[] } }
        const chatHistory: ChatTurn[] = Array.isArray(v2Body.history)
          ? v2Body.history
              .filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
              .slice(-12)
          : []
        const confirmedWriteCalls: ToolCall[] = Array.isArray(v2Body.confirm?.calls)
          ? v2Body.confirm!.calls!.filter((c) => c && typeof c.tool === 'string')
          : []
        const userConfirmed = confirmedWriteCalls.length > 0

        let profile: UserProfileSnapshot | null = null
        try {
          const { data } = await supabase
            .from('user_profile')
            .select('user_id, experience_level, primary_goal, risk_tolerance, time_horizon, preferred_chains')
            .eq('user_id', userId)
            .maybeSingle()
          if (data) profile = data as UserProfileSnapshot
        } catch (profileErr) {
          console.warn('[orchestrator] could not load user_profile', profileErr)
        }

        const { client: ai, model: aiModel, miniModel } = getAIClient()
        const out = await runOrchestrator(
          { message, userId, chatHistory, profile, userConfirmed, confirmedWriteCalls },
          {
            supabase,
            model: {
              routerCall: async (sys, usr) => {
                const r = await ai.chat.completions.create({
                  model: miniModel,
                  messages: [
                    { role: 'system', content: sys },
                    { role: 'user', content: usr },
                  ],
                  temperature: 0,
                  max_tokens: 400,
                  response_format: { type: 'json_object' } as any,
                })
                return r.choices[0]?.message?.content ?? ''
              },
              writerCall: async (sys, usr) => {
                const r = await ai.chat.completions.create({
                  model: aiModel,
                  messages: [
                    { role: 'system', content: sys },
                    { role: 'user', content: usr },
                  ],
                  temperature: 0.5,
                  max_tokens: 2000,
                })
                return r.choices[0]?.message?.content ?? ''
              },
            },
          }
        )

        // Persist trace. Failures here MUST NOT block the user response.
        try {
          const messageId = `${userId}-${Date.now()}`
          const rows = out.trace.map((evt) => ({
            user_id: userId,
            message_id: messageId,
            stage: evt.stage,
            payload: evt.payload,
            latency_ms: evt.latency_ms ?? null,
            model: evt.model ?? null,
          }))
          await supabase.from('orca_traces').insert(rows)
        } catch (traceErr) {
          console.warn('[orchestrator] trace persist failed', traceErr)
        }

        // Fire-and-forget memory extractor (§4.G). Runs after the response is
        // computed; we do NOT await it so the user reply ships immediately.
        // The extractor itself never throws — but we wrap defensively anyway.
        if (out.intent !== 'compliance_decline' && out.text) {
          try {
            const { extractMemoryFacts } = await import('@/lib/orca/memory/extractor')
            void extractMemoryFacts({
              userId,
              userMessage: message,
              orcaResponse: out.text,
              supabase,
              model: {
                extractCall: async (sys, usr) => {
                  const r = await ai.chat.completions.create({
                    model: miniModel,
                    messages: [
                      { role: 'system', content: sys },
                      { role: 'user', content: usr },
                    ],
                    temperature: 0,
                    max_tokens: 400,
                    response_format: { type: 'json_object' } as any,
                  })
                  return r.choices[0]?.message?.content ?? ''
                },
              },
            }).catch((extractErr) => {
              console.warn('[orca/memory/extractor] background failure', extractErr)
            })
          } catch (importErr) {
            console.warn('[orca/memory/extractor] import failed', importErr)
          }
        }

        return NextResponse.json({
          response: out.text,
          intent: out.intent,
          orchestrator: 'v2',
        })
      } catch (orchErr) {
        console.error('[orchestrator] v2 path failed, falling back to v1', orchErr)
        // Fall through to v1 path below.
      }
    }


    // If no ticker found, try to get last ticker from chat history (for follow-up questions)
    // -------------------------------------------------------------------------
    // STAGE A — Intent routing bridge (2026-05-26).
    // Behind env flag ORCA_INTENT_ROUTING (default ON; set to 'false' to kill).
    //
    // Goal: stop the v1 chat from defaulting to the last-mentioned ticker
    // (typically BTC) when the user actually asked about a wallet, an
    // article, or a non-ticker data query. We run the v4 router (mini-LLM,
    // strict JSON) ONLY when v1's ticker extractor came up empty.
    //
    // Outcomes:
    //   - router finds a ticker we missed   → use it for v1 SSE path (KEEPS
    //                                          ORCA_SYSTEM_PROMPT + chart).
    //   - intent === 'compliance_decline'    → return hardcoded decline JSON.
    //   - intent ∈ {wallet_lookup, article_explain, data_query,
    //              signal_explain}           → run orchestrator AND wrap in
    //                                          SSE so ClientOrca renders the
    //                                          live progress stream like v1.
    //   - everything else                    → fall through to the legacy
    //                                          history-fallback + conversational
    //                                          path below (no behaviour change).
    //
    // We deliberately DO NOT route `personal` or `overview` through the
    // orchestrator here — those would invoke renderPersonalPrompt which the
    // 2026-05-25 rebuild brief flagged as the killer (short peer-chat
    // answers instead of the v1 long-form research note).
    // -------------------------------------------------------------------------
    const intentRoutingEnabled = process.env.ORCA_INTENT_ROUTING !== 'false'
    if (!tickerResult.ticker && intentRoutingEnabled) {
      console.log('🧭 No ticker found — running intent router...')
      try {
        const { client: ai, miniModel, model: aiModel } = getAIClient()
        const routerStart = Date.now()
        const decision = await routeMessage(
          { message, userId, chatHistory: [] },
          {
            routerCall: async (sys, usr) => {
              const r = await ai.chat.completions.create({
                model: miniModel,
                messages: [
                  { role: 'system', content: sys },
                  { role: 'user', content: usr },
                ],
                temperature: 0,
                max_tokens: 400,
                response_format: { type: 'json_object' } as any,
              })
              return r.choices[0]?.message?.content ?? ''
            },
            writerCall: async () => '',
          }
        )
        console.log(`🧭 router → intent=${decision.intent} conf=${decision.confidence.toFixed(2)} tickers=[${decision.tickers.join(',')}] entities=[${decision.entities.slice(0,3).join(',')}] (${Date.now() - routerStart}ms)`)

        // Compliance decline short-circuit.
        if (decision.intent === 'compliance_decline') {
          return NextResponse.json({
            response: COMPLIANCE_DECLINE_RESPONSE,
            type: 'compliance_decline',
            intent: decision.intent,
          })
        }

        // If the router caught a ticker the regex missed, hand off to v1.
        if (decision.tickers.length > 0) {
          const t = decision.tickers[0]
          console.log(`🧭 router recovered ticker ${t} → handing to v1 path`)
          tickerResult = {
            ticker: t,
            confidence: Math.max(0.6, decision.confidence),
            normalized: t,
            originalMatch: 'router',
          }
        } else if (
          decision.intent === 'wallet_lookup' ||
          decision.intent === 'article_explain' ||
          decision.intent === 'data_query' ||
          decision.intent === 'signal_explain'
        ) {
          // Non-ticker intent with its own renderer — run the orchestrator
          // for THIS turn only and wrap in SSE so the UI gets parity with
          // v1's loading-stage display. The orchestrator's `personal` and
          // `overview` paths are deliberately excluded (see comment above).
          const stageLabel: Record<string, string> = {
            wallet_lookup: 'Looking up wallet activity',
            article_explain: 'Fetching article context',
            data_query: 'Running data query',
            signal_explain: 'Loading Sonar signal context',
          }

          const encoder = new TextEncoder()
          const stream = new ReadableStream({
            async start(controller) {
              const send = (payload: Record<string, any>) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
              }
              try {
                send({ type: 'status', step: 'router', message: `Routing: ${decision.intent.replace(/_/g, ' ')}` })
                send({ type: 'status', step: 'tools', message: stageLabel[decision.intent] || 'Gathering data' })

                let profile: UserProfileSnapshot | null = null
                try {
                  const { data } = await supabase
                    .from('user_profile')
                    .select('user_id, experience_level, primary_goal, risk_tolerance, time_horizon, preferred_chains')
                    .eq('user_id', userId)
                    .maybeSingle()
                  if (data) profile = data as UserProfileSnapshot
                } catch (profileErr) {
                  console.warn('[stage-a] profile load failed', profileErr)
                }

                const out = await runOrchestrator(
                  { message, userId, chatHistory: [], profile },
                  {
                    supabase,
                    model: {
                      routerCall: async () => JSON.stringify({
                        intent: decision.intent,
                        tickers: decision.tickers,
                        entities: decision.entities,
                        datapoints: decision.datapoints,
                        persona_hint: decision.persona_hint,
                        confidence: decision.confidence,
                      }),
                      writerCall: async (sys, usr) => {
                        send({ type: 'status', step: 'ai_thinking', message: 'ORCA writing response...' })
                        const r = await ai.chat.completions.create({
                          model: aiModel,
                          messages: [
                            { role: 'system', content: sys },
                            { role: 'user', content: usr },
                          ],
                          temperature: 0.5,
                          max_tokens: 3000,
                        })
                        return r.choices[0]?.message?.content ?? ''
                      },
                    },
                  }
                )

                // Increment quota + persist trace + log chat (non-blocking).
                Promise.all([
                  incrementQuota(userId, supabaseUrl, supabaseKey),
                  supabase.from('chat_history').insert({
                    user_id: userId,
                    session_id: session_id || null,
                    user_message: message,
                    orca_response: out.text,
                    tokens_used: 0,
                    model: aiModel,
                    tickers_mentioned: decision.tickers,
                    data_sources_used: { intent: out.intent },
                    response_time_ms: Date.now() - startTime,
                  }),
                  (async () => {
                    try {
                      const messageId = `${userId}-${Date.now()}`
                      const rows = out.trace.map((evt) => ({
                        user_id: userId,
                        message_id: messageId,
                        stage: evt.stage,
                        payload: evt.payload,
                        latency_ms: evt.latency_ms ?? null,
                        model: evt.model ?? null,
                      }))
                      await supabase.from('orca_traces').insert(rows)
                    } catch (traceErr) {
                      console.warn('[stage-a] trace persist failed', traceErr)
                    }
                  })(),
                ]).catch((logErr) => console.warn('[stage-a] post-write log failed', logErr))

                send({
                  type: 'complete',
                  success: true,
                  response: out.text,
                  intent: out.intent,
                  data: null,
                  quota: {
                    used: quotaStatus.used + 1,
                    limit: quotaStatus.limit,
                    remaining: Math.max(0, quotaStatus.remaining - 1),
                    plan: quotaStatus.plan,
                  },
                  metadata: { response_time_ms: Date.now() - startTime },
                })
              } catch (streamErr) {
                console.error('[stage-a] orchestrator SSE error', streamErr)
                send({
                  type: 'error',
                  message: streamErr instanceof Error ? streamErr.message : 'Unknown error',
                })
              }
              controller.close()
            },
          })

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          })
        }
        // For overview / explainer / followup / personal with no ticker:
        // fall through to the legacy paths below.
      } catch (routerErr) {
        console.warn('[stage-a] router pass failed, falling back to v1 history path', routerErr)
      }
    }

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
            temperature: 0.6,
            max_tokens: isFollowUp ? 2000 : 6000
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
