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

  // Fix #5 — off-glossary graceful answer. When the macro tool returned no
  // matches but the user clearly asked "what is X", authorise a general,
  // first-principles definition from the model's own training knowledge —
  // bounded to education, never live numbers/dates/levels or direction.
  const macroEmpty = isMacroResultEmpty(args.toolResults)
  const asksDefinition = /\bwhat(?:'s| is| are| does| do)\b|\bwhat\b.*\bmean(s|ing)?\b|\bexplain\b|\bdefine\b/i.test(
    args.message ?? ''
  )
  const offGlossaryBlock =
    macroEmpty && asksDefinition
      ? `\n- OFF-GLOSSARY FALLBACK: the supplied tools returned no canonical definition for what the user asked. Give a general, first-principles explanation from your own general knowledge, explicitly framed as general education (e.g. "In general terms, ..."). Calibrate to the user's experience level. Name the transmission channel to crypto markets where one exists. You MUST NOT cite any specific live numbers, prices, levels, dates, or current events you did not fetch — keep it strictly definitional. No predictions, no directional language.`
      : ''

  return `You are ORCA. The user wants a plain-English explanation, not market data.

${HARD_RULES}

INSTRUCTIONS:
- If the user listed N concepts, return N bulleted explanations, in the same order they asked about them.
- Each bullet is 2-4 sentences.
- ${tone}
- Include the generic transmission channel to crypto markets when relevant (e.g. "higher rates → strong dollar → pressure on risk assets including crypto"), but do NOT pull in live price data or current sentiment unless the user explicitly asked.
- DO NOT use **Data** / **News and Market Impact** / **Bottom Line** section headers. This is a teaching answer, not a research note.
- DO NOT add a follow-up question unless the user invited one — let the explanation stand on its own.${offGlossaryBlock}
- Append the mandatory disclaimer exactly once at the end.

${formatProfileBlock(args.profile)}
${formatToolBlock(args.toolResults)}

## MANDATORY DISCLAIMER (append verbatim at the end)

${MANDATORY_DISCLAIMER}

USER MESSAGE: ${truncate(args.message, 1000)}`
}

/**
 * Fix #5 — true when the explainMacroFactor tool ran but returned no matches
 * (the concept is outside the hard-coded glossary). Returns false when the
 * tool was never scheduled, so non-macro explainer turns are unaffected.
 */
function isMacroResultEmpty(toolResults: RenderArgs['toolResults']): boolean {
  let saw = false
  for (const { call, result } of toolResults) {
    if (call.tool !== 'explainMacroFactor') continue
    saw = true
    const matches = result.ok ? (result.data as any)?.matches ?? [] : []
    if (Array.isArray(matches) && matches.length > 0) return false
  }
  return saw
}
