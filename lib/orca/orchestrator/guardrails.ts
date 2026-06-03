/**
 * Guardrails — Stage 5 of the ORCA orchestrator (§4.C).
 * =============================================================================
 * Post-processes the writer's draft to enforce the existing HARD RULES from
 * lib/orca/system-prompt.ts: no recommendation verbs, exactly one disclaimer
 * line, no fabricated price targets.
 *
 * Pure functions; no IO. Easy to unit test.
 */

import { MANDATORY_DISCLAIMER } from '../shared-rules'

export const STANDARD_DISCLAIMER =
  'Not financial advice. This is research-grade analysis only.'

export const COMPLIANCE_DECLINE_RESPONSE =
  "I can't tell you whether to buy or sell. I can show you what's happening on-chain, in the news, and in derivatives so you can make your own call. " +
  STANDARD_DISCLAIMER

/**
 * Forbidden verb patterns. Word-boundary matched, case-insensitive. The
 * goal is to catch ORCA telling the user what to do, NOT to censor news
 * headlines that contain those words. We therefore check only sentences
 * the model is asserting in first-person voice (a heuristic — full
 * NLI is out of scope).
 */
const FORBIDDEN_VERB_RE =
  /\b(buy|sell|short|long|invest in|dump|hold|hodl|moon|recommend|advise|suggest you|you should)\b/i

const PREDICTION_RE =
  /\b(will (?:hit|reach|go to|moon|drop to)|guaranteed|risk[- ]free|sure thing|price target)\b/i

export interface GuardrailResult {
  text: string
  violations: string[]
  declined: boolean
}

export function applyGuardrails(draft: string): GuardrailResult {
  if (typeof draft !== 'string' || draft.trim().length === 0) {
    return {
      text:
        "I could not generate a response just now. Please try rephrasing. " +
        STANDARD_DISCLAIMER,
      violations: ['empty_draft'],
      declined: true,
    }
  }

  const violations: string[] = []
  const sentences = splitSentences(draft)
  for (const s of sentences) {
    if (looksLikeFirstPersonRecommendation(s)) {
      if (FORBIDDEN_VERB_RE.test(s)) violations.push('forbidden_verb')
      if (PREDICTION_RE.test(s)) violations.push('prediction')
    }
  }

  if (violations.length > 0) {
    return {
      text: COMPLIANCE_DECLINE_RESPONSE,
      violations,
      declined: true,
    }
  }

  return {
    text: ensureSingleDisclaimer(draft),
    violations: [],
    declined: false,
  }
}

export function ensureSingleDisclaimer(text: string): string {
  // Every ORCA answer must end with EXACTLY ONE disclaimer. Two systems used
  // to both append one — the renderer prompt told the writer to add the long
  // MANDATORY_DISCLAIMER, and this function added the short STANDARD one —
  // producing a visible double disclaimer. We now collapse both into a single
  // canonical block: strip everything from the first long-disclaimer marker
  // onward (the long disclaimer plus any trailing duplicate), drop any stray
  // short-disclaimer lines, then append one canonical disclaimer at the end.
  //
  // The long MANDATORY_DISCLAIMER is preferred as the canonical block because
  // the chat client detects its opening phrase and renders it as tiny, muted
  // fine-print. We fall back to the short STANDARD disclaimer only when the
  // draft never carried the long one (keeps existing plain-text behaviour).
  const mandatoryIdx = text.search(/this output is an automated summary/i)
  const hadMandatory = mandatoryIdx !== -1
  const head = hadMandatory ? text.slice(0, mandatoryIdx) : text
  const body = head
    .split(/\r?\n/)
    .filter((l) => !isDisclaimerLine(l))
    .join('\n')
    .replace(/\n?[-_*]{3,}\s*$/g, '')
    .replace(/\s+$/, '')
  const canonical = hadMandatory ? MANDATORY_DISCLAIMER : STANDARD_DISCLAIMER
  return `${body}\n\n${canonical}`.trim()
}

function isDisclaimerLine(line: string): boolean {
  const norm = line.trim().toLowerCase().replace(/[*_`]/g, '')
  if (!norm) return false
  return (
    norm.startsWith('not financial advice') ||
    norm.includes('this is research-grade analysis only') ||
    norm.includes('this is not financial advice')
  )
}

/** Best-effort sentence splitter. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * A sentence "looks like" a first-person recommendation when ORCA is
 * speaking in the imperative or second person, not when it's quoting
 * someone else or reporting a fact.
 *
 * Heuristics:
 * - Starts with "You should", "I recommend", "I'd buy", etc.
 * - Or contains "you should" / "I recommend" / "my recommendation" anywhere.
 * - News-style sentences ("Whales bought 12k ETH today") don't trip this.
 */
function looksLikeFirstPersonRecommendation(s: string): boolean {
  const norm = s.toLowerCase()
  if (/^(you should|i recommend|i suggest|i would|i'd|my recommendation)/.test(norm)) {
    return true
  }
  if (/\b(you should|i recommend|my recommendation|i suggest you|i advise)\b/.test(norm)) {
    return true
  }
  // "BTC will hit 100k" style claims are also flagged regardless of person.
  if (PREDICTION_RE.test(s)) return true
  return false
}
