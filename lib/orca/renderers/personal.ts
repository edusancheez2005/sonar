/**
 * Renderer: personal (§4.E.1)
 * =============================================================================
 * For questions about the user's own holdings, watchlist, or memory.
 */
import { HARD_RULES, MANDATORY_DISCLAIMER, truncate } from '../shared-rules'
import { formatProfileBlock, formatToolBlock, historyPrefix } from './shared'
import type { RenderArgs } from './types'
import { INLINE_CHART_DIRECTIVE } from './inline-chart-directive'

const EXPERIENCE_TONE: Record<string, string> = {
  new: 'Calibrate to a NEW user: use analogies, no jargon, define every metric you mention.',
  intermediate: 'Calibrate to an INTERMEDIATE user: metrics with one-line context.',
  advanced: 'Calibrate to an ADVANCED user: dense numbers, minimal hand-holding.',
}

const HORIZON_HINT: Record<string, string> = {
  intraday: 'User is intraday-focused. Lead with 1h and 24h windows. Skip 30d/90d unless directly asked.',
  swing: 'User is swing-focused (days to weeks). Lead with 24h and 7d windows.',
  long_term: 'User is long-term focused (months+). Lead with 30d / 90d windows. Do not give 1h commentary — it is noise.',
}

export function renderPersonalPrompt(args: RenderArgs): string {
  const experience = args.profile?.experience_level ?? 'intermediate'
  const horizon = args.profile?.time_horizon ?? ''
  const tone = EXPERIENCE_TONE[experience] ?? EXPERIENCE_TONE.intermediate
  const horizonLine = HORIZON_HINT[horizon] ?? ''

  const trackedTickers = collectTrackedTickers(args.toolResults)
  const offerCandidate = detectOfferCandidate(args.toolResults, trackedTickers)
  const offerLine = offerCandidate
    ? `\n\nProactive offer (place before the disclaimer, after the follow-up question): "I notice ${offerCandidate} isn't in your personal dashboard yet — want me to add it so we can track whale flows and news as they happen?" Render as: [ Yes, track it ] [ No thanks ]. Do NOT emit more than one such offer per response.`
    : ''

  // Fix #4 — empty-portfolio onboarding. When the user tracks nothing, pivot
  // from a blank answer to live market context plus a confirm-gated add offer.
  const emptyPortfolio = hasEmptyPortfolio(args.toolResults)
  const hasLeaderboard = args.toolResults.some(
    (t) => t.call.tool === 'getTrendingWhales' && t.result.ok
  )
  const onboardingBlock = emptyPortfolio
    ? `\n\nEMPTY-PORTFOLIO ONBOARDING (this overrides instruction 1 above — the user is not tracking anything yet):
- Open by acknowledging plainly: "You're not tracking anything yet." Do not guess what they own.
- ${
        hasLeaderboard
          ? "Pivot to value using the getTrendingWhales market-wide data in the tool results: surface the 2-3 most active names as a short ranked list, numbers in backticks. Do not invent rows beyond the tool result."
          : "Offer to pull the current market-wide trending list so they have a starting point. Do not fabricate any names or numbers."
      }
- Close with ONE confirm-gated offer to start tracking: "Want me to add \`BTC\`, \`ETH\`, or \`SOL\` to your watchlist so I can keep you posted?" Render as: [ Yes, add it ] [ No thanks ]. Do NOT write anything to the watchlist without an explicit confirmation on the next turn.
- Keep it non-directional: never say the user should buy/sell/hold any of these.`
    : ''

  return `${historyPrefix(args.chatHistory)}You are ORCA, the user's personalised crypto research copilot.

${HARD_RULES}

${formatProfileBlock(args.profile)}

INSTRUCTIONS (in order, all required):
1. Acknowledge the user's existing position or interest naturally (e.g. "Since you're tracking SOL..."). NEVER repeat their portfolio back to them in full — they know what they own.
2. Surface the 2-3 most relevant data points for what they asked. ${tone}
3. ${horizonLine}
4. NEVER say "you should buy/sell/hold/add/trim/rebalance". NEVER give a price target. NEVER tell them whether their position is a good idea. If asked directly, decline using the HARD RULES decline string.
5. End with ONE neutral, data-oriented follow-up question that is genuinely relevant to what they asked. Not a canned filler.
6. Append the mandatory disclaimer EXACTLY once.${offerLine}${onboardingBlock}

${INLINE_CHART_DIRECTIVE}

TONE: friendly, concise, peer-level. Not "AI assistant" voice. Not "trading desk" voice.

${formatToolBlock(args.toolResults)}

## MANDATORY DISCLAIMER (append verbatim at the end)

${MANDATORY_DISCLAIMER}

USER MESSAGE: ${truncate(args.message, 1000)}`
}

function collectTrackedTickers(
  toolResults: RenderArgs['toolResults']
): Set<string> {
  const set = new Set<string>()
  for (const { call, result } of toolResults) {
    if (!result.ok) continue
    if (call.tool === 'getUserHoldings') {
      for (const h of (result.data as any)?.holdings ?? []) {
        if (h?.ticker) set.add(String(h.ticker).toUpperCase())
      }
    }
    if (call.tool === 'getUserWatchlist') {
      for (const t of (result.data as any)?.tickers ?? []) {
        set.add(String(t).toUpperCase())
      }
    }
  }
  return set
}

function detectOfferCandidate(
  toolResults: RenderArgs['toolResults'],
  tracked: Set<string>
): string | null {
  for (const { call, result } of toolResults) {
    if (!result.ok) continue
    if (call.tool === 'getPrice' || call.tool === 'getWhaleFlows' || call.tool === 'getNews') {
      const t = (call.args as any)?.ticker
      if (typeof t === 'string') {
        const upper = t.toUpperCase()
        if (!tracked.has(upper)) return upper
      }
    }
  }
  return null
}

/**
 * Fix #4 — true when BOTH getUserHoldings and getUserWatchlist ran and both
 * returned no rows. Requires the tools to have actually run (a turn that never
 * fetched them is not "empty portfolio", just a different question).
 */
function hasEmptyPortfolio(toolResults: RenderArgs['toolResults']): boolean {
  let sawHoldings = false
  let sawWatchlist = false
  let holdingsEmpty = true
  let watchlistEmpty = true
  for (const { call, result } of toolResults) {
    if (call.tool === 'getUserHoldings') {
      sawHoldings = true
      const arr = result.ok ? (result.data as any)?.holdings ?? [] : []
      if (Array.isArray(arr) && arr.length > 0) holdingsEmpty = false
    }
    if (call.tool === 'getUserWatchlist') {
      sawWatchlist = true
      const arr = result.ok ? (result.data as any)?.tickers ?? [] : []
      if (Array.isArray(arr) && arr.length > 0) watchlistEmpty = false
    }
  }
  return sawHoldings && sawWatchlist && holdingsEmpty && watchlistEmpty
}
