/**
 * Renderer: article_explain (W3)
 * =============================================================================
 * Explains a single news article and its possible transmission channels to
 * crypto markets, without forecasting price.
 */
import { HARD_RULES, MANDATORY_DISCLAIMER, truncate } from '../shared-rules'
import { formatProfileBlock, formatToolBlock, historyPrefix } from './shared'
import type { RenderArgs } from './types'

export function renderArticleExplainPrompt(args: RenderArgs): string {
  // Fix #6 — name a ticker in the not-found fallback when the turn carried one
  // (the planner emits getNews per referenced ticker), else offer trending news.
  const ticker = inferArticleTicker(args.toolResults)
  const notFoundLine = ticker
    ? `- If the article was not found (\`found: false\`), do NOT stop on a bare line. Say in one sentence that you couldn't pull that article (it may be older than 30 days or not in your index), then offer a real alternative: "I can show you the latest headlines for \`${ticker}\` instead — want that?" Do NOT invent a summary of the missing article.`
    : `- If the article was not found (\`found: false\`), do NOT stop on a bare line. Say in one sentence that you couldn't pull that article (it may be older than 30 days or not in your index), then offer a real alternative: "I can pull the latest trending crypto headlines instead — want that?" Do NOT invent a summary of the missing article.`

  return `${historyPrefix(args.chatHistory)}You are ORCA. The user is asking ORCA to explain a specific news article. Stay descriptive and grounded in the supplied excerpt.

${HARD_RULES}

INSTRUCTIONS:
- Open with the headline as a markdown link, followed by the source and a short relative timestamp ("2h ago", "yesterday").
- Summarise what the article actually says in 2-3 sentences, using only the supplied excerpt. Do NOT invent details the excerpt does not contain.
- Then explain the SHORT-TERM transmission channel to crypto markets (hours to weeks) using a specific mechanism: e.g. "tightens dollar liquidity \u2192 typically pressures risk assets including high-beta crypto", "removes a regulatory overhang \u2192 reduces uncertainty premium". Name the channel; do not say "this may affect sentiment".
- Then explain any LONG-TERM (months to years) structural angle if one applies.
- Close with a one-sentence "What this article does NOT tell you" caveat (e.g. it doesn't tell us what flows actually did on-chain in response, etc.).
- DO NOT predict a price move, name a price target, or suggest any action.
${notFoundLine}
- Append the mandatory disclaimer exactly once at the very end.

${formatProfileBlock(args.profile)}
${formatToolBlock(args.toolResults)}

## MANDATORY DISCLAIMER (append verbatim at the end)

${MANDATORY_DISCLAIMER}

USER MESSAGE: ${truncate(args.message, 1000)}`
}

/** First ticker referenced by a getNews call this turn, upper-cased, or null. */
function inferArticleTicker(toolResults: RenderArgs['toolResults']): string | null {
  for (const { call } of toolResults) {
    if (call.tool === 'getNews') {
      const t = (call.args as any)?.ticker
      if (typeof t === 'string' && t.trim()) return t.toUpperCase()
    }
  }
  return null
}
