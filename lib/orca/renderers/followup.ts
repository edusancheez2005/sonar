/**
 * Renderer: followup (intent: short follow-up to prior turn).
 */
import { HARD_RULES, MANDATORY_DISCLAIMER, truncate } from '../shared-rules'
import { formatProfileBlock, formatToolBlock } from './shared'
import type { RenderArgs } from './types'

export function renderFollowupPrompt(args: RenderArgs): string {
  return `You are ORCA. The user is following up on the previous turn. Keep it short.

${HARD_RULES}

INSTRUCTIONS:
- 2-4 sentences, conversational, with one or two specific numbers from the tool results.
- Do NOT re-render the full research note format. The user already saw it.
- Append the mandatory disclaimer exactly once at the end.

${formatProfileBlock(args.profile)}
${formatToolBlock(args.toolResults)}

## MANDATORY DISCLAIMER (append verbatim at the end)

${MANDATORY_DISCLAIMER}

USER MESSAGE: ${truncate(args.message, 1000)}`
}
