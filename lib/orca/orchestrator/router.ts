/**
 * Router — Stage 1 of the ORCA orchestrator (§4.C).
 * =============================================================================
 * Classifies a user message into one of six intents and extracts the data
 * surfaces the planner should consider. Uses a strict JSON-mode mini-model
 * call so the writer never sees free-form router prose.
 */
import type {
  Datapoint,
  Intent,
  ModelClient,
  Persona,
  RouterDecision,
  RouterInput,
} from './types'

const ROUTER_SYSTEM_PROMPT = `You are the routing layer of an AI crypto research copilot called ORCA. You do not write user-facing text. You output a single JSON object that classifies the user's question so a downstream pipeline can fetch the right data.

Output JSON with EXACTLY these fields and types:
{
  "intent": one of "overview" | "explainer" | "data_query" | "followup" | "personal" | "compliance_decline",
  "tickers": array of uppercase ticker symbols mentioned or strongly implied (e.g. "BTC","ETH"),
  "entities": array of named entities (people, funds, exchanges, protocols),
  "datapoints": array drawn from "price","whales","news","social","macro","portfolio",
  "persona_hint": one of "new","intermediate","advanced", or null if unclear,
  "confidence": a float in [0,1] reflecting how sure you are of the intent
}

Intent guidance:
- overview: "what's happening with X" — multi-surface recap.
- explainer: "what does X mean" / "why does X matter" — pedagogical.
- data_query: "what is the price / volume / open interest" — point lookup.
- followup: short message that obviously continues the prior turn ("and 7d?", "why?").
- personal: explicitly about the user's holdings, watchlist or alerts.
- compliance_decline: explicit request for buy/sell/will/predict advice. The downstream layer will issue a non-advice decline.

Return ONLY the JSON object. No prose, no markdown.`

/**
 * Maximum number of prior turns we ship into the router prompt. Keeps cost
 * and latency bounded; the writer model gets the longer history.
 */
const ROUTER_HISTORY_TURNS = 4

export async function routeMessage(
  input: RouterInput,
  model: ModelClient
): Promise<RouterDecision> {
  const historySnippet = input.chatHistory
    .slice(-ROUTER_HISTORY_TURNS)
    .map((t) => `${t.role.toUpperCase()}: ${t.content.slice(0, 300)}`)
    .join('\n')
  const userBlock = historySnippet
    ? `Prior turns:\n${historySnippet}\n\nCurrent user message:\n${input.message}`
    : input.message

  let raw: string
  try {
    raw = await model.routerCall(ROUTER_SYSTEM_PROMPT, userBlock)
  } catch {
    return fallback()
  }
  return parseRouterOutput(raw)
}

export function parseRouterOutput(raw: string): RouterDecision {
  const obj = safeJsonParse(raw)
  if (!obj || typeof obj !== 'object') return fallback()

  const intent = coerceIntent((obj as any).intent)
  const tickerCandidates = coerceStringArray((obj as any).tickers, 12, /^[A-Za-z0-9._-]{1,12}$/)
  const tickers: string[] = []
  for (const t of tickerCandidates) {
    const upper = t.toUpperCase()
    if (!tickers.includes(upper)) tickers.push(upper)
  }
  const entities = coerceStringArray((obj as any).entities, 80, /.+/)
  const datapoints = coerceDatapoints((obj as any).datapoints)
  const persona_hint = coercePersona((obj as any).persona_hint)
  let confidence = Number((obj as any).confidence)
  if (!Number.isFinite(confidence)) confidence = 0
  if (confidence < 0) confidence = 0
  if (confidence > 1) confidence = 1

  // §4.C: if confidence < 0.5, fall through to 'overview'.
  const finalIntent: Intent = confidence < 0.5 ? 'overview' : intent

  return {
    intent: finalIntent,
    tickers,
    entities,
    datapoints,
    persona_hint,
    confidence,
  }
}

function safeJsonParse(raw: string): unknown {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  // Strip an optional fenced code block in case the mini model ignored
  // strict JSON mode.
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  const body = fenced ? fenced[1] : trimmed
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

const VALID_INTENTS: Intent[] = [
  'overview',
  'explainer',
  'data_query',
  'followup',
  'personal',
  'compliance_decline',
]
function coerceIntent(v: unknown): Intent {
  return VALID_INTENTS.includes(v as Intent) ? (v as Intent) : 'overview'
}

const VALID_DATAPOINTS: Datapoint[] = [
  'price',
  'whales',
  'news',
  'social',
  'macro',
  'portfolio',
]
function coerceDatapoints(v: unknown): Datapoint[] {
  if (!Array.isArray(v)) return []
  const out: Datapoint[] = []
  for (const x of v) {
    if (VALID_DATAPOINTS.includes(x as Datapoint) && !out.includes(x as Datapoint)) {
      out.push(x as Datapoint)
    }
  }
  return out
}

function coercePersona(v: unknown): Persona | null {
  return v === 'new' || v === 'intermediate' || v === 'advanced' ? v : null
}

function coerceStringArray(v: unknown, maxLen: number, pattern: RegExp): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const x of v) {
    if (typeof x !== 'string') continue
    const s = x.trim()
    if (!s || s.length > maxLen) continue
    if (!pattern.test(s)) continue
    if (!out.includes(s)) out.push(s)
    if (out.length >= 20) break
  }
  return out
}

function fallback(): RouterDecision {
  return {
    intent: 'overview',
    tickers: [],
    entities: [],
    datapoints: ['price', 'whales', 'news'],
    persona_hint: null,
    confidence: 0,
  }
}
