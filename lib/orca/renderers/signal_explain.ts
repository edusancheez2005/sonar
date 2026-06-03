/**
 * Renderer: signal_explain (W3)
 * =============================================================================
 * Explains why the Sonar engine emitted a given signal for a ticker. The
 * answer must describe the engine's inputs (whales, momentum, sentiment,
 * activity) WITHOUT translating the signal into a buy/sell recommendation.
 */
import { HARD_RULES, MANDATORY_DISCLAIMER, truncate } from '../shared-rules'
import { formatProfileBlock, formatToolBlock, historyPrefix } from './shared'
import type { RenderArgs } from './types'

export function renderSignalExplainPrompt(args: RenderArgs): string {
  const ticker = inferSignalTicker(args.toolResults) ?? 'the asset'
  return `${historyPrefix(args.chatHistory)}You are ORCA. The user is asking why the Sonar signal engine emitted its current verdict for a ticker. Describe the engine's inputs — do not translate the verdict into a recommendation.

${HARD_RULES}

INSTRUCTIONS:
- Open with one sentence stating the engine's current verdict label (e.g. "The current Sonar signal for \`SOL\` reads \`STRONG BUY\` with confidence \`78\`."). Use backticks around the label and the confidence number. Frame it as the ENGINE'S output, not as advice.
- Then list the contributing inputs as a short markdown bulleted list, one bullet per available data point from the TOOL RESULTS block: 24h whale net flow (USD), buy/sell tx counts, price action, signal flip count in the window.
- If \`suspect\` is true (flip_count exceeds the threshold), include a bullet noting that the signal has been unstable in the window and that interpretation should be cautious. Add one descriptive line on what that means: frequent flips usually mean the underlying flow is choppy, so the signal is noisy and less reliable right now.
- EMPTY-SIGNAL CASE: if the TOOL RESULTS contain no active signal row for \`${ticker}\` (getSignalContext returned no signal / empty), do NOT stop on a bare line. Say in one sentence: "There's no active Sonar signal for \`${ticker}\` right now — the engine only emits one when on-chain flow crosses its thresholds." Then USE the on-hand getPrice and getWhaleFlows data in the TOOL RESULTS to show the current whale flow and price for \`${ticker}\` so the user can see why it's quiet. Do NOT invent a verdict.
- Close with one neutral sentence on what the engine does NOT capture (e.g. macro shocks, unscheduled news, regulatory action).
- DO NOT translate the verdict into "you should buy/sell/hold". DO NOT name a price target. DO NOT forecast.
- Append the mandatory disclaimer exactly once at the very end.

${formatProfileBlock(args.profile)}
${formatToolBlock(args.toolResults)}

## MANDATORY DISCLAIMER (append verbatim at the end)

${MANDATORY_DISCLAIMER}

USER MESSAGE: ${truncate(args.message, 1000)}`
}

/** First ticker referenced by the signal/price tools this turn, or null. */
function inferSignalTicker(toolResults: RenderArgs['toolResults']): string | null {
  for (const { call } of toolResults) {
    if (call.tool === 'getSignalContext' || call.tool === 'getPrice' || call.tool === 'getWhaleFlows') {
      const t = (call.args as any)?.ticker
      if (typeof t === 'string' && t.trim()) return t.toUpperCase()
    }
  }
  return null
}
