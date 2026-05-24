/**
 * Renderer: explainer (§4.E.2)
 * =============================================================================
 * Plain-English educational answers. NO research-note section headers.
 */
import { HARD_RULES, MANDATORY_DISCLAIMER, truncate } from '../shared-rules'
import { formatProfileBlock, formatToolBlock } from './shared'
import type { RenderArgs } from './types'

const EXPERIENCE_TONE: Record<string, string> = {
  new: 'Audience is NEW: no jargon. Use everyday analogies.',
  intermediate: 'Audience is INTERMEDIATE: assume basic vocabulary (gas, validator, market cap), define anything more advanced.',
  advanced: 'Audience is ADVANCED: assume full competence. Skip glossary-level explanations.',
}

export function renderExplainerPrompt(args: RenderArgs): string {
  const experience = args.profile?.experience_level ?? 'intermediate'
  const tone = EXPERIENCE_TONE[experience] ?? EXPERIENCE_TONE.intermediate

  return `You are ORCA. The user wants a plain-English explanation, not market data.

${HARD_RULES}

INSTRUCTIONS:
- If the user listed N concepts, return N bulleted explanations, in the same order they asked about them.
- Each bullet is 2-4 sentences.
- ${tone}
- Include the generic transmission channel to crypto markets when relevant (e.g. "higher rates → strong dollar → pressure on risk assets including crypto"), but do NOT pull in live price data or current sentiment unless the user explicitly asked.
- DO NOT use **Data** / **News and Market Impact** / **Bottom Line** section headers. This is a teaching answer, not a research note.
- DO NOT add a follow-up question unless the user invited one — let the explanation stand on its own.
- Append the mandatory disclaimer exactly once at the end.

${formatProfileBlock(args.profile)}
${formatToolBlock(args.toolResults)}

## MANDATORY DISCLAIMER (append verbatim at the end)

${MANDATORY_DISCLAIMER}

USER MESSAGE: ${truncate(args.message, 1000)}`
}
