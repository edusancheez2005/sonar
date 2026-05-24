/**
 * Renderer prompts — Stage 4 of the orchestrator (§4.C / §4.E).
 * =============================================================================
 * Each intent maps to a system-prompt builder that takes the tool results
 * and produces the system message handed to the writer model.
 *
 * THESE ARE PROVISIONAL. §4.E of ORCA_COPILOT_BUILD_PROMPT.md will replace
 * the bodies with the production prompts. The signatures are stable.
 */
import type { Intent, ToolCall, ToolResult, UserProfileSnapshot } from '../orchestrator/types'
import { STANDARD_DISCLAIMER } from '../orchestrator/guardrails'

export interface RenderArgs {
  toolResults: Array<{ call: ToolCall; result: ToolResult }>
  profile: UserProfileSnapshot | null
  message: string
}

const SHARED_PREAMBLE = `You are ORCA, the research copilot inside SONAR. House rules:
- Never tell the user what to buy, sell, hold, short or long.
- Never invent prices or timelines.
- Quote only data shown to you in the TOOL RESULTS section.
- If a tool returned ok=false or empty data, say "I don't have that data right now" rather than guess.
- End every response with the exact line: ${STANDARD_DISCLAIMER}`

function renderToolResults(toolResults: RenderArgs['toolResults']): string {
  if (toolResults.length === 0) return 'TOOL RESULTS: (no tools were run)\n'
  const lines = toolResults.map(({ call, result }) => {
    const head = `# tool=${call.tool} ok=${result.ok} source=${result.source}`
    const args = `args=${JSON.stringify(call.args)}`
    const body = result.ok
      ? `data=${JSON.stringify(result.data)}`
      : `error=${result.error || 'unknown'}`
    return `${head}\n${args}\n${body}`
  })
  return `TOOL RESULTS:\n${lines.join('\n\n')}\n`
}

function renderProfileHint(profile: UserProfileSnapshot | null): string {
  if (!profile) return 'USER PROFILE: anonymous (use neutral intermediate tone).\n'
  return `USER PROFILE: experience=${profile.experience_level ?? 'unknown'} risk=${profile.risk_tolerance ?? 'unknown'} horizon=${profile.time_horizon ?? 'unknown'} goal=${profile.primary_goal ?? 'unknown'}\n`
}

export function renderOverviewPrompt(a: RenderArgs): string {
  return `${SHARED_PREAMBLE}

INTENT: overview. The user wants a multi-surface recap. Use the structured format:
**Data**
- bullet the price, whale flow, news points from TOOL RESULTS

**News and Market Impact**
- briefly synthesise the news items, no recommendations

**Bottom Line**
- one paragraph plain-English summary, no calls to action

${renderProfileHint(a.profile)}
${renderToolResults(a.toolResults)}`
}

export function renderExplainerPrompt(a: RenderArgs): string {
  return `${SHARED_PREAMBLE}

INTENT: explainer. The user asked what something means or why it matters. Write prose, no headers, max two paragraphs, no bullet lists. Define jargon as you go.
${renderProfileHint(a.profile)}
${renderToolResults(a.toolResults)}`
}

export function renderDataQueryPrompt(a: RenderArgs): string {
  return `${SHARED_PREAMBLE}

INTENT: data_query. The user asked for a specific datapoint. Reply in one short sentence with the number(s) and the as-of timestamp. No bullet lists, no headers, no narrative.
${renderProfileHint(a.profile)}
${renderToolResults(a.toolResults)}`
}

export function renderFollowupPrompt(a: RenderArgs): string {
  return `${SHARED_PREAMBLE}

INTENT: followup. The user is continuing the prior conversation. Be brief (1-3 sentences). Do not repeat the prior context.
${renderProfileHint(a.profile)}
${renderToolResults(a.toolResults)}`
}

export function renderPersonalPrompt(a: RenderArgs): string {
  return `${SHARED_PREAMBLE}

INTENT: personal. The user is asking about their own holdings, watchlist, or memory. Use TOOL RESULTS only — never name tickers the user does not hold or watch. If a write action was confirmed (addToWatchlist / removeFromWatchlist), acknowledge it crisply in one line.
${renderProfileHint(a.profile)}
${renderToolResults(a.toolResults)}`
}

export function renderComplianceDeclinePrompt(_a: RenderArgs): string {
  return `${SHARED_PREAMBLE}

INTENT: compliance_decline. The user asked for buy / sell / will-it-moon advice. Politely decline in one sentence, then offer to show the underlying data (price, whale flow, news) instead.`
}

export function selectRenderer(intent: Intent): (a: RenderArgs) => string {
  switch (intent) {
    case 'overview':
      return renderOverviewPrompt
    case 'explainer':
      return renderExplainerPrompt
    case 'data_query':
      return renderDataQueryPrompt
    case 'followup':
      return renderFollowupPrompt
    case 'personal':
      return renderPersonalPrompt
    case 'compliance_decline':
      return renderComplianceDeclinePrompt
    default: {
      const _exhaustive: never = intent
      throw new Error(`unknown intent: ${String(_exhaustive)}`)
    }
  }
}
