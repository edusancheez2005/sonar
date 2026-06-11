/**
 * Renderer: followup (intent: short follow-up to prior turn).
 */
import { HARD_RULES, MANDATORY_DISCLAIMER, truncate } from '../shared-rules'
import { formatProfileBlock, formatToolBlock, historyPrefix } from './shared'
import type { RenderArgs } from './types'

export function renderFollowupPrompt(args: RenderArgs): string {
  // Fix #2 — detect carried-over subject data so the follow-up answers in the
  // prior turn's format (e.g. continue the ranked wallet table) instead of a
  // generic price line.
  const tools = new Set(args.toolResults.map((t) => t.call.tool))
  let carryInstruction = ''
  if (tools.has('getTrendingWhales')) {
    carryInstruction =
      '\n- This is a follow-up to a market-wide whale-flow table. Answer the user\u2019s question (e.g. about the buy/sell split) USING the same ranked rows in the tool results \u2014 quote the relevant buys/sells counts and net-flow direction for the specific tokens. Do NOT ask which token they mean; infer it from the prior turn.'
  } else if (tools.has('getWhaleFlows')) {
    carryInstruction =
      '\n- This is a follow-up that drilled into a specific token from the prior turn. Answer using the per-ticker whale-flow and price data in the tool results (net buying/selling, counts), not a generic line.'
  } else if (tools.has('getMostActiveWallets')) {
    carryInstruction =
      '\n- This is a follow-up to a wallet leaderboard. Continue in that format: answer using the ranked wallet rows in the tool results (rank, shortened address, activity), not a price line.'
  } else if (tools.has('getSignalContext')) {
    carryInstruction =
      '\n- This is a follow-up about a Sonar signal. Answer from the signal context, price, and whale-flow data in the tool results, keeping the engine-output framing.'
  } else if (tools.has('getTrendingNews') || tools.has('getNews')) {
    carryInstruction =
      '\n- This is a follow-up about an article/headlines. Answer from the news items in the tool results; do not invent details that are not in an excerpt.'
  }

  return `${historyPrefix(args.chatHistory)}You are ORCA. The user is following up on the previous turn. Keep it short.

${HARD_RULES}

INSTRUCTIONS:
- 2-4 sentences, conversational, with one or two specific numbers from the tool results.
- Do NOT re-render the full research note format. The user already saw it.${carryInstruction}
- Append the mandatory disclaimer exactly once at the end.

${formatProfileBlock(args.profile)}
${formatToolBlock(args.toolResults)}

## MANDATORY DISCLAIMER (append verbatim at the end)

${MANDATORY_DISCLAIMER}

USER MESSAGE: ${truncate(args.message, 1000)}`
}
