/**
 * Renderer: compliance_decline (intent: user asked for buy/sell advice).
 */
import { COMPLIANCE_DECLINE_RESPONSE } from '../orchestrator/guardrails'
import type { RenderArgs } from './types'

export function renderComplianceDeclinePrompt(_args: RenderArgs): string {
  // The orchestrator short-circuits this intent and never actually calls
  // the writer — guardrails directly emit COMPLIANCE_DECLINE_RESPONSE.
  // We still expose a renderer so the dispatcher is exhaustive.
  return `You are ORCA. The user requested a buy / sell / will-it-moon judgement. Reply with EXACTLY this text and nothing else:

${COMPLIANCE_DECLINE_RESPONSE}`
}
